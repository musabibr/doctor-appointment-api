const express = require("express");
const router = express.Router();
const patientController = require("../controllers/patientController");
const appointmentController = require("../controllers/appointmentController");
const reviewController = require("../controllers/reviewController");
// Patient Registration
router.post("/signup",patientController.register);
// 
// Patient Login
router.post("/login", patientController.login);

// Logout
router.get("/logout", patientController.logout);
router.post("/forgot-password", patientController.forgotPassword);
router.post("/reset-password/:token", patientController.resetPassword);

// Protected Routes
router.get("/profile", patientController.protected, patientController.getPatient);

// appointment routes
router.post("/book-appointment", patientController.protected, appointmentController.bookAppointment);
router.get("/appointments/patient/:id", patientController.protected, appointmentController.getPatientUpcomingAppointments);
router.patch("/appointments/:appointmentId/reschedule", patientController.protected, appointmentController.rescheduleAppointment);
// review
router.post("/review", patientController.protected, reviewController.createReview);

router.patch("/update-profile", patientController.protected, patientController.updatePatient);
router.patch("/update-password", patientController.protected, patientController.updatePassword);

// router.delete("/delete/:id", patientController.protected, patientController.deletePatient);


module.exports = router;
