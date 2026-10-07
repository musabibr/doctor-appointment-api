const AppError = require("../../shared/errors/AppError");
const { publish } = require("../../shared/events/eventBus");
const EVENTS = require("../../shared/events/events");
const { parseDateKey, toDateKey, todayKey, hasPassed, isDateKey } = require("../../shared/utils/time");
const { assertObjectId } = require("../../shared/utils/validation");
const { parsePagination, paginated } = require("../../shared/http/pagination");
const doctors = require("../doctors");
const appointmentRepository = require("./appointment.repository");
const { STATUSES, ACTIVE_STATUSES } = require("./appointment.model");

const MAX_BOOKING_ATTEMPTS = 3;

const idOf = (value) => String(value && value._id ? value._id : value);

// actor = { role: "patient" | "doctor", id }
const ownerFilter = (actor) => (actor.role === "patient" ? { patient: actor.id } : { doctor: actor.id });
const isOwner = (appointment, actor) =>
    idOf(actor.role === "patient" ? appointment.patient : appointment.doctor) === String(actor.id);

const dateKeyOf = (appointment) => toDateKey(appointment.appointmentDate);

const seatOf = (appointment) => ({
    doctorId: idOf(appointment.doctor),
    availabilityId: appointment.availability,
    slotId: appointment.slot,
});

class AppointmentService {
    async book(patientId, { doctorId, availabilityId, slotId, reasonForVisit }) {
        let reserved = null;

        // A seat is taken with an atomic compare-and-increment; if another booking
        // changed the slot in between, re-read it and try again.
        for (let attempt = 0; attempt < MAX_BOOKING_ATTEMPTS && !reserved; attempt++) {
            const bookable = await doctors.getBookableSlot({ doctorId, availabilityId, slotId });
            if (hasPassed(bookable.date, bookable.slot.end)) {
                throw AppError.badRequest("This time slot has already ended. Please choose another one.");
            }
            if (attempt === 0 && (await appointmentRepository.hasActiveBookingInSlot(patientId, slotId))) {
                throw AppError.conflict("You already have a booking in this time slot", "DUPLICATE_BOOKING");
            }
            if (bookable.slot.currentPatients >= bookable.slot.maxPatients) {
                throw AppError.conflict("This time slot is fully booked. Please choose another one.", "SLOT_FULL");
            }
            const ok = await doctors.reserveSeat({
                doctorId,
                availabilityId,
                slotId,
                maxPatients: bookable.slot.maxPatients,
            });
            if (ok) reserved = bookable;
        }
        if (!reserved) {
            throw AppError.conflict("This time slot was just taken. Please choose another one.", "SLOT_FULL");
        }

        let appointment;
        try {
            appointment = await appointmentRepository.create({
                patient: patientId,
                doctor: doctorId,
                availability: availabilityId,
                slot: slotId,
                appointmentDate: parseDateKey(reserved.date),
                appointmentHour: reserved.slot.start,
                endHour: reserved.slot.end,
                reasonForVisit,
                price: reserved.doctor.finalPrice,
            });
        } catch (error) {
            await doctors.releaseSeat({ doctorId, availabilityId, slotId });
            throw error;
        }

        await this.announce(EVENTS.APPOINTMENT_REQUESTED, appointment._id);
        return appointmentRepository.findByIdPopulated(appointment._id);
    }

    async list(actor, query) {
        const filter = ownerFilter(actor);
        const today = parseDateKey(todayKey());
        const scope = ["upcoming", "history"].includes(query.scope) ? query.scope : "all";

        if (query.status !== undefined && query.status !== "") {
            if (!STATUSES.includes(query.status)) throw AppError.validation({ status: "Unknown status" });
            filter.status = query.status;
        }
        if (query.date !== undefined && query.date !== "") {
            if (!isDateKey(query.date)) throw AppError.validation({ date: "Use the YYYY-MM-DD format" });
            filter.appointmentDate = parseDateKey(query.date);
        }
        if (scope === "upcoming") {
            filter.appointmentDate = filter.appointmentDate || { $gte: today };
            if (!filter.status) filter.status = { $in: ACTIVE_STATUSES };
        } else if (scope === "history") {
            filter.$or = [{ appointmentDate: { $lt: today } }, { status: { $nin: ACTIVE_STATUSES } }];
        }

        const sort =
            scope === "upcoming" ? { appointmentDate: 1, appointmentHour: 1 } : { appointmentDate: -1, appointmentHour: -1 };
        const pagination = parsePagination(query, { defaultLimit: 20 });
        const { items, total } = await appointmentRepository.list(filter, { sort, ...pagination });
        return paginated(items, total, pagination);
    }

    async summary(actor) {
        const base = ownerFilter(actor);
        const today = parseDateKey(todayKey());
        const [pendingRequests, upcoming, todayCount, completed] = await Promise.all([
            appointmentRepository.count({ ...base, status: "pending", appointmentDate: { $gte: today } }),
            appointmentRepository.count({ ...base, status: { $in: ACTIVE_STATUSES }, appointmentDate: { $gte: today } }),
            appointmentRepository.count({
                ...base,
                status: { $in: [...ACTIVE_STATUSES, "completed"] },
                appointmentDate: today,
            }),
            appointmentRepository.count({ ...base, status: "completed" }),
        ]);
        return { pendingRequests, upcoming, today: todayCount, completed };
    }

