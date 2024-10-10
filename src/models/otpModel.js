// File: models/otpModel.js

const mongoose = require('mongoose');

// Define the schema for OTPs
const otpSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
    },
    otp: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 600, // OTP will automatically be deleted after 10 minutes (600 seconds)
    },
    retries: {
        type: Number,
        default: 0, // Track the number of OTP verification attempts
    },
});

// Create the model
const OtpModel = mongoose.model('Otp', otpSchema);

module.exports = OtpModel;
