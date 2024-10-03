const express = require("express");
const router = express.Router();
const doctorController = require("../controllers/doctorController");

// Doctor Registration
router.post("/signup",doctorController.registerDoctor);

module.exports = router;