    async getOne(actor, appointmentId) {
        assertObjectId(appointmentId, "appointment id");
        const appointment = await appointmentRepository.findByIdPopulated(appointmentId);
        if (!appointment || !isOwner(appointment, actor)) throw AppError.notFound("Appointment not found");
        return appointment;
    }

    confirm(actor, appointmentId) {
        return this.changeStatus(actor, appointmentId, {
            from: ["pending"],
            to: "confirmed",
            event: EVENTS.APPOINTMENT_CONFIRMED,
            guard: (appointment) => {
                if (hasPassed(dateKeyOf(appointment), appointment.endHour)) {
                    throw AppError.badRequest("This appointment's time has already passed");
                }
            },
        });
    }

    decline(actor, appointmentId, reason) {
        return this.changeStatus(actor, appointmentId, {
            from: ["pending"],
            to: "declined",
            set: { declineReason: reason },
            releaseSeat: true,
            event: EVENTS.APPOINTMENT_DECLINED,
        });
    }

    cancel(actor, appointmentId, reason) {
        return this.changeStatus(actor, appointmentId, {
            from: ACTIVE_STATUSES,
            to: "canceled",
            set: { canceledBy: actor.role, cancelReason: reason },
            releaseSeat: true,
            event: EVENTS.APPOINTMENT_CANCELED,
            guard: (appointment) => {
                if (hasPassed(dateKeyOf(appointment), appointment.endHour)) {
                    throw AppError.badRequest("This appointment has already taken place");
                }
            },
        });
    }

    complete(actor, appointmentId, doctorNotes) {
        return this.changeStatus(actor, appointmentId, {
            from: ["confirmed"],
            to: "completed",
            set: { doctorNotes },
            event: EVENTS.APPOINTMENT_COMPLETED,
            guard: (appointment) => {
                if (!hasPassed(dateKeyOf(appointment), appointment.appointmentHour)) {
                    throw AppError.badRequest("You can mark the visit as completed once its time has started");
                }
            },
        });
    }

    async changeStatus(actor, appointmentId, { from, to, set = {}, releaseSeat = false, guard, event }) {
        assertObjectId(appointmentId, "appointment id");
        const current = await appointmentRepository.findById(appointmentId);
        if (!current || !isOwner(current, actor)) throw AppError.notFound("Appointment not found");
        if (!from.includes(current.status)) {
            throw AppError.conflict(`This appointment is ${current.status} and cannot be changed this way`, "INVALID_STATUS");
        }
        if (guard) guard(current);

        const updated = await appointmentRepository.transition(appointmentId, current.status, {
            $set: { status: to, ...set },
        });
        if (!updated) throw AppError.conflict("This appointment was just updated. Please refresh and try again.");

        if (releaseSeat) await doctors.releaseSeat(seatOf(current));
        await this.announce(event, appointmentId);
        return updated;
    }

    async announce(eventName, appointmentId) {
        const appointment = await appointmentRepository.findForEvent(appointmentId);
        if (appointment) await publish(eventName, { appointment });
    }

    // ----- Public API used by other modules -----

    // For the reviews module: the patient's own completed, not-yet-reviewed appointment.
    async getReviewableAppointment(patientId, appointmentId) {
        assertObjectId(appointmentId, "appointment id");
        const appointment = await appointmentRepository.findById(appointmentId);
        if (!appointment || idOf(appointment.patient) !== String(patientId)) {
            throw AppError.notFound("Appointment not found");
        }
        if (appointment.status !== "completed") {
            throw AppError.badRequest("You can leave a review once the appointment is completed");
        }
        if (appointment.review) throw AppError.conflict("You have already reviewed this appointment");
        return { _id: appointment._id, doctor: appointment.doctor, patient: appointment.patient };
    }

    setReview(appointmentId, reviewId) {
        return appointmentRepository.setReview(appointmentId, reviewId);
    }

    async listForAdmin(query) {
        const filter = {};
        if (STATUSES.includes(query.status)) filter.status = query.status;
        const pagination = parsePagination(query, { defaultLimit: 20 });
        const { items, total } = await appointmentRepository.list(filter, {
            sort: { appointmentDate: -1, appointmentHour: -1 },
            ...pagination,
        });
        return paginated(items, total, pagination);
    }

    async countByStatus() {
        const rows = await appointmentRepository.countByStatus();
        const counts = Object.fromEntries(STATUSES.map((status) => [status, 0]));
        for (const row of rows) counts[row._id] = row.count;
        counts.total = Object.values(counts).reduce((sum, n) => sum + n, 0);
        return counts;
    }

    // Used when an account is removed: active bookings are canceled by the system.
    async cancelAllActive(filter, { reason, releaseSeats }) {
        const active = await appointmentRepository.findActive(filter);
        for (const appointment of active) {
            const updated = await appointmentRepository.transition(appointment._id, appointment.status, {
                $set: { status: "canceled", canceledBy: "admin", cancelReason: reason },
            });
            if (!updated) continue;
            if (releaseSeats) await doctors.releaseSeat(seatOf(appointment));
            await this.announce(EVENTS.APPOINTMENT_CANCELED, appointment._id);
        }
    }
}

module.exports = new AppointmentService();
