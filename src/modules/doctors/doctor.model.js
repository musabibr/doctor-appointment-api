const mongoose = require("mongoose");
const { jsonOptions } = require("../../shared/db/jsonOptions");

const APPROVAL_STATUSES = ["pending", "approved", "rejected"];

// A bookable session on a given day, e.g. 09:00-12:00 for up to 5 patients.
// currentPatients counts active bookings and is only changed with atomic $inc.
const slotSchema = new mongoose.Schema({
    start: { type: String, required: true }, // "HH:MM"
    end: { type: String, required: true }, // "HH:MM"
    maxPatients: { type: Number, default: 5, min: 1 },
    currentPatients: { type: Number, default: 0, min: 0 },
});

const availabilitySchema = new mongoose.Schema({
    date: { type: Date, required: true }, // UTC midnight of the calendar day
    hours: { type: [slotSchema], default: [] },
});

const doctorSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true, maxlength: 60 },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        password: { type: String, required: true, select: false },
        gender: { type: String, enum: ["male", "female"] },
        phoneNumber: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            validate: {
                validator: (v) => /^\+?\d{7,15}$/.test(v),
                message: (props) => `${props.value} is not a valid phone number!`,
            },
        },
        photo: { type: String, default: null },
        // Verification documents are only visible to admins.
        medicalLicense: { type: String, required: true, select: false },
        personalID: { type: String, required: true, select: false },
        address: { type: String, required: true, trim: true, maxlength: 200 },
        specialty: { type: String, required: true, trim: true, maxlength: 60, index: true },
        about: { type: String, trim: true, maxlength: 1000, default: "" },
        price: { type: Number, min: 0, default: 0 },
        discount: { type: Number, min: 0, max: 100, default: 0 }, // percent
        availability: { type: [availabilitySchema], default: [] },

        isVerified: { type: Boolean, default: false }, // email confirmed with OTP
        approvalStatus: { type: String, enum: APPROVAL_STATUSES, default: "pending", index: true },
        rejectionReason: { type: String, trim: true, maxlength: 500 },
        approvedAt: { type: Date },

        ratingAverage: { type: Number, default: 0 },
        ratingCount: { type: Number, default: 0 },
        clinic: { type: mongoose.Schema.Types.ObjectId, ref: "Clinic" },

        resetPasswordToken: { type: String, select: false },
        resetPasswordExpires: { type: Date, select: false },
        tokenVersion: { type: Number, default: 0 },
    },
    {
        timestamps: true,
        // Availability edits use save(); bookings bump __v with an atomic update,
        // so a stale availability edit fails instead of overwriting a booking.
        optimisticConcurrency: true,
        toJSON: jsonOptions(),
        toObject: jsonOptions(),
    }
);

doctorSchema.virtual("finalPrice").get(function finalPrice() {
    const price = this.price || 0;
    return Math.round(price * (1 - (this.discount || 0) / 100) * 100) / 100;
});

const Doctor = mongoose.model("Doctor", doctorSchema);

module.exports = Doctor;
module.exports.APPROVAL_STATUSES = APPROVAL_STATUSES;
