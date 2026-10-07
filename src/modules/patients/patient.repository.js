const _ = require("lodash");
const Patient = require("./patient.model");

class PatientRepository {
    create(patientData) {
        return Patient.create(patientData);
    }

    findById(patientId) {
        return Patient.findById(patientId);
    }

    findByEmail(email) {
        return Patient.findOne({ email });
    }

    update(patientId, update) {
        return Patient.findByIdAndUpdate(patientId, update, { new: true, runValidators: true });
    }

    async list({ q, skip, limit }) {
        const filter = {};
        if (q) {
            const pattern = new RegExp(_.escapeRegExp(q), "i");
            filter.$or = [{ name: pattern }, { email: pattern }];
        }
        const [items, total] = await Promise.all([
            Patient.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
            Patient.countDocuments(filter),
        ]);
        return { items, total };
    }

    count() {
        return Patient.countDocuments();
    }

    delete(patientId) {
        return Patient.findByIdAndDelete(patientId);
    }
}

module.exports = new PatientRepository();
