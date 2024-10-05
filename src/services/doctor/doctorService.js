// services/doctorService.js
const doctorRepository = require("../../repositories/doctor/doctorRepository");
const Email = require('../../util/emailService');
const hashData = require('../../util/hashData');

const MAX_RETRIES = 5;

class DoctorService {
    // Register doctor and send OTP
    async registerDoctor(doctorData) {
        const doctorExists = await doctorRepository.existsByEmail(doctorData.email);
        if (doctorExists) {
            return 'exist';
        }

        // Encrypt the password
        doctorData.password = await hashData.encryptData(doctorData.password);
        doctorData.isVerified = false;

        // Save doctor
        const doctor = await doctorRepository.create(doctorData);

        // Send OTP for verification
        const emailService = new Email(doctor, null);
        await emailService.sendOtp();

        return doctor;
    }
    
    // login doctor
    async loginDoctor(email) {
        const patient = await doctorRepository.findByEmail(email);
        if (!patient) {
            return 404;
        }
        return patient // Return token and patient info
    }
    // Resend OTP
    async resendOtp(email) {
        const doctor = await doctorRepository.findByEmail(email);
        if (!doctor) {
            throw new Error('Doctor not found');
        }

        if (doctor.isVerified) {
            throw new Error('Doctor is already verified');
        }

        // Send new OTP
        const emailService = new Email(doctor, null);
        await emailService.sendOtp();

        return 'OTP sent';
    }

    // Verify OTP and track retries
    async verifyDoctor(email, otp) {
        const otpEntry = await doctorRepository.findOtpByEmail(email);

        if (!otpEntry) {
            return { valid: false, message: 'No OTP found. Please request a new one.' };
        }

        // Check if OTP has expired
        const isExpired = Date.now() - new Date(otpEntry.createdAt).getTime() > 10 * 60 * 1000;
        if (isExpired) {
            await doctorRepository.deleteOtpByEmail(email); // Remove expired OTP
            return { valid: false, message: 'OTP has expired. Please request a new one.' };
        }

        // Check if the OTP matches
        if (otpEntry.otp !== otp) {
            // Increment retries
            const updatedOtpEntry = await doctorRepository.incrementOtpRetries(email);

            // Check if max retries have been reached
            const attemptsLeft = MAX_RETRIES - updatedOtpEntry.retries;
            if (updatedOtpEntry.retries >= MAX_RETRIES) {
                await doctorRepository.deleteOtpByEmail(email); // Remove OTP after max retries
                return { valid: false, message: 'Maximum attempts reached. OTP invalidated. Please request a new one.' };
            }

            return { valid: false, message: `Invalid OTP. You have ${attemptsLeft} attempts remaining.` };
        }

        // Successful OTP verification
        await doctorRepository.verifyDoctor(email);
        await doctorRepository.deleteOtpByEmail(email); // Remove OTP after successful verification
        return { valid: true, message: 'OTP verified successfully. Your account is now active.' };
    }
}

module.exports = new DoctorService();



