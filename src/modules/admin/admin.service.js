const { encryptData } = require("../../shared/utils/hash");
const patients = require("../patients");
const doctors = require("../doctors");
const appointments = require("../appointments");
const reviews = require("../reviews");
const adminRepository = require("./admin.repository");

class AdminService {
    async stats() {
        const [patientCount, doctorCounts, appointmentCounts, reportedReviews] = await Promise.all([
            patients.countPatients(),
            doctors.countDoctorsByStatus(),
            appointments.countAppointmentsByStatus(),
            reviews.countReportedReviews(),
        ]);
        return {
            patients: patientCount,
            doctors: doctorCounts,
            appointments: appointmentCounts,
            reportedReviews,
        };
    }

    // Used by `npm run create-admin` and the seed script. Creates the admin or
    // resets its name and password (which also signs out existing sessions).
    async createOrUpdate({ name, email, password }) {
        const passwordHash = await encryptData(password);
        const existing = await adminRepository.findByEmail(email);
        if (existing) {
            const admin = await adminRepository.update(existing._id, {
                $set: { name, password: passwordHash },
                $inc: { tokenVersion: 1 },
            });
            return { admin, created: false };
        }
        const admin = await adminRepository.create({ name, email, password: passwordHash });
        return { admin, created: true };
    }
}

module.exports = new AdminService();
