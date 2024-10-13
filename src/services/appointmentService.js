const AppointmentRepository = require("../repositories/appointmentRepository");
const NotificationService = ''//require("./notification.service");


class AppointmentService {
    async bookAppointment(appointmentData) {
        // Ensure that the doctor is available at the requested time and date
        const doctorAvailability =
        await AppointmentRepository.checkDoctorAvailability(
            appointmentData.doctor,
            appointmentData.appointmentDate,
            appointmentData.appointmentHour
        );

        if (!doctorAvailability) {
            // throw new Error("Doctor is not available at the requested time");
            return 404
        }

        // Create and save the appointment
        return (await AppointmentRepository.createAppointment(appointmentData));
    }

    async getPatientUpcomingAppointments(patientId) {
        return await AppointmentRepository.getUpcomingAppointmentsByPatient(
        patientId
        );
    }

    async getDoctorAppointments(doctorId) {
        return await AppointmentRepository.getAppointmentsByDoctor(doctorId);
    }

    async updateAppointmentStatus(appointmentId, status) {
        return await AppointmentRepository.updateAppointmentStatus(
        appointmentId,
        status
        );
    }

    async cancelAppointment(appointmentId) {
        return await AppointmentRepository.cancelAppointment(appointmentId);
    }

    async rescheduleAppointment(appointmentId, newDate, newHour) {
        const appointment = await AppointmentRepository.findAppointmentById(
        appointmentId
        );
        const doctorId = appointment.doctor;

        // Ensure doctor availability
        const isAvailable = await AppointmentRepository.checkDoctorAvailability(
        doctorId,
        newDate,
        newHour
        );

        if (!isAvailable) {
        throw new Error("Doctor is not available at the requested time");
        }

        // Reschedule appointment
        return await AppointmentRepository.rescheduleAppointment(
        appointmentId,
        newDate,
        newHour
        );
    }
    async getAppointmentById(id) {
        return await AppointmentRepository.findAppointmentById(id);
    }
    async sendUpcomingAppointmentNotifications() {
        const appointments =
        await AppointmentRepository.getUpcomingAppointmentsWithin24Hours();

        const notifications = appointments.map(async (app) => {
        await NotificationService.notifyAppointmentStatus(app, "upcoming");
        return `Notification sent to Patient ${app.patient} and Doctor ${app.doctor} for appointment on ${app.appointmentDate}`;
        });

        return Promise.all(notifications);
    }
}

module.exports = new AppointmentService();

