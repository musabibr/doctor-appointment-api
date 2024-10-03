// repositories/doctorRepository.js
const Doctor = require("../../models/doctor/doctorModel");

class DoctorRepository {
    async createDoctor(doctorData) {
        const doctor = new Doctor(doctorData);
        return doctor.save();
    }

    async findDoctorById(doctorId) {
        return Doctor.findById(doctorId).populate('appointments').populate('ratings').exec();
    }

    async findDoctorByEmail(email) {
        return Doctor.findOne({ email }).exec();
    }

    async updateDoctorById(doctorId, updateData) {
        return Doctor.findByIdAndUpdate(doctorId, updateData, { new: true }).exec();
    }

    async deleteDoctorById(doctorId) {
        return Doctor.findByIdAndDelete(doctorId).exec();
    }

    async findDoctors(criteria) {
        // Example of dynamic filtering based on multiple fields
        return Doctor.find(criteria).populate('clinic').populate('availability').exec();
    }

    async findDoctorRatings(doctorId) {
        return Doctor.findById(doctorId).populate('ratings').exec();
    }
}

module.exports = new DoctorRepository();
