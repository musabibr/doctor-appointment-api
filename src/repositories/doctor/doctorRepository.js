// repositories/doctorRepository.js
const Doctor = require("../../models/doctor/doctorModel");
const OtpModel = require('../../models/otpModel');

class DoctorRepository {
    // Find doctor by email
    async findByEmail(email) {
        return await Doctor.findOne({ email });
    }
    
    // Find doctor by id
    async findDoctorById(id) {
        return await Doctor.findById(id);
    }
    
    // Find doctor by query
    async findDoctor(query) {
        return await Doctor.find(query);
    }
    // Search for doctors with filtering, sorting, pagination
    async searchDoctors({ name, specialty, date, hours, skip, limit, sortBy, sortOrder }) {
        const query = {};
        
        // Search by name (case-insensitive partial match)
        if (name) {
            query.name = { $regex: new RegExp(name, 'i') }; // Case-insensitive regex search
        }

        // Search by specialty (case-insensitive partial match)
        if (specialty) {
            query.specialty = { $regex: new RegExp(specialty, 'i') };
        }

        // Filter by availability date
        if (date) {
            const searchDate = new Date(date);
            query['availability.date'] = searchDate;
        }

        // Filter by availability hours after current time
        if (hours) {
            const currentTime = new Date();
            const currentHour = currentTime.getHours();
            const currentMinute = currentTime.getMinutes();

            query['availability.hours'] = {
                $elemMatch: {
                    start: {
                        $gt: `${currentHour}:${currentMinute}` // Only show slots starting after current time
                    }
                }
            };
        }

        // Define the sort criteria
        const sortOptions = {};
        if (sortBy && sortOrder) {
            sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
        }

        // Pagination: skip and limit
        const options = {
            skip: skip ? parseInt(skip) : 0,
            limit: limit ? parseInt(limit) : 10,  // Default limit to 10 results
            sort: sortOptions
        };

        return await Doctor.find(query).setOptions(options);
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

    // Find doctor by reset token
    async findDoctorByResetToken(resetToken) {
        return await Doctor.findOne({ resetToken });
    }

    // Update doctor profile
    async updateDoctorProfile(doctorId, profileData) {
        return await Doctor.findByIdAndUpdate(doctorId, profileData, { new: true });
    }

    // Delete OTP by email
    async deleteOtpByEmail(email) {
        return await OtpModel.deleteMany({ email });
    }

    
    async delete(doctorId) {
        return await Doctor.findByIdAndDelete(doctorId);
    }
}

module.exports = new DoctorRepository();

