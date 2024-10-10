const patientRepository = require("../repositories/patientRepository");
class PatientService {
    async registerPatient(patientData) {
        const existingPatient = await patientRepository.findByEmail(patientData.email);
        if (existingPatient) {
            return 11001;
            // throw new Error("Email already in use");
        }
        return await patientRepository.create(patientData);
    }

    async loginPatient(email) {
        const patient = await patientRepository.findByEmail(email);
        if (!patient) {
            return 404;
        }
        return patient // Return token and patient info
    }

    async getPatientById(patientId) {
        return await patientRepository.findById(patientId);
    }

    async updatePatient(patientId, updateData) {
        return await patientRepository.update(patientId, updateData);
    }
    async getPatientByResetToken(token) {
        return await patientRepository.findByResetToken(token);
    }

    async deletePatient(patientId) {
        return await patientRepository.delete(patientId);
    }
}

module.exports = new PatientService();
// 
