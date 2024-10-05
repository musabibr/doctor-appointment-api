// repositories/doctorRepository.js
const Doctor = require("../../models/doctor/doctorModel");
const OtpModel = require('../../models/otpModel');

class DoctorRepository {
    // Find doctor by email
    async findByEmail(email) {
        return await Doctor.findOne({ email });
    }

    // Save a new doctor to the database
    async create(doctorData) {
        return await Doctor.create(doctorData);
    }

    // Update doctor's verification status
    async verifyDoctor(email) {
        return await Doctor.findOneAndUpdate({ email }, { isVerified: true }, { new: true });
    }

    // Check if a doctor exists by email
    async existsByEmail(email) {
        return await Doctor.exists({ email });
    }

    // Find OTP entry by email
    async findOtpByEmail(email) {
        return await OtpModel.findOne({ email }).sort({ createdAt: -1 }); // Fetch latest OTP
    }

    // Update OTP retries
    async incrementOtpRetries(email) {
        return await OtpModel.findOneAndUpdate(
            { email },
            { $inc: { retries: 1 } },
            { new: true }
        );
    }

    // Delete OTP by email
    async deleteOtpByEmail(email) {
        return await OtpModel.deleteMany({ email });
    }
}

module.exports = new DoctorRepository();

