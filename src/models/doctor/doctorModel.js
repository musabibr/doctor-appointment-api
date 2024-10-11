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
    availability: [
        {
            date: { type: Date },
            day: {
                type: String,
                set: function(v) {
                    const date = new Date(v);
                    return date.toLocaleString('en-US', { weekday: 'long' });
                }
            },
            hours: [
                {
                    start: { type: String },  // Simple String without validation
                    end: { type: String },    // Simple String without validation
                    maxPatients: { type: Number, default:5 },
                    currentPatients: { type: Number, default:0 },
                    isAvailable: {
                        type: Boolean, 
                    },
                },
            ],
        }
    ],

    price: { type: Number },
    discount: { type: Number },
    isApproved: {
        type: String,
        enum: ["true", "false", "pending"],
        default: "pending",
    },
    otpRetries: { type: Number },
    isVerified: { type: Boolean },
    resetToken: { type: String },
    resetTokenExpiry: { type: Date },
    clinic: { type: mongoose.Schema.Types.ObjectId, ref: "Clinic" },
    reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: "Review" }],
    appointments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Appointment" }],
}, {
    timestamps: true,
    toObject: { virtuals: true },   
    toJSON: { virtuals: true },
});

doctorSchema.pre("save", async function (next) {
    this.availability.map((availability) => {
        availability.hours.map((hour) => {
            if (hour.currentPatients < hour.maxPatients ) {
                hour.isAvailable = true;
            } else {
                hour.isAvailable = false;
            }
        })
    })
})
// Export Model
const Doctor = mongoose.model("Doctor", doctorSchema);

module.exports = Doctor;
// 
