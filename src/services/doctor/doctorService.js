// services/doctorService.js
const doctorRepository = require("../../repositories/doctor/doctorRepository");
const otpService = require("./otpService"); // Placeholder for OTP handling logic

class DoctorService {
    constructor() {
        this.MAX_OTP_RETRIES = 5;
    }

    async registerDoctor(doctorData) {
        const existingDoctor = await doctorRepository.findDoctorByEmail(doctorData.email);
        if (existingDoctor) {
            throw new Error("Doctor with this email already exists.");
        }
        return doctorRepository.createDoctor(doctorData);
    }

    async verifyDoctorEmail(doctorId, otp) {
        const doctor = await doctorRepository.findDoctorById(doctorId);
        if (!doctor) throw new Error("Doctor not found.");
        
        const otpValid = await otpService.verifyOTP(doctorId, otp);
        if (!otpValid) throw new Error("Invalid OTP.");

        doctor.isVerified = true;
        await doctorRepository.updateDoctorById(doctorId, { isVerified: true });
        return doctor;
    }

    async resendOtp(doctorId) {
        const doctor = await doctorRepository.findDoctorById(doctorId);
        if (!doctor) throw new Error("Doctor not found.");
        
        if (doctor.otpRetries >= this.MAX_OTP_RETRIES) {
            throw new Error("Maximum OTP retries exceeded.");
        }
        
        await otpService.sendOTP(doctorId);
        doctor.otpRetries += 1;
        return doctorRepository.updateDoctorById(doctorId, { otpRetries: doctor.otpRetries });
    }

    async searchDoctors(filter) {
        const criteria = {};
        if (filter.specialty) criteria.specialty = filter.specialty;
        if (filter.clinic) criteria['clinic.name'] = filter.clinic;
        if (filter.isAvailable !== undefined) criteria.isAvailable = filter.isAvailable;
        if (filter.rating) criteria['ratings.average'] = { $gte: filter.rating };  // Example for rating filter

        return doctorRepository.findDoctors(criteria);
    }

    async updateDoctorAvailability(doctorId, isAvailable) {
        return doctorRepository.updateDoctorById(doctorId, { isAvailable });
    }

    async updateDoctorProfile(doctorId, profileData) {
        return doctorRepository.updateDoctorById(doctorId, profileData);
    }

    async deleteDoctor(doctorId) {
        return doctorRepository.deleteDoctorById(doctorId);
    }
}

module.exports = new DoctorService();
