const AppError = require("../../shared/errors/AppError");
const { isDateKey, isTime, parseDateKey, toDateKey, todayKey, hasPassed } = require("../../shared/utils/time");
const { assertObjectId, isObjectId } = require("../../shared/utils/validation");
const doctorRepository = require("./doctor.repository");
const { serializeAvailability, serializeDay, finalPriceOf } = require("./doctor.serializers");

const MAX_SLOTS_PER_DAY = 12;
const MAX_PATIENTS_PER_SLOT = 50;

const validateDate = (date) => {
    if (!isDateKey(date)) throw AppError.validation({ date: "Choose a valid date (YYYY-MM-DD)" });
    if (date < todayKey()) throw AppError.validation({ date: "The date cannot be in the past" });
};

// Checks shape, times, capacity and overlaps. `isNewOrChanged(slot)` decides
// whether a slot must still be in the future when the day is today.
const validateSlots = (slots, date, isNewOrChanged = () => true) => {
    if (!Array.isArray(slots) || slots.length === 0) {
        throw AppError.validation({ slots: "Add at least one time slot" });
    }
    if (slots.length > MAX_SLOTS_PER_DAY) {
        throw AppError.validation({ slots: `A day can have at most ${MAX_SLOTS_PER_DAY} slots` });
    }

    const errors = {};
    const normalized = slots.map((slot, index) => {
        const field = `slots.${index}`;
        const start = slot && slot.start;
        const end = slot && slot.end;
        const maxPatients = Number(slot && slot.maxPatients);
        if (!isTime(start) || !isTime(end)) errors[field] = "Use the HH:MM format for start and end";
        else if (start >= end) errors[field] = "The end time must be after the start time";
        else if (!Number.isInteger(maxPatients) || maxPatients < 1 || maxPatients > MAX_PATIENTS_PER_SLOT) {
            errors[field] = `Patients per slot must be a whole number between 1 and ${MAX_PATIENTS_PER_SLOT}`;
        } else if (isNewOrChanged(slot) && hasPassed(date, end)) {
            errors[field] = "This time slot has already passed today";
        }
        return { _id: slot && slot._id, start, end, maxPatients, index };
    });
    if (Object.keys(errors).length) throw AppError.validation(errors);

    const sorted = [...normalized].sort((a, b) => a.start.localeCompare(b.start));
    for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].start < sorted[i - 1].end) {
            throw AppError.validation({
                [`slots.${sorted[i].index}`]: `Overlaps with ${sorted[i - 1].start}-${sorted[i - 1].end}`,
            });
        }
    }
    return sorted;
};

const findDay = (doctor, availabilityId) => {
    assertObjectId(availabilityId, "availability id");
    const day = doctor.availability.id(availabilityId);
    if (!day) throw AppError.notFound("This day was not found in your availability");
    return day;
};

class AvailabilityService {
    async list(doctorId) {
        const doctor = await doctorRepository.findById(doctorId);
        return serializeAvailability(doctor ? doctor.availability : []);
    }

    async add(doctorId, { date, slots }) {
        validateDate(date);
        const sorted = validateSlots(slots, date);
        const day = {
            date: parseDateKey(date),
            hours: sorted.map(({ start, end, maxPatients }) => ({ start, end, maxPatients, currentPatients: 0 })),
        };
        const result = await doctorRepository.addAvailabilityDay(doctorId, day);
        if (result.modifiedCount === 0) {
            throw AppError.conflict("You already have availability on this date. Edit that day instead.");
        }
        return this.list(doctorId);
    }

