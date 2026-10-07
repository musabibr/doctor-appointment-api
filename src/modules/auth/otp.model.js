const mongoose = require("mongoose");

// Email verification codes. Only a hash of the code is stored.
const otpSchema = new mongoose.Schema({
    role: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    otpHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 600, // MongoDB deletes the document after 10 minutes
    },
});

otpSchema.index({ role: 1, email: 1 });

const OtpModel = mongoose.model("Otp", otpSchema);

module.exports = OtpModel;
