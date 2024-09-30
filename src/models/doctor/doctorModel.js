const mongoose = require("mongoose");
const availabilitySchema = require("./availabilityModel");
const ratingSchema = require("./ratingsModel"); // Fixed typo
const clinicSchema = require("./clinicModel");

// Doctor Schema
const doctorSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    password: { type: String, required: true },
    gender: { type: String, enum: ["male", "female"] },
    phoneNumber: {
        type: String,
        required: true,
        unique: true,
        index: true,
        validate: {
            validator: function (v) {
                return /^\+?[1-9]\d{1,14}$/.test(v); // Example for international phone validation
            },
            message: (props) => `${props.value} is not a valid phone number!`,
        },
    },
    photo: { type: String, default: "https://example.com/default-image.jpg" },
    imgPid: { type: String },
    medicalLicense: { type: String, required: true },
    personalID: { type: String, required: true },
    address: { type: String, required: true },
    specialty: { type: String, required: true },
    about: { type: String },

    // Embedding Clinic and Availability as separate schemas
    clinic: clinicSchema,
    availability: availabilitySchema,

    price: { type: Number, required: true },
    discount: { type: Number },
    isAvailable: { type: Boolean, default: true },
    isApproved: {
        type: String,
        enum: ["true", "false", "pending"],
        default: "pending",
    },
    otpRetries:{type:Number},
    isVerified:{type:Boolean},
    resetToken: { type: String },
    resetTokenExpiry: { type: Date },
    // Referencing Ratings and Appointments
    ratings: [ratingSchema],
    appointments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Appointment" }],
}, {
    timestamps: true,
    toObject: { virtuals: true },   
    toJSON: { virtuals: true },
});

// Export Model
const Doctor = mongoose.model("Doctor", doctorSchema);

module.exports = Doctor;
