const express = require("express");
const router = express.Router();
const doctorController = require("../controllers/doctorController");
const reviewController = require("../controllers/reviewController");
const appointmentController = require("../controllers/appointmentController");
const clinicController = require("../controllers/clinicController");
// Public routes
router.post("/register", doctorController.registerDoctor);//done
router.post("/login", doctorController.login);//done
router.post("/forgot-password", doctorController.forgotPassword);// no functional
router.post("/reset-password", doctorController.resetPassword);// no functional
// Doctor search
router.get("/search", doctorController.searchDoctors);//done

// Resend OTP
router.post("/resend-otp", doctorController.resendOtp);//non functional
router.post("/verify-otp", doctorController.verifyOtp);//non functional

// Protected routes (Require authentication)
router.use(doctorController.protected); // Protect all routes below this middleware

router.get("/logout", doctorController.logout);

// Doctor profile routes
router.patch("/update-profile", doctorController.updateDoctorProfile);//done
router.patch("/update-password", doctorController.updatePassword);//done
// router.get('/profile',doctorController.)

// Availability routes
router.post("/availability/add", doctorController.addAvailability);//done
router.patch("/availability/update", doctorController.updateAvailability);//done
router.delete("/availability/delete", doctorController.deleteAvailability);//done
router.get("/availability/get", doctorController.getAvailability);//done
router.delete('/availability/delete ', doctorController.deleteAvailability);//done
// manage clinic details
router.post("/clinic/add", clinicController.createClinic);
router.put("/clinic/update", clinicController.updateClinic);
router.get('/clinic/location', clinicController.getClinicsByLocation);
// router.delete("/clinic/delete", clinicController.);

// manage appointments
router.get("/appointments/get",appointmentController.getDoctorAppointments);//done
router.patch("/appointments/update-status/:appointmentId", appointmentController.updateAppointmentStatus);
router.patch("/appointments/:appointmentId/cancel", appointmentController.cancelAppointment);
router.patch("/appointments/:appointmentId/reschedule", appointmentController.rescheduleAppointment);
// manage reviews
router.post("/review", reviewController.getDoctorRating);
router.post("/reviews", reviewController.getAllReviews);
router.post("/report", reviewController.reportReview);

// Delete doctor account
// router.delete("/delete", doctorController.deleteDoctor);


module.exports = router;
