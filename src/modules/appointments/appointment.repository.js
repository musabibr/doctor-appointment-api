const Appointment = require("./appointment.model");
const { ACTIVE_STATUSES } = require("./appointment.model");

const DOCTOR_FIELDS = "name photo specialty price discount clinic";
const PATIENT_FIELDS = "name photo gender email phoneNumber";

const populateBoth = (query) =>
    query
        .populate({ path: "doctor", select: DOCTOR_FIELDS, populate: { path: "clinic", select: "name location contact" } })
        .populate("patient", PATIENT_FIELDS);

class AppointmentRepository {
    create(data) {
        return Appointment.create(data);
    }

    findById(id) {
        return Appointment.findById(id);
    }

    findByIdPopulated(id) {
        return populateBoth(Appointment.findById(id));
    }

    // Snapshot handed to other modules in domain events (includes contact emails).
    findForEvent(id) {
        return Appointment.findById(id).populate("patient", "name email").populate("doctor", "name email").lean();
    }

    hasActiveBookingInSlot(patientId, slotId) {
        return Appointment.exists({ patient: patientId, slot: slotId, status: { $in: ACTIVE_STATUSES } });
    }

    hasActiveBookingsOnDay(availabilityId) {
        return Appointment.exists({ availability: availabilityId, status: { $in: ACTIVE_STATUSES } });
    }

    // Moves the appointment from `fromStatus` to the new state, or returns null
    // if somebody else changed it first.
    transition(id, fromStatus, update) {
        return populateBoth(
            Appointment.findOneAndUpdate({ _id: id, status: fromStatus }, update, { new: true, runValidators: true })
        );
    }

    async list(filter, { sort, skip, limit }) {
        const [items, total] = await Promise.all([
            populateBoth(Appointment.find(filter).sort(sort).skip(skip).limit(limit)),
            Appointment.countDocuments(filter),
        ]);
        return { items, total };
    }

    count(filter) {
        return Appointment.countDocuments(filter);
    }

    findActive(filter) {
        return Appointment.find({ ...filter, status: { $in: ACTIVE_STATUSES } });
    }

    countByStatus() {
        return Appointment.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]);
    }

    setReview(appointmentId, reviewId) {
        return Appointment.updateOne(
            { _id: appointmentId },
            reviewId ? { $set: { review: reviewId } } : { $unset: { review: 1 } }
        );
    }
}

module.exports = new AppointmentRepository();
