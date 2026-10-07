const mongoose = require("mongoose");

// Each doctor manages their own clinic details.
const clinicSchema = new mongoose.Schema(
    {
        doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true, unique: true },
        name: { type: String, required: true, trim: true, maxlength: 80 },
        location: {
            city: { type: String, required: true, trim: true, maxlength: 60 },
            state: { type: String, required: true, trim: true, maxlength: 60 },
            address: { type: String, trim: true, maxlength: 200 },
        },
        contact: {
            phone: { type: String, required: true, trim: true },
            email: { type: String, trim: true, lowercase: true },
        },
        services: [{ type: String, trim: true, maxlength: 60 }],
    },
    {
        timestamps: true,
        toJSON: { versionKey: false },
        toObject: { versionKey: false },
    }
);

clinicSchema.index({ "location.city": 1, "location.state": 1 });

module.exports = mongoose.model("Clinic", clinicSchema);
