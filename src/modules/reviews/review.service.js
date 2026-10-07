const AppError = require("../../shared/errors/AppError");
const { publish } = require("../../shared/events/eventBus");
const EVENTS = require("../../shared/events/events");
const { assertObjectId } = require("../../shared/utils/validation");
const { parsePagination, paginated } = require("../../shared/http/pagination");
const appointments = require("../appointments");
const reviewRepository = require("./review.repository");

class ReviewService {
    async create(patientId, { appointmentId, rating, comment }) {
        const appointment = await appointments.getReviewableAppointment(patientId, appointmentId);
        const review = await reviewRepository.create({
            rating,
            comment,
            patient: patientId,
            doctor: appointment.doctor,
            appointment: appointment._id,
        });
        await appointments.setAppointmentReview(appointment._id, review._id);
        await this.refreshDoctorRating(appointment.doctor);
        return review;
    }

    async listForDoctor(doctorId, query) {
        assertObjectId(doctorId, "doctor id");
        const pagination = parsePagination(query, { defaultLimit: 10 });
        const { items, total } = await reviewRepository.listForDoctor(doctorId, pagination);
        return paginated(items, total, pagination);
    }

    // Patients can delete their own reviews; admins can delete any review.
    async remove(actor, reviewId) {
        assertObjectId(reviewId, "review id");
        const review = await reviewRepository.findById(reviewId);
        const allowed = review && (actor.role === "admin" || String(review.patient) === String(actor.id));
        if (!allowed) throw AppError.notFound("Review not found");

        await reviewRepository.delete(reviewId);
        await appointments.setAppointmentReview(review.appointment, null);
        await this.refreshDoctorRating(review.doctor);
    }

    // Doctors can flag reviews on their own profile for an admin to look at.
    async report(doctorId, reviewId, reason) {
        assertObjectId(reviewId, "review id");
        const review = await reviewRepository.findById(reviewId);
        if (!review || String(review.doctor) !== String(doctorId)) throw AppError.notFound("Review not found");
        if (review.reported) throw AppError.conflict("This review has already been reported");
        return reviewRepository.update(reviewId, {
            $set: { reported: true, reportReason: reason, reportedAt: new Date() },
        });
    }

    async listReported(query) {
        const pagination = parsePagination(query, { defaultLimit: 20 });
        const { items, total } = await reviewRepository.listReported(pagination);
        return paginated(items, total, pagination);
    }

    async dismissReport(reviewId) {
        assertObjectId(reviewId, "review id");
        const review = await reviewRepository.update(reviewId, {
            $set: { reported: false },
            $unset: { reportReason: 1, reportedAt: 1 },
        });
        if (!review) throw AppError.notFound("Review not found");
        return review;
    }

    countReported() {
        return reviewRepository.countReported();
    }

    async refreshDoctorRating(doctorId) {
        const rating = await reviewRepository.ratingFor(doctorId);
        await publish(EVENTS.DOCTOR_RATING_CHANGED, { doctorId: String(doctorId), ...rating });
    }

    async removeAllByPatient(patientId) {
        const reviews = await reviewRepository.findByPatient(patientId);
        await reviewRepository.deleteMany({ patient: patientId });
        const doctorIds = new Set(reviews.map((review) => String(review.doctor)));
        for (const doctorId of doctorIds) await this.refreshDoctorRating(doctorId);
    }

    removeAllByDoctor(doctorId) {
        return reviewRepository.deleteMany({ doctor: doctorId });
    }
}

module.exports = new ReviewService();
