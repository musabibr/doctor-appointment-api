// Catalogue of the domain events modules publish to each other.
// Payloads are plain objects; the shape of each one is documented below.

module.exports = Object.freeze({
    // { patient: { _id, name, email } }
    PATIENT_REGISTERED: "patient.registered",
    // { patientId }
    PATIENT_DELETED: "patient.deleted",

    // { doctor: { _id, name, email } }
    DOCTOR_APPROVED: "doctor.approved",
    // { doctor: { _id, name, email }, reason }
    DOCTOR_REJECTED: "doctor.rejected",
    // { doctorId }
    DOCTOR_DELETED: "doctor.deleted",

    // { appointment } - populated with patient and doctor (name, email)
    APPOINTMENT_REQUESTED: "appointment.requested",
    APPOINTMENT_CONFIRMED: "appointment.confirmed",
    APPOINTMENT_DECLINED: "appointment.declined",
    APPOINTMENT_CANCELED: "appointment.canceled",
    APPOINTMENT_COMPLETED: "appointment.completed",

    // { doctorId, ratingAverage, ratingCount }
    DOCTOR_RATING_CHANGED: "review.doctor-rating-changed",
});
