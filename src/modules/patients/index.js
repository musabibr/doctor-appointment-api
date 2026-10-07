// Patients module: patient accounts and profiles.
const router = require("./patient.routes");
const patientService = require("./patient.service");
const Patient = require("./patient.model");
const { createAccountProvider } = require("../../shared/auth/accountProvider");

module.exports = {
    name: "patients",
    routes: [{ path: "/api/v1/patients", router }],
    accountProvider: createAccountProvider(Patient),

    // Public API
    listPatients: (query) => patientService.list(query),
    countPatients: () => patientService.count(),
    deletePatient: (patientId) => patientService.remove(patientId),
};
