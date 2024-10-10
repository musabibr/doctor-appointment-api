const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const patientSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { 
        type: String, 
        required: true, 
        unique: true, 
        validate: {
            validator: function (v) {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); // Simple email validation regex
            },
            message: props => `${props.value} is not a valid email!`
        }
    },
    password: { type: String, required: true },
    gender: { 
        type: String, 
        enum: ["male", "female"]
    },
    photo: { 
        type: String, 
        default: "https://example.com/default-image.jpg" // Replace with your default image URL
    },
    imgPId: {
        type:String,
    },
    location: {
        state: { type: String },
        city: { type: String },
    },
    resetToken: { type: String },
    resetTokenExpiry:{type:Date},
    appointments: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Appointment",
        },
    ]
},{
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true }
});

const Patient = mongoose.model("Patient", patientSchema);

module.exports = Patient;

// 