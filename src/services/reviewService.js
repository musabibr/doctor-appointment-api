const ReviewRepository = require("../repositories/reviewRepository");

class ReviewService {
    async createReview(data) {
        return await ReviewRepository.createReview(data);
    }

    async getPaginatedReviews({ page, limit, sort }) {
        const skip = (page - 1) * limit;
        return await ReviewRepository.getPaginatedReviews({ skip, limit, sort });
    }

    async getDoctorRating(doctorId) {
        const result = await ReviewRepository.calculateDoctorRating(doctorId);
        return {
        avgRating: result[0]?.avgRating || 0,
        ratingCount: result[0]?.ratingCount || 0,
        };
    }
    async getDoctorReviews(doctorId) {
        return await ReviewRepository.getDoctorReviews(doctorId);
    }

    async reportReview(id) {
        return await ReviewRepository.reportReview(id);
    }

    async getReportedReviews() {
        return await ReviewRepository.getReportedReviews();
    }

    async deleteReview(id) {
        return await ReviewRepository.deleteReview(id);
    }
}

module.exports = new ReviewService();
