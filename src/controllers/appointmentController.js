const mongoose = require("mongoose");
const NotificationService =''// require("../services/notification.service");
const AppointmentService = require("../services/appointmentService");
const response = require("../middleware/response");



class AppointmentController {
    // Book an appointment
    async bookAppointment(req, res) {
        const {
        patient,
        doctor,
        appointmentDate,
        appointmentHour,
        reasonForVisit,
        } = req.body;

        // Validate Doctor and Patient IDs
        if (!mongoose.Types.ObjectId.isValid(patient)) {
        return response(res, 400, "error", "Invalid patient ID");
        }
        if (!mongoose.Types.ObjectId.isValid(doctor)) {
        return response(res, 400, "error", "Invalid doctor ID");
        }

        try {
        const newAppointment = await AppointmentService.bookAppointment({
            patient,
            doctor,
            appointmentDate,
            appointmentHour,
            reasonForVisit,
        });
        await NotificationService.notifyAppointmentStatus(
            newAppointment,
            "booked"
        );
        return response(
            res,
            201,
            "success",
            "Appointment booked successfully",
            newAppointment
        );
        } catch (error) {
        return response(res, 500, "error", "Internal Server Error");
        }
    }

    // Patient view upcoming appointments
    async getPatientUpcomingAppointments(req, res) {
        const { patientId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(patientId)) {
        return response(res, 400, "error", "Invalid patient ID");
        }

        try {
        const appointments =
            await AppointmentService.getPatientUpcomingAppointments(patientId);
        return response(
            res,
            200,
            "success",
            "Upcoming appointments retrieved",
            appointments
        );
        } catch (error) {
        return response(res, 500, "error", "Internal Server Error");
        }
    }

    // Doctor view all appointments
    async getDoctorAppointments(req, res) {
        const { doctorId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(doctorId)) {
        return response(res, 400, "error", "Invalid doctor ID");
        }

        try {
        const appointments = await AppointmentService.getDoctorAppointments(
            doctorId
        );
        return response(
            res,
            200,
            "success",
            "Doctor appointments retrieved",
            appointments
        );
        } catch (error) {
        return response(res, 500, "error", "Internal Server Error");
        }
    }

    // Doctor accept or decline appointment
    async updateAppointmentStatus(req, res) {
        const { appointmentId } = req.params;
        const { status } = req.body;

        if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
        return response(res, 400, "error", "Invalid appointment ID");
        }

        if (!["confirmed", "declined"].includes(status)) {
        return response(res, 400, "error", "Invalid status");
        }

        try {
        const updatedAppointment =
            await AppointmentService.updateAppointmentStatus(appointmentId, status);
        await NotificationService.notifyAppointmentStatus(
            updatedAppointment,
            status
        );
        return response(
            res,
            200,
            "success",
            "Appointment status updated",
            updatedAppointment
        );
        } catch (error) {
        return response(res, 500, "error", "Internal Server Error");
        }
    }

    // Patient or Doctor cancel appointment
    async cancelAppointment(req, res) {
        const { appointmentId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
        return response(res, 400, "error", "Invalid appointment ID");
        }

        try {
        const canceledAppointment = await AppointmentService.cancelAppointment(
            appointmentId
        );
        await NotificationService.notifyAppointmentStatus(
            canceledAppointment,
            "canceled"
        );
        return response(
            res,
            200,
            "success",
            "Appointment canceled",
            canceledAppointment
        );
        } catch (error) {
        return response(res, 500, "error", "Internal Server Error");
        }
    }

    // Reschedule an appointment
    async rescheduleAppointment(req, res) {
        const { appointmentId } = req.params;
        const { newDate, newHour } = req.body;

        if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
        return response(res, 400, "error", "Invalid appointment ID");
        }

        try {
        const rescheduledAppointment =
            await AppointmentService.rescheduleAppointment(
            appointmentId,
            newDate,
            newHour
            );
        await NotificationService.notifyAppointmentStatus(
            rescheduledAppointment,
            "rescheduled"
        );
        return response(
            res,
            200,
            "success",
            "Appointment rescheduled successfully",
            rescheduledAppointment
        );
        } catch (error) {
        return response(res, 500, "error", "Internal Server Error");
        }
    }

    // Notify patients and doctors about upcoming appointments
    async notifyUpcomingAppointments(req, res) {
        try {
        const notifications =
            await AppointmentService.sendUpcomingAppointmentNotifications();
        return response(
            res,
            200,
            "success",
            "Notifications sent successfully",
            notifications
        );
        } catch (error) {
        return response(res, 500, "error", "Internal Server Error");
        }
    }
}

module.exports = new AppointmentController();
