const ReviewService = require("../services/reviewService");
const response = require("../middleware/response");
const mongoose = require("mongoose");

class ReviewController {
    async createReview(req, res) {
        const { rating, review, doctor, appointment } = req.body;
        let user;
        if (!req.patient) {
            return response(res, 401, "fail", "Unauthorized: Patient not found");
        } else {
            user = req.patient._id
        }

        if (!rating || rating < 1 || rating > 5) {
            return response(res, 400, "error", "Rating must be between 1 and 5");
        }

        if (!mongoose.Types.ObjectId.isValid(user)) {
            return response(res, 400, "error", "Invalid user ID");
        }
        if (!mongoose.Types.ObjectId.isValid(doctor)) {
            return response(res, 400, "error", "Invalid doctor ID");
        }
        if (!mongoose.Types.ObjectId.isValid(appointment)) {
            return response(res, 400, "error", "Invalid appointment ID");
        }

        try {
            const reviewData = { rating, review, user, doctor, appointment };
            const exist = await ReviewService.filterReviews(doctor, user);
            if(exist && exist.length > 0) {
                return response(res, 400, "error", "Review already exists");
            }
            const newReview = await ReviewService.createReview(reviewData);
            return response(
                res,
                201,
                "success",
                "Review created successfully",
                newReview
            );
        } catch (error) {
            console.log(error);
            return response(res, 500, "error", "Internal Server Error");
        }
    }

    async getAllReviews(req, res) {
        const { page = 1, limit = 10 } = req.query;
        const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        sort: { createdAt: -1 },
        };

        try {
            const reviews = await ReviewService.getPaginatedReviews(options);
            return response(
                res,
                200,
                "success",
                "Reviews retrieved successfully",
                reviews
            );
        } catch (error) {
            return response(res, 500, "error", "Internal Server Error");
        }
    }
    async getDoctorReviews(req, res) {
        let doctorId = req.body.doctorId;
        if (!doctorId) {
            return response(res, 401, "fail", "Unauthorized: Doctor not found");
        } 

        try {
            const reviews = await ReviewService.getDoctorReviews(doctorId);
            
            return response(
                res,
                200,
                "success",
                "Doctor reviews retrieved successfully",
                reviews
            );
        } catch (error) {
            console.log(error);
            return response(res, 500, "error", "Internal Server Error");
        }
    }

    async getDoctorRating(req, res) {
        let doctorId = req.body.doctorId;
        if (!doctorId) {
            return response(res, 400, "error", "Invalid or doctor ID not found");
        } 

        if (!mongoose.Types.ObjectId.isValid(doctorId)) {
            return response(res, 400, "error", "Invalid doctor ID");
        }

        try {
            const { avgRating, ratingCount } = await ReviewService.getDoctorRating(
                doctorId
            );
            return response(
                res,
                200,
                "success",
                "Doctor rating retrieved successfully",
                {
                avgRating,
                ratingCount,
                }
            );
        } catch (error) {
            console.log(error)
            return response(res, 500, "error", "Internal Server Error");
        }
    }

    async reportReview(req, res) {
        const id = req.body;
        if (!id) {
            return response(res,400,'fail',"Invalid or review ID not found");
        }
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return response(res, 400, "error", "Invalid review ID");
        }

        try {
            const review = await ReviewService.getReviewById(id);
            if(!review) {
                return response(res, 404, "error", "Review not found");
            }
            if (review.reported) {
                return response(res,400,'fail',"This review is already reported")
            }
            const reportedReview = await ReviewService.reportReview(id);
            
            return response(
                res,
                200,
                "success",
                "Review reported successfully",
                reportedReview
            );
        } catch (error) {
            console.log(error)
            return response(res, 500, "error", "Internal Server Error");
        }
    }

    async getReportedReviews(req, res) {
        try {
            const reportedReviews = await ReviewService.getReportedReviews();
            return response(
                res,
                200,
                "success",
                "Reported reviews retrieved successfully",
                reportedReviews
            );
        } catch (error) {
            return response(res, 500, "error", "Internal Server Error");
        }
    }

    async deleteMyReview(req, res) {
        const {reviewId }= req.body;
        if (!req.patient) {
            return response(res, 401, "fail", "Unauthorized: Patient not found");
        } 
        if (!reviewId) {
            return response(res, 400, "error", "Invalid or doctor ID not found");
        }
        if(!mongoose.Types.ObjectId.isValid(reviewId)) {
            return response(res, 400, "error", "Invalid review ID");
        }
        try {
            const deletedReview = await ReviewService.deleteReview(reviewId);
            if (deletedReview === 404) {
                return response(res, 404, "error", "Review not found");
            }
            return response(res, 200, "success", "Review deleted successfully");
        } catch (error) {
            console.log(error)
            return response(res, 500, "error", "Internal Server Error");
        }

    }


    async deleteReview(req, res) {
        const id = req.body;
        if(!id) {
            return response(res, 400, "error", "Invalid  ID or Not found ");
        }

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return response(res, 400, "error", "Invalid review ID");
        }

        try {
            const deletedReview = await ReviewService.deleteReview(id);
            if (!deletedReview) {
                return response(res, 404, "error", "Review not found");
            }
            return response(res, 200, "success", "Review deleted successfully");
        } catch (error) {
            return response(res, 500, "error", "Internal Server Error");
        }
    }
}

module.exports = new ReviewController();
