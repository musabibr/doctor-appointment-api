const  Review  = require("../models/reviewModel");
const mongoose = require("mongoose");

class ReviewRepository {
    async createReview(data) {
        const review = new Review(data);
        return await review.save();
    }

    async getPaginatedReviews({ skip, limit, sort }) {
        return await Review.find()
        .populate("user doctor appointment")
        .sort(sort)
        .skip(skip)
        .limit(limit);
    }

    async getDoctorReviews(doctorId) {
        return await Review.find({ doctor: doctorId })
            .populate("user").select("name photo")
            .populate("appointment").select("date hour");
    }
    async calculateDoctorRating(doctorId) {
        return await Review.aggregate([
        { $match: { doctor: mongoose.Types.ObjectId(doctorId) } },
        {
            $group: {
            _id: "$doctor",
            avgRating: { $avg: "$rating" },
            ratingCount: { $sum: 1 },
            },
        },
        ]);
    }

    async reportReview(id) {
        return await Review.findByIdAndUpdate(
        id,
        { reported: true },
        { new: true }
        );
    }

    async getReportedReviews() {
        return await Review.find({ reported: true });
    }

    async deleteReview(id) {
        return await Review.findByIdAndDelete(id);
    }
}

module.exports = new ReviewRepository();
