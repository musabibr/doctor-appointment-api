const express = require("express");
const { protect } = require("../../shared/auth/protect");
const { sensitiveLimiter } = require("../../shared/http/rateLimiters");
const { singlePhoto, doctorDocuments } = require("../../shared/http/upload");
const { requireApprovedDoctor } = require("./doctor.middleware");
const doctorController = require("./doctor.controller");

// /api/v1/doctors
const doctorsRouter = express.Router();

doctorsRouter.post("/register", sensitiveLimiter, ...doctorDocuments, doctorController.register);
doctorsRouter.get("/", doctorController.search);
doctorsRouter.get("/specialties", doctorController.specialties);

// The signed-in doctor's own account. Declared before "/:id".
doctorsRouter.use("/me", protect("doctor"));
doctorsRouter.get("/me", doctorController.getMe);
doctorsRouter.patch("/me", doctorController.updateMe);
doctorsRouter.put("/me/photo", ...singlePhoto, doctorController.updatePhoto);
doctorsRouter.put("/me/clinic", doctorController.saveClinic);
doctorsRouter.get("/me/availability", doctorController.listAvailability);
doctorsRouter.post("/me/availability", requireApprovedDoctor, doctorController.addAvailability);
doctorsRouter.patch("/me/availability/:availabilityId", requireApprovedDoctor, doctorController.updateAvailability);
doctorsRouter.delete("/me/availability/:availabilityId", requireApprovedDoctor, doctorController.deleteAvailability);

doctorsRouter.get("/:id", doctorController.getPublicProfile);

// /api/v1/clinics
const clinicsRouter = express.Router();
clinicsRouter.get("/", doctorController.searchClinics);

module.exports = { doctorsRouter, clinicsRouter };
