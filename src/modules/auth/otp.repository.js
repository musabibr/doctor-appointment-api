const OtpModel = require("./otp.model");

class OtpRepository {
    // Only the newest code is valid: older ones are removed when a new one is issued.
    async replace(role, email, otpHash) {
        await OtpModel.deleteMany({ role, email });
        return OtpModel.create({ role, email, otpHash });
    }

    findLatest(role, email) {
        return OtpModel.findOne({ role, email }).sort({ createdAt: -1 });
    }

    incrementAttempts(id) {
        return OtpModel.findByIdAndUpdate(id, { $inc: { attempts: 1 } }, { new: true });
    }

    deleteAll(role, email) {
        return OtpModel.deleteMany({ role, email });
    }
}

module.exports = new OtpRepository();
