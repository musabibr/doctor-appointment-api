const { parsePagination, paginated } = require("../../shared/http/pagination");
const clinicRepository = require("./clinic.repository");
const doctorRepository = require("./doctor.repository");

const stringParam = (value) => (typeof value === "string" && value.trim() ? value.trim().slice(0, 100) : undefined);

class ClinicService {
    async saveForDoctor(doctorId, data) {
        const clinic = await clinicRepository.upsertForDoctor(doctorId, data);
        await doctorRepository.update(doctorId, { $set: { clinic: clinic._id } });
        return clinic;
    }

    async search(query) {
        const pagination = parsePagination(query, { defaultLimit: 12 });
        const { items, total } = await clinicRepository.search({
            city: stringParam(query.city),
            state: stringParam(query.state),
            ...pagination,
        });
        return paginated(items, total, pagination);
    }
}

module.exports = new ClinicService();
