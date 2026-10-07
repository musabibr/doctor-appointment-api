const express = require("express");
const { protect } = require("../../shared/auth/protect");
const { sensitiveLimiter } = require("../../shared/http/rateLimiters");
const { singlePhoto } = require("../../shared/http/upload");
const patientController = require("./patient.controller");

const router = express.Router();

router.post("/register", sensitiveLimiter, patientController.register);

router.use("/me", protect("patient"));
router.get("/me", patientController.getMe);
router.patch("/me", patientController.updateMe);
router.put("/me/photo", ...singlePhoto, patientController.updatePhoto);

module.exports = router;
