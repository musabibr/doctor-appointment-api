const availabilityRepository = require('../../repositories/doctor/availabilityRepository');

class AvailabilityService {
    // Helper function to convert time to total minutes since midnight
    timeToMinutes(time) {
        const [hour, minute] = time.split(":").map(Number);
        return hour * 60 + minute;
    }

    // Validate time format (HH:mm)
    validateTimeFormat(time) {
        const regex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
        if (!regex.test(time)) {
            throw new Error(`${time} is not a valid time format (HH:mm)!`);
        }
    }

    // Validate availability hours for no overlaps and that start is before end time
    validateHours(hours) {
        hours.forEach(hour => {
            const start = this.timeToMinutes(hour.start);
            const end = this.timeToMinutes(hour.end);

            // Validate start and end time format
            this.validateTimeFormat(hour.start);
            this.validateTimeFormat(hour.end);

            if (start >= end) {
                throw new Error("Start time must be before end time.");
            }
        });
    }

    // Create or update availability for a doctor
    async createOrUpdateAvailability(doctorId, availabilityData) {
        this.validateHours(availabilityData.hours);
        return availabilityRepository.createOrUpdateAvailability(doctorId, availabilityData);
    }

    // Delete specific availability details
    async deleteSpecificAvailability(doctorId, availabilityDetails) {
        return availabilityRepository.deleteSpecificAvailability(doctorId, availabilityDetails);
    }

    // Reschedule availability for a doctor ensuring no conflicts
    async rescheduleAvailability(doctorId, newAvailabilityData) {
        this.validateHours(newAvailabilityData.hours);
        return availabilityRepository.rescheduleAvailability(doctorId, newAvailabilityData);
    }
}

module.exports = new AvailabilityService();

