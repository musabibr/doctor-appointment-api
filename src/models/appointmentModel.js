const mongoose = require("mongoose");

// Appointment Schema
const appointmentSchema = new mongoose.Schema(
    {
        patient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Patient",
        required: true,
        },
        doctor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Doctor",
        required: true,
        },
        appointmentDate: {
        type: Date,
        required: true,
        },
        appointmentHour: {
        type: String, // The specific hour within the doctor's available hours
        required: true,
        },
        status: {
        type: String,
        enum: ["pending", "confirmed", "declined", "canceled"],
        default: "pending",
        },
        reasonForVisit: { type: String }, // Reason for appointment from the patient
        doctorNotes: { type: String }, // Doctor's notes post-appointment
        isPaid: {
        type: Boolean,
        default: false,
        },
        price: {
        type: Number,
        required: true,
        },
    },
    {
        timestamps: true, // createdAt and updatedAt timestamps
    }
);

const Appointment = mongoose.model("Appointment", appointmentSchema);

module.exports = Appointment;
