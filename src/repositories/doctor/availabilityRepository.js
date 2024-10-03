const Doctor = require('../../models/doctor/doctorModel');

class AvailabilityRepository {
    // Create or update availability for a doctor
    async createOrUpdateAvailability(doctorId, availabilityData) {
        const doctor = await Doctor.findById(doctorId);
        doctor.availability = availabilityData;
        return doctor.save();
    }

    // Find doctor by specific availability details such as date, day, or hours
    async findAvailabilityByDetails(details) {
        return Doctor.find({ "availability": { $elemMatch: details } });
    }

    // Update specific availability for a doctor
    async updateAvailabilityById(doctorId, availabilityData) {
        return Doctor.findByIdAndUpdate(
            doctorId, 
            { "availability": availabilityData },
            { new: true, runValidators: true }
        );
    }

    // Delete specific availability details (date, day, or hour)
    async deleteSpecificAvailability(doctorId, availabilityDetails) {
        const doctor = await Doctor.findById(doctorId);
        if (!doctor) throw new Error("Doctor not found");

        // Remove the matching availability details
        doctor.availability = doctor.availability.filter((slot) => {
            // Check if availability slot matches any of the provided details
            return !(availabilityDetails.dates.includes(slot.dates) ||
                    availabilityDetails.days.includes(slot.days) ||
                    (availabilityDetails.hours.start === slot.hours.start && availabilityDetails.hours.end === slot.hours.end));
        });

        return doctor.save();
    }

    // Reschedule availability without conflicting with existing times
    async rescheduleAvailability(doctorId, newAvailabilityData) {
        const doctor = await Doctor.findById(doctorId);
        if (!doctor) throw new Error("Doctor not found");

        // Check for conflicting times with the new availability
        for (let existingSlot of doctor.availability) {
            for (let newSlot of newAvailabilityData.hours) {
                const existingStart = this.timeToMinutes(existingSlot.hours.start);
                const existingEnd = this.timeToMinutes(existingSlot.hours.end);
                const newStart = this.timeToMinutes(newSlot.start);
                const newEnd = this.timeToMinutes(newSlot.end);

                // Check if the new time conflicts with the existing time
                if ((newStart >= existingStart && newStart < existingEnd) || (newEnd > existingStart && newEnd <= existingEnd)) {
                    throw new Error("Conflicting availability times.");
                }
            }
        }

        // No conflicts, add the new availability data
        doctor.availability.push(...newAvailabilityData.hours);
        return doctor.save();
    }

    // Helper function to convert time to total minutes since midnight
    timeToMinutes(time) {
        const [hour, minute] = time.split(":").map(Number);
        return hour * 60 + minute;
    }
}

module.exports = new AvailabilityRepository();
