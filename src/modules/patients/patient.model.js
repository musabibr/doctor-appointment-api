const mongoose = require("mongoose");
const { jsonOptions } = require("../../shared/db/jsonOptions");

const patientSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true, maxlength: 60 },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        password: { type: String, required: true, select: false },
        gender: { type: String, enum: ["male", "female"] },
        phoneNumber: { type: String, trim: true },
        photo: { type: String, default: null },
        location: {
            state: { type: String, trim: true },
            city: { type: String, trim: true },
        },
        resetPasswordToken: { type: String, select: false },
        resetPasswordExpires: { type: Date, select: false },
        tokenVersion: { type: Number, default: 0 },
    },
    {
        timestamps: true,
        toJSON: jsonOptions(),
        toObject: jsonOptions(),
    }
);

const Patient = mongoose.model("Patient", patientSchema);

module.exports = Patient;
