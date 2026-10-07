const express = require("express");
const { protect } = require("../../shared/auth/protect");
const { requireApprovedDoctor } = require("../doctors");
const appointmentController = require("./appointment.controller");

const router = express.Router();

const approvedIfDoctor = (req, res, next) =>
    req.role === "doctor" ? requireApprovedDoctor(req, res, next) : next();

router.post("/", protect("patient"), appointmentController.book);
router.get("/", protect("patient", "doctor"), appointmentController.list);
router.get("/summary", protect("patient", "doctor"), appointmentController.summary);
router.get("/:id", protect("patient", "doctor"), appointmentController.getOne);

router.patch("/:id/confirm", protect("doctor"), requireApprovedDoctor, appointmentController.confirm);
router.patch("/:id/decline", protect("doctor"), requireApprovedDoctor, appointmentController.decline);
router.patch("/:id/complete", protect("doctor"), requireApprovedDoctor, appointmentController.complete);
router.patch("/:id/cancel", protect("patient", "doctor"), approvedIfDoctor, appointmentController.cancel);

module.exports = router;
