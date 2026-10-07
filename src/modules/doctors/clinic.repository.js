const _ = require("lodash");
const Clinic = require("./clinic.model");

class ClinicRepository {
    findByDoctor(doctorId) {
        return Clinic.findOne({ doctor: doctorId });
    }

    upsertForDoctor(doctorId, data) {
        return Clinic.findOneAndUpdate(
            { doctor: doctorId },
            { $set: { ...data, doctor: doctorId } },
            { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
        );
    }

    // Clinics in a location whose doctor is approved and visible to patients.
    async search({ city, state, skip, limit }) {
        const match = {};
        if (city) match["location.city"] = { $regex: _.escapeRegExp(city), $options: "i" };
        if (state) match["location.state"] = { $regex: _.escapeRegExp(state), $options: "i" };

        const [result] = await Clinic.aggregate([
            { $match: match },
            {
                $lookup: {
                    from: "doctors",
                    localField: "doctor",
                    foreignField: "_id",
                    as: "doctor",
                    pipeline: [
                        { $match: { approvalStatus: "approved", isVerified: true } },
                        { $project: { name: 1, photo: 1, specialty: 1, ratingAverage: 1, ratingCount: 1, price: 1, discount: 1 } },
                    ],
                },
            },
            { $unwind: "$doctor" },
            { $sort: { name: 1 } },
            {
                $facet: {
                    items: [{ $skip: skip }, { $limit: limit }, { $project: { __v: 0 } }],
                    total: [{ $count: "count" }],
                },
            },
        ]);
        return { items: result.items, total: result.total[0]?.count || 0 };
    }

    deleteByDoctor(doctorId) {
        return Clinic.deleteOne({ doctor: doctorId });
    }
}

module.exports = new ClinicRepository();
