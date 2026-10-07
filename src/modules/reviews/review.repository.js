const mongoose = require("mongoose");
const Review = require("./review.model");

class ReviewRepository {
    create(data) {
        return Review.create(data);
    }

    findById(id) {
        return Review.findById(id);
    }

    async listForDoctor(doctorId, { skip, limit }) {
        const filter = { doctor: doctorId };
        const [items, total] = await Promise.all([
            Review.find(filter).populate("patient", "name photo").sort({ createdAt: -1 }).skip(skip).limit(limit),
            Review.countDocuments(filter),
        ]);
        return { items, total };
    }

    async listReported({ skip, limit }) {
        const filter = { reported: true };
        const [items, total] = await Promise.all([
            Review.find(filter)
                .populate("patient", "name email photo")
                .populate("doctor", "name specialty photo")
                .sort({ reportedAt: -1 })
                .skip(skip)
                .limit(limit),
            Review.countDocuments(filter),
        ]);
        return { items, total };
    }

    countReported() {
        return Review.countDocuments({ reported: true });
    }

    async ratingFor(doctorId) {
        const [result] = await Review.aggregate([
            { $match: { doctor: new mongoose.Types.ObjectId(String(doctorId)) } },
            { $group: { _id: null, average: { $avg: "$rating" }, count: { $sum: 1 } } },
        ]);
        return {
            ratingAverage: result ? Math.round(result.average * 10) / 10 : 0,
            ratingCount: result ? result.count : 0,
        };
    }

    update(id, update) {
        return Review.findByIdAndUpdate(id, update, { new: true, runValidators: true });
    }

    findByPatient(patientId) {
        return Review.find({ patient: patientId });
    }

    delete(id) {
        return Review.findByIdAndDelete(id);
    }

    deleteMany(filter) {
        return Review.deleteMany(filter);
    }
}

module.exports = new ReviewRepository();
