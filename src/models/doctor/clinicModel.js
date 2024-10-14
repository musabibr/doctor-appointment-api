// clinic.model.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const clinicSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true,
        index: true
    },
    location: {
        city: { type: String, required: true },
        state: { type: String, required: true }
    },
    contact: {
        phone: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
        }
    },
    services: [{
        type: String,
    }]
}, { timestamps: true }); // Auto-created createdAt and updatedAt

module.exports = mongoose.model('Clinic', clinicSchema);
