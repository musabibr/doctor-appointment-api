const { subscribe } = require("../../shared/events/eventBus");
const EVENTS = require("../../shared/events/events");
const appointmentService = require("./appointment.service");

const registerEventHandlers = () => {
    subscribe(EVENTS.PATIENT_DELETED, ({ patientId }) =>
        appointmentService.cancelAllActive(
            { patient: patientId },
            { reason: "The patient's account was removed", releaseSeats: true }
        )
    );

    // The doctor's availability is gone with the account, so there are no seats to give back.
    subscribe(EVENTS.DOCTOR_DELETED, ({ doctorId }) =>
        appointmentService.cancelAllActive(
            { doctor: doctorId },
            { reason: "The doctor is no longer available on the platform", releaseSeats: false }
        )
    );
};

module.exports = { registerEventHandlers };
