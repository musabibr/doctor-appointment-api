const env = require("../../shared/config/env");
const { sendNotification, sendWelcome } = require("../../shared/email/email");
const { toDateKey } = require("../../shared/utils/time");

const when = (appointment) => `${toDateKey(appointment.appointmentDate)} at ${appointment.appointmentHour}`;
const doctorName = (appointment) => (appointment.doctor ? `Dr. ${appointment.doctor.name}` : "your doctor");
const patientName = (appointment) => (appointment.patient ? appointment.patient.name : "A patient");
const withReason = (reason) => (reason ? [`Reason: ${reason}`] : []);

// Every method resolves even if the email cannot be sent (errors are logged).
class NotificationService {
    welcomePatient({ patient }) {
        return sendWelcome(patient, `${env.CLIENT_URL}/doctors`);
    }

    doctorApproved({ doctor }) {
        return sendNotification(doctor, {
            subject: "Your doctor account has been approved",
            lines: [
                "Good news! Your account has been reviewed and approved.",
                "Add your clinic details and availability so patients can start booking with you.",
            ],
            actionUrl: `${env.CLIENT_URL}/doctor`,
            actionLabel: "Open your dashboard",
        });
    }

    doctorRejected({ doctor, reason }) {
        return sendNotification(doctor, {
            subject: "Your doctor account application",
            lines: ["Unfortunately we could not approve your account.", ...withReason(reason)],
        });
    }

    appointmentRequested({ appointment }) {
        if (!appointment.doctor) return null;
        return sendNotification(appointment.doctor, {
            subject: "New appointment request",
            lines: [`${patientName(appointment)} requested an appointment on ${when(appointment)}.`],
            actionUrl: `${env.CLIENT_URL}/doctor/appointments`,
            actionLabel: "Review the request",
        });
    }

    appointmentConfirmed({ appointment }) {
        if (!appointment.patient) return null;
        return sendNotification(appointment.patient, {
            subject: "Your appointment is confirmed",
            lines: [`${doctorName(appointment)} confirmed your appointment on ${when(appointment)}.`],
            actionUrl: `${env.CLIENT_URL}/appointments`,
            actionLabel: "View appointment",
        });
    }

    appointmentDeclined({ appointment }) {
        if (!appointment.patient) return null;
        return sendNotification(appointment.patient, {
            subject: "Your appointment request was declined",
            lines: [
                `${doctorName(appointment)} could not accept your appointment on ${when(appointment)}.`,
                ...withReason(appointment.declineReason),
                "You can book another time slot at any time.",
            ],
            actionUrl: `${env.CLIENT_URL}/doctors`,
            actionLabel: "Find another time",
        });
    }

    appointmentCanceled({ appointment }) {
        const lines = [`The appointment on ${when(appointment)} has been canceled.`, ...withReason(appointment.cancelReason)];
        // Tell the party that did not cancel it (both, when the system canceled it).
        const recipients = [];
        if (appointment.canceledBy !== "patient" && appointment.patient) recipients.push(appointment.patient);
        if (appointment.canceledBy !== "doctor" && appointment.doctor) recipients.push(appointment.doctor);
        return Promise.all(
            recipients.map((recipient) => sendNotification(recipient, { subject: "Appointment canceled", lines }))
        );
    }

    appointmentCompleted({ appointment }) {
        if (!appointment.patient) return null;
        return sendNotification(appointment.patient, {
            subject: "How was your visit?",
            lines: [
                `Your visit with ${doctorName(appointment)} on ${when(appointment)} is complete.`,
                "Your review helps other patients choose the right doctor.",
            ],
            actionUrl: `${env.CLIENT_URL}/appointments`,
            actionLabel: "Leave a review",
        });
    }
}

module.exports = new NotificationService();