    async update(doctorId, availabilityId, { date, slots }) {
        const doctor = await doctorRepository.findById(doctorId);
        const day = findDay(doctor, availabilityId);
        const currentDate = toDateKey(day.date);
        if (currentDate < todayKey()) throw AppError.badRequest("Past days cannot be changed");

        const nextDate = date === undefined ? currentDate : date;
        validateDate(nextDate);

        const existing = new Map(day.hours.map((slot) => [String(slot._id), slot]));
        const hasBookings = day.hours.some((slot) => slot.currentPatients > 0);

        if (nextDate !== currentDate) {
            if (hasBookings) throw AppError.conflict("This day already has bookings, so its date cannot change");
            const taken = doctor.availability.some(
                (other) => String(other._id) !== String(day._id) && toDateKey(other.date) === nextDate
            );
            if (taken) throw AppError.conflict("You already have availability on that date");
        }

        for (const slot of Array.isArray(slots) ? slots : []) {
            if (slot && slot._id !== undefined && !(isObjectId(slot._id) && existing.has(slot._id))) {
                throw AppError.badRequest("One of the slots does not belong to this day");
            }
        }

        const isNewOrChanged = (slot) => {
            const before = slot._id && existing.get(slot._id);
            return !before || before.start !== slot.start || before.end !== slot.end;
        };
        const sorted = validateSlots(slots, nextDate, isNewOrChanged);

        const keptIds = new Set(sorted.filter((s) => s._id).map((s) => s._id));
        for (const [id, slot] of existing) {
            if (!keptIds.has(id) && slot.currentPatients > 0) {
                throw AppError.conflict(`The ${slot.start}-${slot.end} slot has bookings and cannot be removed`);
            }
        }

        day.hours = sorted.map((slot) => {
            const before = slot._id && existing.get(slot._id);
            if (!before) return { start: slot.start, end: slot.end, maxPatients: slot.maxPatients, currentPatients: 0 };
            if (before.currentPatients > 0 && (before.start !== slot.start || before.end !== slot.end)) {
                throw AppError.conflict(`The ${before.start}-${before.end} slot has bookings, so its time cannot change`);
            }
            if (slot.maxPatients < before.currentPatients) {
                throw AppError.conflict(
                    `The ${before.start}-${before.end} slot already has ${before.currentPatients} bookings`
                );
            }
            return {
                _id: before._id,
                start: slot.start,
                end: slot.end,
                maxPatients: slot.maxPatients,
                currentPatients: before.currentPatients,
            };
        });
        if (nextDate !== currentDate) {
            day.date = parseDateKey(nextDate);
            doctor.availability.sort((a, b) => a.date - b.date);
        }

        // optimisticConcurrency: fails with a 409 if a booking landed meanwhile.
        await doctor.save();
        return serializeDay(day);
    }

    async remove(doctorId, availabilityId) {
        const doctor = await doctorRepository.findById(doctorId);
        const day = findDay(doctor, availabilityId);
        const isUpcoming = toDateKey(day.date) >= todayKey();
        if (isUpcoming && day.hours.some((slot) => slot.currentPatients > 0)) {
            throw AppError.conflict("This day has bookings. Decline or cancel them before removing the day.");
        }
        await doctorRepository.removeAvailabilityDay(doctorId, availabilityId);
    }

    // ----- Public API used by the appointments module -----

    // Returns what a booking needs to know about a slot, or throws 404.
    async getBookableSlot({ doctorId, availabilityId, slotId }) {
        const doctor = await doctorRepository.findPublicById(doctorId);
        if (!doctor) throw AppError.notFound("Doctor not found");
        const day = (doctor.availability || []).find((d) => String(d._id) === String(availabilityId));
        if (!day) throw AppError.notFound("This day is no longer available");
        const slot = (day.hours || []).find((s) => String(s._id) === String(slotId));
        if (!slot) throw AppError.notFound("This time slot no longer exists");
        return {
            doctor: { _id: doctor._id, name: doctor.name, finalPrice: finalPriceOf(doctor) },
            date: toDateKey(day.date),
            slot: {
                _id: slot._id,
                start: slot.start,
                end: slot.end,
                maxPatients: slot.maxPatients,
                currentPatients: slot.currentPatients,
            },
        };
    }

    reserveSeat(args) {
        return doctorRepository.reserveSeat(args);
    }

    releaseSeat(args) {
        return doctorRepository.releaseSeat(args);
    }
}

module.exports = new AvailabilityService();
