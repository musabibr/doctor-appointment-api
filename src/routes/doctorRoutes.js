const express = require("express");
const router = express.Router();
const doctorController = require("../controllers/doctorController");
const JWTUtil = require("../middleware/jwt");

// Public routes
router.post("/register", doctorController.registerDoctor);
router.post("/login", doctorController.login);
router.post("/forgot-password", doctorController.forgotPassword);
router.post("/reset-password", doctorController.resetPassword);

// Protected routes (Require authentication)
router.use(doctorController.protected); // Protect all routes below this middleware

router.post("/logout", doctorController.logout);
router.post("/resend-otp", doctorController.resendOtp);
router.post("/verify-otp", doctorController.verifyOtp);

// Doctor profile routes
router.put("/profile", doctorController.updateDoctorProfile);
router.put("/update-password", doctorController.updatePassword);

// Availability routes
router.post("/availability/add", doctorController.addAvailability);
router.put("/availability/update", doctorController.updateAvailability);
router.delete("/availability/delete", doctorController.deleteAvailability);
router.get("/availability/:doctorId", doctorController.getAvailability);

// Doctor search
router.get("/search", doctorController.searchDoctors);

// Delete doctor account
router.delete("/delete", doctorController.deleteDoctor);

module.exports = router;
