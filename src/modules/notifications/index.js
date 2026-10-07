// Notifications module: turns domain events into emails. It only listens to
// events and never calls other modules.
const env = require("../../shared/config/env");
const logger = require("../../shared/utils/logger");
const { subscribe } = require("../../shared/events/eventBus");
const EVENTS = require("../../shared/events/events");
const notificationService = require("./notification.service");

const HANDLERS = {
    [EVENTS.PATIENT_REGISTERED]: "welcomePatient",
    [EVENTS.DOCTOR_APPROVED]: "doctorApproved",
    [EVENTS.DOCTOR_REJECTED]: "doctorRejected",
    [EVENTS.APPOINTMENT_REQUESTED]: "appointmentRequested",
    [EVENTS.APPOINTMENT_CONFIRMED]: "appointmentConfirmed",
    [EVENTS.APPOINTMENT_DECLINED]: "appointmentDeclined",
    [EVENTS.APPOINTMENT_CANCELED]: "appointmentCanceled",
    [EVENTS.APPOINTMENT_COMPLETED]: "appointmentCompleted",
};

const registerEventHandlers = () => {
    for (const [eventName, method] of Object.entries(HANDLERS)) {
        subscribe(eventName, (payload) => {
            // A notification problem must never fail the action that triggered it.
            const sending = Promise.resolve()
                .then(() => notificationService[method](payload))
                .catch((error) => logger.error(`Notification for "${eventName}" failed: ${error.stack || error}`));
            // Do not make the API response wait for the email provider
            // (tests wait so they can inspect the outbox).
            return env.isTest ? sending : undefined;
        });
    }
};

module.exports = {
    name: "notifications",
    routes: [],
    registerEventHandlers,
};
