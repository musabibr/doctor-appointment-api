// controllers/doctorController.js
const doctorService = require("../services/doctor/doctorService");

class DoctorController {
    async registerDoctor(req, res) {
        try {
            const doctor = await doctorService.registerDoctor(req.body);
            res.status(201).json(doctor);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    async verifyDoctor(req, res) {
        try {
            const doctor = await doctorService.verifyDoctorEmail(req.params.id, req.body.otp);
            res.status(200).json(doctor);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    async searchDoctors(req, res) {
        try {
            const doctors = await doctorService.searchDoctors(req.query);
            res.status(200).json(doctors);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    async updateDoctorAvailability(req, res) {
        try {
            const doctor = await doctorService.updateDoctorAvailability(req.params.id, req.body.isAvailable);
            res.status(200).json(doctor);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    async resendOtp(req, res) {
        try {
            const doctor = await doctorService.resendOtp(req.params.id);
            res.status(200).json(doctor);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
}

module.exports = new DoctorController();
