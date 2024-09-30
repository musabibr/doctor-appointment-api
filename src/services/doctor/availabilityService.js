const availabilityRepository = require('../../repositories/doctor/availabilityRepository');

class AvailabilityService {
    async createAvailability(data) {
        // Business logic: Check for conflicts, restricted hours, etc.
        return await availabilityRepository.createAvailability(data);
    }

    async getAvailabilityById(id) {
        return await availabilityRepository.getAvailabilityById(id);
    }

    async getAllAvailabilities() {
        return await availabilityRepository.getAllAvailabilities();
    }

    async updateAvailability(id, data) {
        // Business logic: Check for conflicts, restricted hours, etc.
        return await availabilityRepository.updateAvailability(id, data);
    }

    async deleteAvailability(id) {
        return await availabilityRepository.deleteAvailability(id);
    }
}

module.exports = new AvailabilityService();
