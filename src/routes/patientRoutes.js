const express = require("express");
const router = express.Router();
const patientController = require("../controllers/patientController");
const appointmentController = require("../controllers/appointmentController");
const reviewController = require("../controllers/reviewController");
// Patient Registration
router.post("/signup",patientController.register); //doce
// 
// Patient Login
router.post("/login", patientController.login);//done

// Logout
router.get("/logout", patientController.logout);//done
router.post("/forgot-password", patientController.forgotPassword);
router.post("/reset-password/:token", patientController.resetPassword);

// Protected Routes
router.get("/profile", patientController.protected, patientController.getPatient);//done

// appointment routes
router.post("/book-appointment", patientController.protected, appointmentController.bookAppointment);//done
router.get("/appointments/get", patientController.protected, appointmentController.getPatientUpcomingAppointments);//done
router.get("/appointments/cancel/:appointmentId", patientController.protected, appointmentController.cancelAppointment);//
// review
router.post("/review-doctor", patientController.protected, reviewController.createReview);//done

router.patch("/update-profile", patientController.protected, patientController.updatePatient);//done
router.patch("/update-password", patientController.protected, patientController.updatePassword);//done

// router.delete("/delete/:id", patientController.protected, patientController.deletePatient);


module.exports = router;
