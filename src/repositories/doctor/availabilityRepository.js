const Availability = require('../../models/doctor/availabilityModel');

class AvailabilityRepository {
    async createAvailability(data) {
        const availability = new Availability(data);
        return await availability.save();
    }

    async getAvailabilityById(id) {
        return await Availability.findById(id);
    }

    async getAllAvailabilities() {
        return await Availability.find();
    }

    async updateAvailability(id, data) {
        return await Availability.findByIdAndUpdate(id, data, { new: true });
    }

    async deleteAvailability(id) {
        return await Availability.findByIdAndDelete(id);
    }
}

module.exports = new AvailabilityRepository();
