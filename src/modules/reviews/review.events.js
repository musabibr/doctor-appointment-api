const { subscribe } = require("../../shared/events/eventBus");
const EVENTS = require("../../shared/events/events");
const reviewService = require("./review.service");

const registerEventHandlers = () => {
    subscribe(EVENTS.PATIENT_DELETED, ({ patientId }) => reviewService.removeAllByPatient(patientId));
    subscribe(EVENTS.DOCTOR_DELETED, ({ doctorId }) => reviewService.removeAllByDoctor(doctorId));
};

module.exports = { registerEventHandlers };
