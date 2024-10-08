// clinic.repository.js
const Clinic = require('../../models/doctor/clinicModel');

/// services/clinic/clinicService.js
class ClinicService {
    async createClinic(clinicData) {
        return await Clinic.create(clinicData);
    }

    async getClinicById(id) {
        return await Clinic.findById(id);
    }
    async getClinicByName(name) {
        return await Clinic.findOne({ name });
    }

    async getClinics(data ,{ page, limit, skip }) {
        return await Clinic.find(data).page(page).limit(limit).skip(skip);
    }

    async updateClinic(id, updateData) {
        return await Clinic.findByIdAndUpdate(id, updateData);
    }

    async deleteClinic(id) {
        return await Clinic.findByIdAndDelete(id);
    }
}

module.exports = new ClinicService();

