const express = require("express");
const router = express.Router();
const patientController = require("../controllers/patientController");
const authMiddleware = require("../middleware/authMiddleware");
const {upload} = require("../middleware/imageUploader");
// Patient Registration
router.post("/signup", upload.single("image"),patientController.register);
// 
// Patient Login
router.post("/login", patientController.login);

// Logout
router.post("/logout", patientController.logout);

// Protected Routes - Require JWT authentication
router.patch("/update/:id", upload.single("image"),patientController.protected,patientController.updatePatient);

module.exports = router;
