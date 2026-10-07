const catchAsync = require("../../shared/http/catchAsync");
const response = require("../../shared/http/response");
const { Validator, assertObjectId } = require("../../shared/utils/validation");
const patients = require("../patients");
const doctors = require("../doctors");
const appointments = require("../appointments");
const reviews = require("../reviews");
const adminService = require("./admin.service");

const stats = catchAsync(async (req, res) => {
    response(res, 200, "success", "Platform statistics", await adminService.stats());
});

// ----- Doctors -----

const listDoctors = catchAsync(async (req, res) => {
    response(res, 200, "success", "Doctors", await doctors.listDoctorsForAdmin(req.query));
});

const getDoctor = catchAsync(async (req, res) => {
    response(res, 200, "success", "Doctor", await doctors.getDoctorForAdmin(req.params.id));
});

const approveDoctor = catchAsync(async (req, res) => {
    response(res, 200, "success", "Doctor approved", await doctors.approveDoctor(req.params.id));
});

const rejectDoctor = catchAsync(async (req, res) => {
    const v = new Validator();
    v.text(req.body.reason, "reason", { label: "Reason", min: 5, max: 500, required: true });
    v.throwIfInvalid();
    response(res, 200, "success", "Doctor rejected", await doctors.rejectDoctor(req.params.id, req.body.reason.trim()));
});

const deleteDoctor = catchAsync(async (req, res) => {
    await doctors.deleteDoctor(req.params.id);
    response(res, 200, "success", "Doctor deleted and their upcoming appointments canceled");
});

// ----- Patients -----

const listPatients = catchAsync(async (req, res) => {
    response(res, 200, "success", "Patients", await patients.listPatients(req.query));
});

const deletePatient = catchAsync(async (req, res) => {
    assertObjectId(req.params.id, "patient id");
    await patients.deletePatient(req.params.id);
    response(res, 200, "success", "Patient deleted and their upcoming appointments canceled");
});

// ----- Appointments -----

const listAppointments = catchAsync(async (req, res) => {
    response(res, 200, "success", "Appointments", await appointments.listAppointmentsForAdmin(req.query));
});

// ----- Reviews -----

const listReportedReviews = catchAsync(async (req, res) => {
    response(res, 200, "success", "Reported reviews", await reviews.listReportedReviews(req.query));
});

const dismissReviewReport = catchAsync(async (req, res) => {
    response(res, 200, "success", "Report dismissed", await reviews.dismissReviewReport(req.params.id));
});

const deleteReview = catchAsync(async (req, res) => {
    await reviews.deleteReviewAsAdmin(String(req.user._id), req.params.id);
    response(res, 200, "success", "Review deleted");
});

module.exports = {
    stats,
    listDoctors,
    getDoctor,
    approveDoctor,
    rejectDoctor,
    deleteDoctor,
    listPatients,
    deletePatient,
    listAppointments,
    listReportedReviews,
    dismissReviewReport,
    deleteReview,
};
