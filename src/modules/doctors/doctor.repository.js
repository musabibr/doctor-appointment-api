const _ = require("lodash");
const Doctor = require("./doctor.model");
const Clinic = require("./clinic.model");

const PUBLIC_FILTER = { approvalStatus: "approved", isVerified: true };

const CARD_FIELDS =
    "name photo gender specialty about price discount ratingAverage ratingCount clinic availability";

const SORTS = {
    rating: { ratingAverage: -1, ratingCount: -1, name: 1 },
    price_asc: { price: 1, name: 1 },
    price_desc: { price: -1, name: 1 },
    name: { name: 1 },
};

// $expr: the doctor has at least one slot with free seats on `date`.
const hasOpenSlotOn = (date) => ({
    $anyElementTrue: [
        {
            $map: {
                input: { $ifNull: ["$availability", []] },
                as: "day",
                in: {
                    $and: [
                        { $eq: ["$$day.date", date] },
                        {
                            $anyElementTrue: [
                                {
                                    $map: {
                                        input: { $ifNull: ["$$day.hours", []] },
                                        as: "slot",
                                        in: { $lt: ["$$slot.currentPatients", "$$slot.maxPatients"] },
                                    },
                                },
                            ],
                        },
                    ],
                },
            },
        },
    ],
});

class DoctorRepository {
    create(doctorData) {
        return Doctor.create(doctorData);
    }

    findById(id) {
        return Doctor.findById(id);
    }

    findByIdWithClinic(id) {
        return Doctor.findById(id).populate("clinic");
    }

    findByIdWithDocuments(id) {
        return Doctor.findById(id).select("+medicalLicense +personalID").populate("clinic");
    }

    findByEmail(email) {
        return Doctor.findOne({ email });
    }

    existsByPhone(phoneNumber) {
        return Doctor.exists({ phoneNumber });
    }

    findPublicById(id) {
        return Doctor.findOne({ _id: id, ...PUBLIC_FILTER }).populate("clinic", "name location contact services").lean();
    }

    // Plain field updates. Availability changes go through the methods below.
    update(id, update) {
        return Doctor.findByIdAndUpdate(id, update, { new: true, runValidators: true });
    }

    async search({ name, specialty, city, date, sort, skip, limit }) {
        const filter = { ...PUBLIC_FILTER };
        if (name) filter.name = { $regex: _.escapeRegExp(name), $options: "i" };
        if (specialty) filter.specialty = { $regex: _.escapeRegExp(specialty), $options: "i" };
        if (city) {
            const clinicIds = await Clinic.find({
                "location.city": { $regex: _.escapeRegExp(city), $options: "i" },
            }).distinct("_id");
            filter.clinic = { $in: clinicIds };
        }
        if (date) filter.$expr = hasOpenSlotOn(date);

        const [items, total] = await Promise.all([
            Doctor.find(filter)
                .select(CARD_FIELDS)
                .populate("clinic", "name location")
                .sort(SORTS[sort] || SORTS.rating)
                .skip(skip)
                .limit(limit)
                .lean(),
            Doctor.countDocuments(filter),
        ]);
        return { items, total };
    }

    listSpecialties() {
        return Doctor.distinct("specialty", PUBLIC_FILTER);
    }

    async listForAdmin({ status, q, skip, limit }) {
        const filter = {};
        if (status) filter.approvalStatus = status;
        if (q) {
            const pattern = new RegExp(_.escapeRegExp(q), "i");
            filter.$or = [{ name: pattern }, { email: pattern }, { specialty: pattern }];
        }
        const [items, total] = await Promise.all([
            Doctor.find(filter)
                .select("-availability")
                .populate("clinic", "name location")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Doctor.countDocuments(filter),
        ]);
        return { items, total };
    }

    countByApprovalStatus() {
        return Doctor.aggregate([{ $group: { _id: "$approvalStatus", count: { $sum: 1 } } }]);
    }

    // Adds a new day unless the doctor already has one on that date.
    addAvailabilityDay(doctorId, day) {
        return Doctor.updateOne(
            { _id: doctorId, "availability.date": { $ne: day.date } },
            { $push: { availability: { $each: [day], $sort: { date: 1 } } }, $inc: { __v: 1 } }
        );
    }

    removeAvailabilityDay(doctorId, availabilityId) {
        return Doctor.updateOne(
            { _id: doctorId },
            { $pull: { availability: { _id: availabilityId } }, $inc: { __v: 1 } }
        );
    }

    // Atomically takes one seat, only if the slot still has room and its capacity
    // is still `maxPatients`. Returns true when the seat was reserved.
    async reserveSeat({ doctorId, availabilityId, slotId, maxPatients }) {
        const result = await Doctor.updateOne(
            {
                _id: doctorId,
                ...PUBLIC_FILTER,
                availability: {
                    $elemMatch: {
                        _id: availabilityId,
                        hours: { $elemMatch: { _id: slotId, maxPatients, currentPatients: { $lt: maxPatients } } },
                    },
                },
            },
            { $inc: { "availability.$[day].hours.$[slot].currentPatients": 1, __v: 1 } },
            { arrayFilters: [{ "day._id": availabilityId }, { "slot._id": slotId }] }
        );
        return result.modifiedCount === 1;
    }

    // Gives a seat back. A no-op if the day or slot no longer exists.
    releaseSeat({ doctorId, availabilityId, slotId }) {
        return Doctor.updateOne(
            {
                _id: doctorId,
                availability: {
                    $elemMatch: {
                        _id: availabilityId,
                        hours: { $elemMatch: { _id: slotId, currentPatients: { $gt: 0 } } },
                    },
                },
            },
            { $inc: { "availability.$[day].hours.$[slot].currentPatients": -1, __v: 1 } },
            { arrayFilters: [{ "day._id": availabilityId }, { "slot._id": slotId }] }
        );
    }

    setRating(doctorId, { ratingAverage, ratingCount }) {
        return Doctor.updateOne({ _id: doctorId }, { $set: { ratingAverage, ratingCount } });
    }

    delete(id) {
        return Doctor.findByIdAndDelete(id);
    }
}

module.exports = new DoctorRepository();
module.exports.PUBLIC_FILTER = PUBLIC_FILTER;
