const catchAsync = require("../../shared/http/catchAsync");
const response = require("../../shared/http/response");
const AppError = require("../../shared/errors/AppError");
const { signToken } = require("../../shared/auth/token");
const { Validator, cleanString, normalizeEmail, normalizePhone } = require("../../shared/utils/validation");
const patientService = require("./patient.service");

const validateLocation = (v, location) => {
    if (location === undefined || location === null) return;
    if (typeof location !== "object" || Array.isArray(location)) {
        v.add("location", "Location must include a city and/or state");
        return;
    }
    v.text(location.city, "location.city", { label: "City", max: 60 });
    v.text(location.state, "location.state", { label: "State", max: 60 });
};

const cleanLocation = (location) =>
    location ? { city: cleanString(location.city) || undefined, state: cleanString(location.state) || undefined } : undefined;

const register = catchAsync(async (req, res) => {
    const { name, email, password, gender, phoneNumber, location } = req.body;
    const v = new Validator();
    v.name(name);
    v.email(email);
    v.password(password);
    v.gender(gender);
    v.phone(phoneNumber, "phoneNumber", { required: false });
    validateLocation(v, location);
    v.throwIfInvalid();

    const patient = await patientService.register({
        name: name.trim(),
        email: normalizeEmail(email),
        password,
        gender: gender.trim().toLowerCase(),
        phoneNumber: phoneNumber ? normalizePhone(phoneNumber) : undefined,
        location: cleanLocation(location),
    });

    response(res, 201, "success", "Your account has been created", {
        token: signToken(patient, "patient"),
        role: "patient",
        user: patient,
    });
});

const getMe = (req, res) => {
    response(res, 200, "success", "Your profile", req.user);
};

const updateMe = catchAsync(async (req, res) => {
    const { name, gender, phoneNumber, location } = req.body;
    const v = new Validator();
    v.name(name, "name", { required: false });
    v.gender(gender, "gender", { required: false });
    v.phone(phoneNumber, "phoneNumber", { required: false });
    validateLocation(v, location);
    v.throwIfInvalid();

    const set = {};
    const unset = {};
    if (name !== undefined) set.name = name.trim();
    if (gender !== undefined) set.gender = gender.trim().toLowerCase();
    if (phoneNumber !== undefined) {
        if (phoneNumber) set.phoneNumber = normalizePhone(phoneNumber);
        else unset.phoneNumber = 1;
    }
    if (location !== undefined) set.location = cleanLocation(location) || {};

    const patient = await patientService.updateProfile(req.user._id, { set, unset });
    response(res, 200, "success", "Profile updated", patient);
});

const updatePhoto = catchAsync(async (req, res) => {
    if (!req.file) throw AppError.validation({ photo: "Please choose a photo to upload" });
    const patient = await patientService.updatePhoto(req.user._id, req.file);
    response(res, 200, "success", "Photo updated", patient);
});

module.exports = { register, getMe, updateMe, updatePhoto };
