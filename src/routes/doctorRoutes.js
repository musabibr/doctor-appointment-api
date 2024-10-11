const express = require("express");
const router = express.Router();
const doctorController = require("../controllers/doctorController");
const reviewController = require("../controllers/reviewController");
const appointmentController = require("../controllers/appointmentController");
const clinicController = require("../controllers/clinicController");
// Public routes
router.post("/register", doctorController.registerDoctor);
router.post("/login", doctorController.login);
router.post("/forgot-password", doctorController.forgotPassword);
router.post("/reset-password", doctorController.resetPassword);
// Doctor search
router.get("/search", doctorController.searchDoctors);

// Resend OTP
router.post("/resend-otp", doctorController.resendOtp);
router.post("/verify-otp", doctorController.verifyOtp);

// Protected routes (Require authentication)
router.use(doctorController.protected); // Protect all routes below this middleware

router.post("/logout", doctorController.logout);

// Doctor profile routes
router.patch("/update-profile", doctorController.updateDoctorProfile);
router.put("/update-password", doctorController.updatePassword);
// router.get('/profile',doctorController.)

// Availability routes
router.post("/availability/add", doctorController.addAvailability);
router.patch("/availability/update", doctorController.updateAvailability);
router.delete("/availability/delete", doctorController.deleteAvailability);
router.get("/availability/get", doctorController.getAvailability);
// manage clinic details
router.post("/clinic/add", clinicController.createClinic);
router.put("/clinic/update", clinicController.updateClinic);
router.get('/clinic/location', clinicController.getClinicsByLocation);
// router.delete("/clinic/delete", clinicController.);

// manage appointments
router.get("/appointments/doctor/:doctorId",appointmentController.getDoctorAppointments);
router.patch("/appointments/:appointmentId/status", appointmentController.updateAppointmentStatus);
router.patch("/appointments/:appointmentId/cancel", appointmentController.cancelAppointment);
router.patch("/appointments/:appointmentId/reschedule", appointmentController.rescheduleAppointment);
// manage reviews
router.post("/review", reviewController.getDoctorRating);
router.post("/reviews", reviewController.getAllReviews);
router.post("/report", reviewController.reportReview);

// Delete doctor account
// router.delete("/delete", doctorController.deleteDoctor);


module.exports = router;
