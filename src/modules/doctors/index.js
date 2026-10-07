// Doctors module: doctor accounts, public profiles and search, clinics,
// availability and the seats that bookings take from it.
const { doctorsRouter, clinicsRouter } = require("./doctor.routes");
const doctorService = require("./doctor.service");
const availabilityService = require("./availability.service");
const { requireApprovedDoctor } = require("./doctor.middleware");
const { registerEventHandlers } = require("./doctor.events");
const Doctor = require("./doctor.model");
const AppError = require("../../shared/errors/AppError");
const { createAccountProvider } = require("../../shared/auth/accountProvider");

const accountProvider = createAccountProvider(Doctor, {
    requiresEmailVerification: true,
    markEmailVerified: (id) => Doctor.updateOne({ _id: id }, { $set: { isVerified: true } }),
    assertCanAccess: (doctor) => {
        if (!doctor.isVerified) throw AppError.forbidden("Please verify your email first", "EMAIL_NOT_VERIFIED");
    },
});

module.exports = {
    name: "doctors",
    routes: [
        { path: "/api/v1/doctors", router: doctorsRouter },
        { path: "/api/v1/clinics", router: clinicsRouter },
    ],
    accountProvider,
    registerEventHandlers,

    // Public API
    requireApprovedDoctor,
    getBookableSlot: (args) => availabilityService.getBookableSlot(args),
    reserveSeat: (args) => availabilityService.reserveSeat(args),
    releaseSeat: (args) => availabilityService.releaseSeat(args),
    listDoctorsForAdmin: (query) => doctorService.listForAdmin(query),
    getDoctorForAdmin: (doctorId) => doctorService.getForAdmin(doctorId),
    approveDoctor: (doctorId) => doctorService.approve(doctorId),
    rejectDoctor: (doctorId, reason) => doctorService.reject(doctorId, reason),
    deleteDoctor: (doctorId) => doctorService.remove(doctorId),
    countDoctorsByStatus: () => doctorService.countByStatus(),
};
