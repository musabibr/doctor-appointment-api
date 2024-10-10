/*
const express = require("express");
const router = express.Router();
const AppointmentController = require("../controllers/appointment.controller");
const roleCheck = require("../middleware/roleCheck");

Patients can book and view their appointments
router.post("/appointments", roleCheck(["patient"]), AppointmentController.bookAppointment);
router.get("/appointments/patient/:patientId", roleCheck(["patient"]), AppointmentController.getPatientUpcomingAppointments);

Doctors can view and manage appointments
router.get("/appointments/doctor/:doctorId", roleCheck(["doctor"]), AppointmentController.getDoctorAppointments);
router.patch("/appointments/:appointmentId/status", roleCheck(["doctor"]), AppointmentController.updateAppointmentStatus);

Reschedule appointments
router.patch("/appointments/:appointmentId/reschedule", roleCheck(["doctor", "patient"]), AppointmentController.rescheduleAppointment);

Notify users of upcoming appointments
router.post("/appointments/notify-upcoming", roleCheck(["admin"]), AppointmentController.notifyUpcomingAppointments);

module.exports = router;
*/