const catchAsync = require("../../shared/http/catchAsync");
const response = require("../../shared/http/response");
const { Validator, cleanString } = require("../../shared/utils/validation");
const appointmentService = require("./appointment.service");

const actorOf = (req) => ({ role: req.role, id: String(req.user._id) });

const optionalText = (req, field, max, label) => {
    const v = new Validator();
    v.text(req.body[field], field, { label, max });
    v.throwIfInvalid();
    return cleanString(req.body[field]) || undefined;
};

const book = catchAsync(async (req, res) => {
    const { doctorId, availabilityId, slotId, reasonForVisit } = req.body;
    const v = new Validator();
    v.objectId(doctorId, "doctorId", "Doctor");
    v.objectId(availabilityId, "availabilityId", "Day");
    v.objectId(slotId, "slotId", "Time slot");
    v.text(reasonForVisit, "reasonForVisit", { label: "Reason for visit", max: 500 });
    v.throwIfInvalid();

    const appointment = await appointmentService.book(String(req.user._id), {
        doctorId,
        availabilityId,
        slotId,
        reasonForVisit: cleanString(reasonForVisit) || undefined,
    });
    response(res, 201, "success", "Appointment requested. The doctor will confirm it soon.", appointment);
});

const list = catchAsync(async (req, res) => {
    response(res, 200, "success", "Appointments", await appointmentService.list(actorOf(req), req.query));
});

const summary = catchAsync(async (req, res) => {
    response(res, 200, "success", "Appointment summary", await appointmentService.summary(actorOf(req)));
});

const getOne = catchAsync(async (req, res) => {
    response(res, 200, "success", "Appointment", await appointmentService.getOne(actorOf(req), req.params.id));
});

const confirm = catchAsync(async (req, res) => {
    const appointment = await appointmentService.confirm(actorOf(req), req.params.id);
    response(res, 200, "success", "Appointment confirmed", appointment);
});

const decline = catchAsync(async (req, res) => {
    const reason = optionalText(req, "reason", 500, "Reason");
    const appointment = await appointmentService.decline(actorOf(req), req.params.id, reason);
    response(res, 200, "success", "Appointment declined", appointment);
});

const cancel = catchAsync(async (req, res) => {
    const reason = optionalText(req, "reason", 500, "Reason");
    const appointment = await appointmentService.cancel(actorOf(req), req.params.id, reason);
    response(res, 200, "success", "Appointment canceled", appointment);
});

const complete = catchAsync(async (req, res) => {
    const notes = optionalText(req, "doctorNotes", 2000, "Notes");
    const appointment = await appointmentService.complete(actorOf(req), req.params.id, notes);
    response(res, 200, "success", "Visit marked as completed", appointment);
});

module.exports = { book, list, summary, getOne, confirm, decline, cancel, complete };
