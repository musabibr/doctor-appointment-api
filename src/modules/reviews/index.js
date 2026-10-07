// Reviews module: ratings and comments on completed appointments, and
// reports that doctors raise about reviews.
const router = require("./review.routes");
const reviewService = require("./review.service");
const { registerEventHandlers } = require("./review.events");

module.exports = {
    name: "reviews",
    routes: [{ path: "/api/v1/reviews", router }],
    registerEventHandlers,

    // Public API
    listReportedReviews: (query) => reviewService.listReported(query),
    dismissReviewReport: (reviewId) => reviewService.dismissReport(reviewId),
    deleteReviewAsAdmin: (adminId, reviewId) => reviewService.remove({ role: "admin", id: adminId }, reviewId),
    countReportedReviews: () => reviewService.countReported(),
};
