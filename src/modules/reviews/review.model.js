const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
    {
        rating: { type: Number, required: true, min: 1, max: 5 },
        comment: { type: String, trim: true, maxlength: 1000, default: "" },
        patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
        doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
        // One review per completed appointment.
        appointment: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment", required: true, unique: true },
        reported: { type: Boolean, default: false },
        reportReason: { type: String, trim: true, maxlength: 500 },
        reportedAt: { type: Date },
    },
    {
        timestamps: true,
        toJSON: { versionKey: false },
        toObject: { versionKey: false },
    }
);

reviewSchema.index({ doctor: 1, createdAt: -1 });
reviewSchema.index({ reported: 1 });

const Review = mongoose.model("Review", reviewSchema);

module.exports = Review;
