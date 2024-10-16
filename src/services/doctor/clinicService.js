const clinicRepository = require('../../repositories/doctor/clinicRepository');

class ClinicService {
    async createClinic(clinicData) {
        return await clinicRepository.createClinic(clinicData);
    }

    async getClinicByName(name) {
        return await clinicRepository.getClinicByName(name);
    }

    async getClinicById(id) {
        return await clinicRepository.getClinicById(id);
    }

    async searchClinics(data ,{ page, limit, skip }) {
        const filter = {};
        if (data.name) filter['name'] = data.name;
        if (data.city) filter['location.city'] = data.city;
        if (data.state) filter['location.state'] = data.state;
        if (data.specialties) filter.services = data.services; // Filter by services
        return await clinicRepository.getClinics(filter, page, limit, skip);
    }

    async updateClinic(id, updateData) {
        return await clinicRepository.updateClinic(id, updateData);
    }

    async deleteClinic(id) {
        return await clinicRepository.deleteClinic(id);
    }
}

module.exports = new ClinicService();

