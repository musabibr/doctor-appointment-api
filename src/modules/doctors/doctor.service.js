const AppError = require("../../shared/errors/AppError");
const { publish } = require("../../shared/events/eventBus");
const EVENTS = require("../../shared/events/events");
const { encryptData } = require("../../shared/utils/hash");
const { isDateKey, parseDateKey } = require("../../shared/utils/time");
const { assertObjectId } = require("../../shared/utils/validation");
const { saveFile, removeFile } = require("../../shared/storage/storage");
const { parsePagination, paginated } = require("../../shared/http/pagination");
const { assertNotProtectedDemoAccount } = require("../../shared/demo/accounts");
const auth = require("../auth");
const doctorRepository = require("./doctor.repository");
const clinicRepository = require("./clinic.repository");
const { APPROVAL_STATUSES } = require("./doctor.model");
const { toCard, toPublicProfile, toOwnProfile, serializeAvailability } = require("./doctor.serializers");

const SORT_OPTIONS = ["rating", "price_asc", "price_desc", "name"];

const stringParam = (value) => (typeof value === "string" && value.trim() ? value.trim().slice(0, 100) : undefined);

class DoctorService {
    async register(input, files) {
        if (await doctorRepository.findByEmail(input.email)) {
            throw AppError.conflict("An account with this email already exists", "EMAIL_TAKEN");
        }
        if (await doctorRepository.existsByPhone(input.phoneNumber)) {
            throw AppError.conflict("This phone number is already registered", "PHONE_TAKEN");
        }

        const [medicalLicense, personalID, photo] = await Promise.all([
            saveFile(files.medicalLicense, "documents"),
            saveFile(files.personalID, "documents"),
            files.photo ? saveFile(files.photo, "photos") : null,
        ]);

        let doctor;
        try {
            doctor = await doctorRepository.create({
                ...input,
                password: await encryptData(input.password),
                medicalLicense,
                personalID,
                photo,
                isVerified: false,
                approvalStatus: "pending",
            });
        } catch (error) {
            await Promise.all([removeFile(medicalLicense), removeFile(personalID), removeFile(photo)]);
            throw error;
        }

        await auth.issueEmailVerification("doctor", doctor);
        return doctor;
    }

    async search(query) {
        if (query.date !== undefined && query.date !== "" && !isDateKey(query.date)) {
            throw AppError.validation({ date: "Use the YYYY-MM-DD format" });
        }
        const pagination = parsePagination(query, { defaultLimit: 12 });
        const { items, total } = await doctorRepository.search({
            name: stringParam(query.q) || stringParam(query.name),
            specialty: stringParam(query.specialty),
            city: stringParam(query.city),
            date: query.date ? parseDateKey(query.date) : undefined,
            sort: SORT_OPTIONS.includes(query.sort) ? query.sort : "rating",
            ...pagination,
        });
        return paginated(items.map(toCard), total, pagination);
    }

    async listSpecialties() {
        const specialties = await doctorRepository.listSpecialties();
        const unique = new Map(specialties.map((s) => [s.toLowerCase(), s]));
        return [...unique.values()].sort((a, b) => a.localeCompare(b));
    }

    async getPublicProfile(doctorId) {
        assertObjectId(doctorId, "doctor id");
        const doctor = await doctorRepository.findPublicById(doctorId);
        if (!doctor) throw AppError.notFound("Doctor not found");
        return toPublicProfile(doctor);
    }

    async getOwnProfile(doctorId) {
        const doctor = await doctorRepository.findByIdWithClinic(doctorId);
        if (!doctor) throw AppError.notFound("Doctor not found");
        return toOwnProfile(doctor);
    }

    async updateProfile(doctorId, changes) {
        if (changes.phoneNumber) {
            const owner = await doctorRepository.existsByPhone(changes.phoneNumber);
            if (owner && String(owner._id) !== String(doctorId)) {
                throw AppError.validation({ phoneNumber: "This phone number is already registered" });
            }
        }
        await doctorRepository.update(doctorId, { $set: changes });
        return this.getOwnProfile(doctorId);
    }

    async updatePhoto(doctorId, file) {
        const before = await doctorRepository.findById(doctorId);
        const url = await saveFile(file, "photos");
        await doctorRepository.update(doctorId, { $set: { photo: url } });
        await removeFile(before && before.photo);
        return this.getOwnProfile(doctorId);
    }

    async setRating(doctorId, rating) {
        await doctorRepository.setRating(doctorId, rating);
    }

    // ----- Administration -----

    async listForAdmin(query) {
        const status = APPROVAL_STATUSES.includes(query.status) ? query.status : undefined;
        const pagination = parsePagination(query, { defaultLimit: 20 });
        const { items, total } = await doctorRepository.listForAdmin({ status, q: stringParam(query.q), ...pagination });
        return paginated(items, total, pagination);
    }

    async getForAdmin(doctorId) {
        assertObjectId(doctorId, "doctor id");
        const doctor = await doctorRepository.findByIdWithDocuments(doctorId);
        if (!doctor) throw AppError.notFound("Doctor not found");
        return { ...doctor.toJSON(), availability: serializeAvailability(doctor.availability) };
    }

    async approve(doctorId) {
        assertObjectId(doctorId, "doctor id");
        const doctor = await doctorRepository.findById(doctorId);
        if (!doctor) throw AppError.notFound("Doctor not found");
        if (doctor.approvalStatus === "approved") throw AppError.conflict("This doctor is already approved");

        const updated = await doctorRepository.update(doctorId, {
            $set: { approvalStatus: "approved", approvedAt: new Date() },
            $unset: { rejectionReason: 1 },
        });
        await publish(EVENTS.DOCTOR_APPROVED, {
            doctor: { _id: String(updated._id), name: updated.name, email: updated.email },
        });
        return updated;
    }

    async reject(doctorId, reason) {
        assertObjectId(doctorId, "doctor id");
        const doctor = await doctorRepository.findById(doctorId);
        if (!doctor) throw AppError.notFound("Doctor not found");
        if (doctor.approvalStatus === "approved") {
            throw AppError.conflict("An approved doctor cannot be rejected. Delete the account instead.");
        }

        const updated = await doctorRepository.update(doctorId, {
            $set: { approvalStatus: "rejected", rejectionReason: reason },
        });
        await publish(EVENTS.DOCTOR_REJECTED, {
            doctor: { _id: String(updated._id), name: updated.name, email: updated.email },
            reason,
        });
        return updated;
    }

    // Other modules react to DOCTOR_DELETED (appointments are canceled, reviews removed).
    async remove(doctorId) {
        assertObjectId(doctorId, "doctor id");
        const doctor = await doctorRepository.findByIdWithDocuments(doctorId);
        if (!doctor) throw AppError.notFound("Doctor not found");
        assertNotProtectedDemoAccount(doctor.email, "be deleted");

        await doctorRepository.delete(doctorId);
        await clinicRepository.deleteByDoctor(doctorId);
        await Promise.all([doctor.photo, doctor.medicalLicense, doctor.personalID].map(removeFile));
        await publish(EVENTS.DOCTOR_DELETED, { doctorId: String(doctorId) });
    }

    async countByStatus() {
        const rows = await doctorRepository.countByApprovalStatus();
        const counts = { pending: 0, approved: 0, rejected: 0 };
        for (const row of rows) counts[row._id] = row.count;
        counts.total = counts.pending + counts.approved + counts.rejected;
        return counts;
    }
}

module.exports = new DoctorService();
