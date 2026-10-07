const catchAsync = require("../../shared/http/catchAsync");
const response = require("../../shared/http/response");
const AppError = require("../../shared/errors/AppError");
const { Validator, cleanString, normalizeEmail, normalizePhone } = require("../../shared/utils/validation");
const doctorService = require("./doctor.service");
const availabilityService = require("./availability.service");
const clinicService = require("./clinic.service");

// On registration every core field is required; on update, a field that is sent
// must still be valid (it cannot be blanked out).
const validateProfileFields = (v, body, { required }) => {
    const need = (field) => required || body[field] !== undefined;
    v.name(body.name, "name", { required: need("name") });
    v.gender(body.gender, "gender", { required: need("gender") });
    v.phone(body.phoneNumber, "phoneNumber", { required: need("phoneNumber") });
    v.text(body.address, "address", { label: "Address", min: 5, max: 200, required: need("address") });
    v.text(body.specialty, "specialty", { label: "Specialty", min: 2, max: 60, required: need("specialty") });
    v.text(body.about, "about", { label: "About", max: 1000 });
    v.number(body.price, "price", { label: "Price", min: 0, max: 100000 });
    v.number(body.discount, "discount", { label: "Discount", min: 0, max: 100, integer: true });
};

const profileChanges = (body) => {
    const changes = {};
    if (body.name !== undefined) changes.name = body.name.trim();
    if (body.gender !== undefined) changes.gender = body.gender.trim().toLowerCase();
    if (body.phoneNumber !== undefined) changes.phoneNumber = normalizePhone(body.phoneNumber);
    if (body.address !== undefined) changes.address = body.address.trim();
    if (body.specialty !== undefined) changes.specialty = body.specialty.trim();
    if (body.about !== undefined) changes.about = cleanString(body.about) || "";
    if (body.price !== undefined && body.price !== "") changes.price = Number(body.price);
    if (body.discount !== undefined && body.discount !== "") changes.discount = Number(body.discount);
    return changes;
};

// ----- Public -----

const register = catchAsync(async (req, res) => {
    const body = req.body || {};
    const files = req.files || {};
    const v = new Validator();
    v.email(body.email);
    v.password(body.password);
    validateProfileFields(v, body, { required: true });
    v.check(Boolean(files.medicalLicense), "medicalLicense", "Upload your medical license");
    v.check(Boolean(files.personalID), "personalID", "Upload your personal ID");
    v.throwIfInvalid();

    const doctor = await doctorService.register(
        { ...profileChanges(body), email: normalizeEmail(body.email), password: body.password },
        {
            medicalLicense: files.medicalLicense[0],
            personalID: files.personalID[0],
            photo: files.photo ? files.photo[0] : null,
        }
    );

    response(res, 201, "success", "Account created. Enter the 6-digit code we sent to your email.", {
        email: doctor.email,
    });
});

const search = catchAsync(async (req, res) => {
    const result = await doctorService.search(req.query);
    response(res, 200, "success", "Doctors", result);
});

const specialties = catchAsync(async (req, res) => {
    response(res, 200, "success", "Specialties", await doctorService.listSpecialties());
});

const getPublicProfile = catchAsync(async (req, res) => {
    response(res, 200, "success", "Doctor", await doctorService.getPublicProfile(req.params.id));
});

const searchClinics = catchAsync(async (req, res) => {
    response(res, 200, "success", "Clinics", await clinicService.search(req.query));
});

// ----- Signed-in doctor -----

const getMe = catchAsync(async (req, res) => {
    response(res, 200, "success", "Your profile", await doctorService.getOwnProfile(req.user._id));
});

const updateMe = catchAsync(async (req, res) => {
    const v = new Validator();
    validateProfileFields(v, req.body, { required: false });
    v.throwIfInvalid();
    const doctor = await doctorService.updateProfile(req.user._id, profileChanges(req.body));
    response(res, 200, "success", "Profile updated", doctor);
});

const updatePhoto = catchAsync(async (req, res) => {
    if (!req.file) throw AppError.validation({ photo: "Please choose a photo to upload" });
    response(res, 200, "success", "Photo updated", await doctorService.updatePhoto(req.user._id, req.file));
});

const saveClinic = catchAsync(async (req, res) => {
    const { name, services } = req.body;
    const location = req.body.location || {};
    const contact = req.body.contact || {};
    const v = new Validator();
    v.text(name, "name", { label: "Clinic name", min: 2, max: 80, required: true });
    v.text(location.city, "location.city", { label: "City", min: 2, max: 60, required: true });
    v.text(location.state, "location.state", { label: "State", min: 2, max: 60, required: true });
    v.text(location.address, "location.address", { label: "Street address", max: 200 });
    v.phone(contact.phone, "contact.phone");
    if (contact.email) v.email(contact.email, "contact.email");

    const serviceList = (Array.isArray(services) ? services : typeof services === "string" ? services.split(",") : [])
        .map((s) => (typeof s === "string" ? s.trim() : ""))
        .filter(Boolean);
    v.check(serviceList.length <= 20, "services", "List at most 20 services");
    v.check(serviceList.every((s) => s.length <= 60), "services", "Each service must be at most 60 characters");
    v.throwIfInvalid();

    const clinic = await clinicService.saveForDoctor(req.user._id, {
        name: name.trim(),
        location: { city: location.city.trim(), state: location.state.trim(), address: cleanString(location.address) },
        contact: { phone: normalizePhone(contact.phone), email: contact.email ? normalizeEmail(contact.email) : undefined },
        services: serviceList,
    });
    response(res, 200, "success", "Clinic saved", clinic);
});

const listAvailability = catchAsync(async (req, res) => {
    response(res, 200, "success", "Your availability", await availabilityService.list(req.user._id));
});

const addAvailability = catchAsync(async (req, res) => {
    const availability = await availabilityService.add(req.user._id, req.body);
    response(res, 201, "success", "Availability added", availability);
});

const updateAvailability = catchAsync(async (req, res) => {
    const day = await availabilityService.update(req.user._id, req.params.availabilityId, req.body);
    response(res, 200, "success", "Availability updated", day);
});

const deleteAvailability = catchAsync(async (req, res) => {
    await availabilityService.remove(req.user._id, req.params.availabilityId);
    response(res, 200, "success", "Availability removed");
});

module.exports = {
    register,
    search,
    specialties,
    getPublicProfile,
    searchClinics,
    getMe,
    updateMe,
    updatePhoto,
    saveClinic,
    listAvailability,
    addAvailability,
    updateAvailability,
    deleteAvailability,
};
