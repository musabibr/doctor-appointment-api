// routes/patientRoutes.js
const express = require("express");
const router = express.Router();
const patientController = require("../controllers/patientController");
const authMiddleware = require("../middleware/authMiddleware");

// Patient Registration
router.post("/signup", patientController.register);

// Patient Login
router.post("/login", patientController.login);

// Logout
router.post("/logout", patientController.logout);

// Protected Routes - Require JWT authentication
router.get("/:id", authMiddleware, patientController.getPatient);
router.put("/:id", authMiddleware, patientController.updatePatient);
router.delete("/:id", authMiddleware, patientController.deletePatient);

module.exports = router;
