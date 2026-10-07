const express = require("express");
const { protect } = require("../../shared/auth/protect");
const adminController = require("./admin.controller");

// There is deliberately no public sign-up for admins: create them with
// `npm run create-admin` (see README).
const router = express.Router();

router.use(protect("admin"));

router.get("/stats", adminController.stats);

router.get("/doctors", adminController.listDoctors);
router.get("/doctors/:id", adminController.getDoctor);
router.patch("/doctors/:id/approve", adminController.approveDoctor);
router.patch("/doctors/:id/reject", adminController.rejectDoctor);
router.delete("/doctors/:id", adminController.deleteDoctor);

router.get("/patients", adminController.listPatients);
router.delete("/patients/:id", adminController.deletePatient);

router.get("/appointments", adminController.listAppointments);

router.get("/reviews/reported", adminController.listReportedReviews);
router.patch("/reviews/:id/dismiss", adminController.dismissReviewReport);
router.delete("/reviews/:id", adminController.deleteReview);

module.exports = router;
