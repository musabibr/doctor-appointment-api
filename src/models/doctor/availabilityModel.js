const mongoose = require("mongoose");

const availabilitySchema = new mongoose.Schema({
    dates: [
        { type: Date }
    ],
    days: [
        {
            type: String,
            enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        }
    ],
    hours: [
        {
            start: { type: String },  // Simple String without validation
            end: { type: String },    // Simple String without validation
        }
    ],
});

const Availability = mongoose.model("Availability", availabilitySchema);

module.exports = { availabilitySchema, Availability };


// Helper function to convert time to total minutes since midnight
// function timeToMinutes(time) {
//     const [hour, minute] = time.split(":").map(Number);
//     return hour * 60 + minute;
// }

// // Define restricted hours: no availability allowed between 00:00 and 06:00
// const RESTRICTED_START = timeToMinutes("00:00");
// const RESTRICTED_END = timeToMinutes("06:00");

// // Custom validation to prevent overlapping hours and restricted hours validation
// availabilitySchema.pre("save", function (next) {
//     const availability = this;

//     // Sort time blocks by the starting time
//     availability.hours.sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));

//     for (let i = 0; i < availability.hours.length; i++) {
//         const currentStart = timeToMinutes(availability.hours[i].start);
//         const currentEnd = timeToMinutes(availability.hours[i].end);

//         // Adjust for cross-day availability (end time is earlier than start time)
//         const normalizedEnd = currentEnd < currentStart ? currentEnd + 1440 : currentEnd;  // Add 1440 minutes for cross-day periods

//         // Business rule: Check if availability is within restricted hours
//         if (
//             (currentStart >= RESTRICTED_START && currentStart < RESTRICTED_END) ||
//             (normalizedEnd > RESTRICTED_START && currentEnd < RESTRICTED_END)
//         ) {
//             const error = new Error("No availability allowed between 00:00 and 06:00.");
//             return next(error);
//         }

//         // Check for overlapping time blocks
//         if (i < availability.hours.length - 1) {
//             const nextStart = timeToMinutes(availability.hours[i + 1].start);
//             if (normalizedEnd > nextStart) {
//                 const error = new Error("Time periods overlap within the same day, including cross-day availability.");
//                 return next(error);
//             }
//         }
//     }

//     next();
// });

// // Exporting the model
// const Availability = mongoose.model("Availability", availabilitySchema);

module.exports = {availabilitySchema,Availability};
