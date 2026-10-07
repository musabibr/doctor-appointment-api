const AppError = require("../../shared/errors/AppError");
const { publish } = require("../../shared/events/eventBus");
const EVENTS = require("../../shared/events/events");
const { encryptData } = require("../../shared/utils/hash");
const { saveFile, removeFile } = require("../../shared/storage/storage");
const { parsePagination, paginated } = require("../../shared/http/pagination");
const patientRepository = require("./patient.repository");

class PatientService {
    async register({ name, email, password, gender, phoneNumber, location }) {
        if (await patientRepository.findByEmail(email)) {
            throw AppError.conflict("An account with this email already exists", "EMAIL_TAKEN");
        }
        const patient = await patientRepository.create({
            name,
            email,
            password: await encryptData(password),
            gender,
            phoneNumber,
            location,
        });
        await publish(EVENTS.PATIENT_REGISTERED, {
            patient: { _id: String(patient._id), name: patient.name, email: patient.email },
        });
        return patient;
    }

    async getProfile(patientId) {
        const patient = await patientRepository.findById(patientId);
        if (!patient) throw AppError.notFound("Patient not found");
        return patient;
    }

    async updateProfile(patientId, { set, unset }) {
        const update = {};
        if (Object.keys(set).length) update.$set = set;
        if (Object.keys(unset).length) update.$unset = unset;
        const patient = await patientRepository.update(patientId, update);
        if (!patient) throw AppError.notFound("Patient not found");
        return patient;
    }

    async updatePhoto(patientId, file) {
        const before = await this.getProfile(patientId);
        const url = await saveFile(file, "photos");
        const patient = await patientRepository.update(patientId, { $set: { photo: url } });
        await removeFile(before.photo);
        return patient;
    }

    async list(query) {
        const pagination = parsePagination(query, { defaultLimit: 20 });
        const { items, total } = await patientRepository.list({ q: query.q, ...pagination });
        return paginated(items, total, pagination);
    }

    count() {
        return patientRepository.count();
    }

    // Other modules react to PATIENT_DELETED (appointments are canceled, reviews removed).
    async remove(patientId) {
        const patient = await patientRepository.delete(patientId);
        if (!patient) throw AppError.notFound("Patient not found");
        await removeFile(patient.photo);
        await publish(EVENTS.PATIENT_DELETED, { patientId: String(patient._id) });
    }
}

module.exports = new PatientService();
