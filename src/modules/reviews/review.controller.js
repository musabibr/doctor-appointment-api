const catchAsync = require("../../shared/http/catchAsync");
const response = require("../../shared/http/response");
const { Validator, cleanString } = require("../../shared/utils/validation");
const reviewService = require("./review.service");

const create = catchAsync(async (req, res) => {
    const { appointmentId, rating, comment } = req.body;
    const v = new Validator();
    v.objectId(appointmentId, "appointmentId", "Appointment");
    v.number(rating, "rating", { label: "Rating", min: 1, max: 5, integer: true, required: true });
    v.text(comment, "comment", { label: "Comment", max: 1000 });
    v.throwIfInvalid();

    const review = await reviewService.create(String(req.user._id), {
        appointmentId,
        rating: Number(rating),
        comment: cleanString(comment) || "",
    });
    response(res, 201, "success", "Thank you for your review", review);
});

const listForDoctor = catchAsync(async (req, res) => {
    response(res, 200, "success", "Reviews", await reviewService.listForDoctor(req.params.doctorId, req.query));
});

const remove = catchAsync(async (req, res) => {
    await reviewService.remove({ role: req.role, id: String(req.user._id) }, req.params.id);
    response(res, 200, "success", "Review deleted");
});

const report = catchAsync(async (req, res) => {
    const v = new Validator();
    v.text(req.body.reason, "reason", { label: "Reason", min: 5, max: 500, required: true });
    v.throwIfInvalid();
    const review = await reviewService.report(req.user._id, req.params.id, req.body.reason.trim());
    response(res, 200, "success", "Review reported. An admin will look at it.", review);
});

module.exports = { create, listForDoctor, remove, report };
