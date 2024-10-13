const  Review  = require("../models/reviewModel");
const mongoose = require("mongoose");

class ReviewRepository {
    async createReview(data) {
        const review = new Review(data);
        return await review.save();
    }
    
    async getReviewById(id) {
        return await Review.findById(new mongoose.Types.ObjectId(id));
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
            .populate("user","name photo")
    }
    async calculateDoctorRating(doctorId) {
        const result = await Review.aggregate([
            { $match: { doctor:new mongoose.Types.ObjectId(doctorId) } },
            {
                $group: {
                    _id: null,//"$doctor",
                    avgRating: { $avg: "$rating" },
                    ratingCount: { $count:{} },
                },
            },
        ]);
        return result || { avgRating: 0, ratingCount: 0 };
    }
    async filterReviews(doctorId, patientId) {
        return (await Review.find({ doctor: doctorId, patient: patientId }));
    }

    async reportReview(id) {
        return await Review.findByIdAndUpdate(
        new mongoose.Types.ObjectId(id),
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
