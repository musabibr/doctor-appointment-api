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
    async searchDoctors(queryParams) {
        const { name, specialty, date, hours, skip, limit, sortBy, sortOrder } = queryParams;
        
        // Search logic, filter based on the query parameters
        return await doctorRepository.searchDoctors({
            name,
            specialty,
            date,
            hours,
            skip,
            limit,
            sortBy,
            sortOrder
        });
    }
    // Add Availability
    async addAvailability(doctorId, availabilities) {
        const doctor = await doctorRepository.findDoctorById(doctorId);

        if (!doctor) {
            throw new Error("Doctor not found");
        }

        // const newAvailabilities = availabilities.map(availability => ({
        //     date: availability.date,
        //     hours: availability.hours.map(hour => ({
        //         start: hour.start,
        //         end: hour.end,
        //         maxPatients: availability.maxPatients,
        //         currentPatients: 0
        //     })),
        //     isAvailable: true // Initially, the slot is available
        // }));
        const newAvailabilities = {
            date: availabilities.date,
            hours: availabilities.hours.map(hour => ({
                start: hour.start,
                end: hour.end,
                maxPatients: availabilities.maxPatients,
                currentPatients: 0,
                isAvailable: true // Initially, the slot is available
            })),
        }

        doctor.availability.push(newAvailabilities);

        await doctor.save();
        return doctor;
    }

    // Update Availability
    async updateAvailability(doctorId, availabilityId, { date, hours, maxPatients }) {
        const doctor = await doctorRepository.findDoctorById(doctorId);

        const availability = doctor.availability.id(availabilityId);
        if (!availability) {
            throw new Error("Availability not found");
        }

        availability.date = date;
        availability.hours = hours.map(hour => ({
            start: hour.start,
            end: hour.end,
            maxPatients: maxPatients || 1,
            currentPatients: availability.currentPatients || 0,// Keep current patients if exists
        }));

        // Update `isAvailable` if current time is past availability
        availability.isAvailable = this.checkAvailabilityStatus(availability.hours, availability.maxPatients, availability.currentPatients);

        await doctor.save();
        return availability;
    }

    // Delete Availability
    async deleteAvailability(doctorId, availabilityId) {
        const doctor = await doctorRepository.findDoctorById(doctorId);
        doctor.availability.map(avail => {
            if (avail.id === availabilityId) {
                doctor.availability.pop(avail)
            } else {
                return 404
            }
        })
        await doctor.save();
    }

    // Get Availability
    async getAvailability(doctorId,) {
        const doctor = await doctorRepository.findDoctorById(doctorId);
        return doctor.availability ;
    }

    // Check and Update Availability Status dynamically
    async updateAvailabilityStatus(doctorId) {
        const doctor = await doctorRepository.findDoctorById(doctorId);
        const currentTime = new Date();

        doctor.availability.forEach(avail => {
            avail.hours.forEach(hour => {
                const [startHour, startMinute] = hour.start.split(':').map(Number);
                const startTime = new Date(avail.date);
                startTime.setHours(startHour, startMinute, 0);

                if (currentTime >= startTime && hour.currentPatients < hour.maxPatients) {
                    avail.isAvailable = true;
                } else if (hour.currentPatients >= hour.maxPatients) {
                    avail.isAvailable = false;
                } else if (currentTime > startTime) {
                    avail.isAvailable = false;
                }
            });
        });

        await doctor.save();
    }

    // Book a patient and check availability
    async bookPatient(doctorId, availabilityId, hourStart) {
        const doctor = await doctorRepository.findDoctorById(doctorId);

        const availability = doctor.availability.id(availabilityId);
        if (!availability) {
            throw new Error("Availability not found");
        }

        const hourSlot = availability.hours.find(hour => hour.start === hourStart);
        if (!hourSlot) {
            throw new Error("Time slot not found");
        }

        if (hourSlot.currentPatients >= hourSlot.maxPatients) {
            throw new Error("Time slot is fully booked");
        }

        hourSlot.currentPatients += 1;
        availability.isAvailable = this.checkAvailabilityStatus(availability.hours, hourSlot.maxPatients, hourSlot.currentPatients);

        await doctor.save();
        return availability;
    }

    // Helper function to check if availability is still valid
    checkAvailabilityStatus(hours, maxPatients, currentPatients) {
        const currentTime = new Date();
        return hours.some(hour => {
            const [startHour, startMinute] = hour.start.split(':').map(Number);
            const startTime = new Date();
            startTime.setHours(startHour, startMinute, 0);

            return currentTime < startTime && currentPatients < maxPatients;
        });
    }
    async getDoctorByResetToken(token) {
        return await doctorRepository.findByResetToken(token);
    }
    async getDoctorById(id) {
        return await doctorRepository.findDoctorById(id);
    }
    
    async getDoctorByEmail(email) {
        return await doctorRepository.findByEmail(email);
    }
    async updateDoctor(id, data) {
        return await doctorRepository.updateDoctorProfile(id, data);
    }

}

module.exports = new DoctorService();



