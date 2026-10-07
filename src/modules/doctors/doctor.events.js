const { subscribe } = require("../../shared/events/eventBus");
const EVENTS = require("../../shared/events/events");
const doctorService = require("./doctor.service");

const registerEventHandlers = () => {
    // The reviews module owns ratings; we keep a copy for sorting and display.
    subscribe(EVENTS.DOCTOR_RATING_CHANGED, ({ doctorId, ratingAverage, ratingCount }) =>
        doctorService.setRating(doctorId, { ratingAverage, ratingCount })
    );
};

module.exports = { registerEventHandlers };
