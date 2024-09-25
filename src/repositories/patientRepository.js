// repositories/patientRepository.js
const Patient = require("../models/patientModel");

class PatientRepository {
    async create(patientData) {
        const patient = new Patient(patientData);
        return await patient.save();
    }

    async findById(patientId) {
        return await Patient.findById(patientId)
        //     .populate({
        //     path: "appointments.doctor",
        //     select: "name specialization", // You can specify which fields to populate from the Doctor model
        // });
    }

    async findByEmail(email) {
        return await Patient.findOne({ email })
            /*.populate({
            path: "appointments.doctor",
            select: "name specialization",
        });*/
    }

    async update(patientId, updateData) {
        return await Patient.findByIdAndUpdate(patientId, updateData, { new: true })
    //         .populate({
    //         path: "appointments.doctor",
    //         select: "name specialization",
    //     });
    }

    async delete(patientId) {
        return await Patient.findByIdAndDelete(patientId);
    }
}

module.exports = new PatientRepository();
