// clinic.model.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const clinicSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    location: {
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true }
    },
    contact: {
        phone: {
            type: String,
            required: true,
            match: [/^\d{10}$/, 'Please enter a valid 10-digit phone number']
        },
        email: {
            type: String,
            required: true,
            match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
        }
    },
    operatingHours: {
        monday: { open: String, close: String },
        tuesday: { open: String, close: String },
        wednesday: { open: String, close: String },
        thursday: { open: String, close: String },
        friday: { open: String, close: String },
        saturday: { open: String, close: String },
        sunday: { open: String, close: String }
    },
    doctors: [{
        type: Schema.Types.ObjectId,
        ref: 'Doctor',
        required: true
    }],
    services: [{
        type: String,
        required: true
    }]
}, { timestamps: true }); // Auto-created createdAt and updatedAt

module.exports = mongoose.model('Clinic', clinicSchema);
