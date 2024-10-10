const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    review: {
      type: String,
      maxlength: 500,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
    },
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
    },
    reported: {
      type: Boolean,
      default: false, // Add field to track if review has been reported
    },
  },
  {
    timestamps: true, // createdAt and updatedAt
  }
);

const Review = mongoose.model("Review", reviewSchema);

module.exports = { reviewSchema, Review };
