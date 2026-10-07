// Appointments module: booking and the appointment lifecycle
// (pending -> confirmed -> completed, or declined / canceled).
const router = require("./appointment.routes");
const appointmentService = require("./appointment.service");
const { registerEventHandlers } = require("./appointment.events");

module.exports = {
    name: "appointments",
    routes: [{ path: "/api/v1/appointments", router }],
    registerEventHandlers,

    // Public API
    getReviewableAppointment: (patientId, appointmentId) =>
        appointmentService.getReviewableAppointment(patientId, appointmentId),
    setAppointmentReview: (appointmentId, reviewId) => appointmentService.setReview(appointmentId, reviewId),
    listAppointmentsForAdmin: (query) => appointmentService.listForAdmin(query),
    countAppointmentsByStatus: () => appointmentService.countByStatus(),
};
