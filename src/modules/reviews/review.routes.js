const express = require("express");
const { protect } = require("../../shared/auth/protect");
const reviewController = require("./review.controller");

const router = express.Router();

router.get("/doctor/:doctorId", reviewController.listForDoctor);
router.post("/", protect("patient"), reviewController.create);
router.delete("/:id", protect("patient"), reviewController.remove);
router.post("/:id/report", protect("doctor"), reviewController.report);

module.exports = router;
