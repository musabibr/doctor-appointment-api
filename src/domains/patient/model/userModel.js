const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    photo: {
        type: String,
        default: 'https://res.cloudinary.com/dv5v3q6z5/image/upload/v1633352600/doctor_default_pic.png'
    },
}, {
    timestamps: true,
    toJSON: {
        virtuals: true
    },
    toObject: {
        virtuals: true
    }
});


const Patient = mongoose.model('Patient', patientSchema)
module.exports = Patient