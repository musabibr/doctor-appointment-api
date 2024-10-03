const mongoose = require("mongoose");
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
    clinic: {
        name: { type: String },
        location: {
            state: { type: String },
            city: { type: String },
        }
    },
    availability: {
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
    },

    price: { type: Number, required: true },
    discount: { type: Number },
    isAvailable: { type: Boolean, default: true },
    isApproved: {
        type: String,
        enum: ["true", "false", "pending"],
        default: "pending",
    },
    otpRetries: { type: Number },
    isVerified: { type: Boolean },
    resetToken: { type: String },
    resetTokenExpiry: { type: Date },
    // Referencing Ratings and Appointments
    ratings: [{ type: mongoose.Schema.Types.ObjectId, ref: "Rating" }],
    appointments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Appointment" }],
}, {
    timestamps: true,
    toObject: { virtuals: true },   
    toJSON: { virtuals: true },
});

// Export Model
const Doctor = mongoose.model("Doctor", doctorSchema);

module.exports = Doctor;
