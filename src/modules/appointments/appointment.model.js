const mongoose = require("mongoose");

const STATUSES = ["pending", "confirmed", "declined", "canceled", "completed"];
// Statuses that hold a seat in the doctor's slot.
const ACTIVE_STATUSES = ["pending", "confirmed"];

const appointmentSchema = new mongoose.Schema(
    {
        patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
        doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
        // The availability day and slot this booking took a seat from.
        availability: { type: mongoose.Schema.Types.ObjectId, required: true },
        slot: { type: mongoose.Schema.Types.ObjectId, required: true },
        appointmentDate: { type: Date, required: true }, // UTC midnight of the day
        appointmentHour: { type: String, required: true }, // slot start "HH:MM"
        endHour: { type: String, required: true }, // slot end "HH:MM"
        status: { type: String, enum: STATUSES, default: "pending" },
        reasonForVisit: { type: String, trim: true, maxlength: 500 },
        doctorNotes: { type: String, trim: true, maxlength: 2000 },
        declineReason: { type: String, trim: true, maxlength: 500 },
        cancelReason: { type: String, trim: true, maxlength: 500 },
        canceledBy: { type: String, enum: ["patient", "doctor", "admin"] },
        price: { type: Number, min: 0, default: 0 },
        isPaid: { type: Boolean, default: false },
        review: { type: mongoose.Schema.Types.ObjectId, ref: "Review" },
    },
    {
        timestamps: true,
        toJSON: { versionKey: false },
        toObject: { versionKey: false },
    }
);

appointmentSchema.index({ patient: 1, appointmentDate: -1 });
appointmentSchema.index({ doctor: 1, appointmentDate: -1 });
appointmentSchema.index({ slot: 1, patient: 1, status: 1 });

const Appointment = mongoose.model("Appointment", appointmentSchema);

module.exports = Appointment;
module.exports.STATUSES = STATUSES;
module.exports.ACTIVE_STATUSES = ACTIVE_STATUSES;
