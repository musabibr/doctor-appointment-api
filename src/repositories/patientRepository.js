// repositories/patientRepository.js
const Patient = require("../models/patientModel");

class PatientRepository {
    async create(patientData) {
        const patient = new Patient(patientData);
        return await patient.save();
    }

    async findById(patientId) {
        return await Patient.findById(patientId)
            .populate({
                path: "appointments",
                select: "appointmentDate appointmentHour status price", // Select these fields from Appointment
                populate: {
                    path: "doctor",
                    select: "name" // Populate the doctor's name field
                }
            });
    }

    async findByEmail(email) {
        return await Patient.findOne({ email })
            .populate({
                path: "appointments",
                select: "appointmentDate appointmentHour status price", // Select these fields from Appointment
                populate: {
                    path: "doctor",
                    select: "name" // Populate the doctor's name field
                }
            })
    }

    async update(patientId, updateData) {
        return await Patient.findByIdAndUpdate(patientId, updateData, { new: true })
            .populate({
                path: "appointments",
                select: "appointmentDate appointmentHour status price", // Select these fields from Appointment
                populate: {
                    path: "doctor",
                    select: "name" // Populate the doctor's name field
                }
            });
    }
    // New: Find by reset token
    async findByResetToken(token) {
        return await Patient.findOne({ resetToken: token });
    }

    async delete(patientId) {
        return await Patient.findByIdAndDelete(patientId);
    }
}

module.exports = new PatientRepository();

// 
