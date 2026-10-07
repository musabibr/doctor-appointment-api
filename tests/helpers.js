// Shared test setup. Must be required before anything from src/.
const fs = require("fs");
const os = require("os");
const path = require("path");
const assert = require("node:assert/strict");

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret-that-is-long-enough-for-the-test-suite";
process.env.UPLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "doctorri-test-uploads-"));

const mongoose = require("mongoose");
const request = require("supertest");
const app = require("../src/app");
const { outbox } = require("../src/shared/email/email");
const { todayKey, addDays } = require("../src/shared/utils/time");
const admin = require("../src/modules/admin");

let memoryServer = null;

// Uses TEST_MONGODB_URI when set (e.g. a local MongoDB); otherwise starts an
// in-memory MongoDB (downloaded once by mongodb-memory-server).
const startDatabase = async () => {
    let uri = process.env.TEST_MONGODB_URI;
    if (!uri) {
        const { MongoMemoryServer } = require("mongodb-memory-server");
        memoryServer = await MongoMemoryServer.create();
        uri = memoryServer.getUri();
    }
    await mongoose.connect(uri, { dbName: `doctorri_test_${process.pid}_${Date.now()}` });
    // Make sure unique indexes exist before the tests rely on them.
    await Promise.all(Object.values(mongoose.models).map((Model) => Model.init()));
};

const stopDatabase = async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
    if (memoryServer) await memoryServer.stop();
    fs.rmSync(process.env.UPLOAD_DIR, { recursive: true, force: true });
};

const resetDatabase = async () => {
    const collections = await mongoose.connection.db.collections();
    await Promise.all(collections.map((collection) => collection.deleteMany({})));
    outbox.length = 0;
};

const api = () => request(app);
const bearer = (token) => ({ Authorization: `Bearer ${token}` });

let counter = 0;
const unique = () => `${Date.now()}${++counter}`;
let phoneCounter = 0;
const uniquePhone = () => `+24990${String(++phoneCounter).padStart(7, "0")}`;

// A valid 1x1 PNG and a tiny PDF, for upload tests.
const PNG = Buffer.from(
    "89504e470d0a1a0a0000000d4948445200000001000000010806000000" +
        "1f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082",
    "hex"
);
const PDF = Buffer.from("%PDF-1.4\n% test document\n");

const createPatient = async (overrides = {}) => {
    const body = {
        name: "Test Patient",
        email: `patient${unique()}@example.com`,
        password: "Patient123",
        gender: "female",
        ...overrides,
    };
    const res = await api().post("/api/v1/patients/register").send(body);
    assert.equal(res.status, 201, JSON.stringify(res.body));
    return { token: res.body.data.token, user: res.body.data.user, email: body.email, password: body.password };
};

const createAdmin = async () => {
    const email = `admin${unique()}@example.com`;
    await admin.createOrUpdateAdmin({ name: "Test Admin", email, password: "Admin12345" });
    const res = await api().post("/api/v1/auth/login").send({ role: "admin", email, password: "Admin12345" });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    return { token: res.body.data.token, user: res.body.data.user };
};

const registerDoctor = async (overrides = {}, { withFiles = true } = {}) => {
    const fields = {
        name: "Test Doctor",
        email: `doctor${unique()}@example.com`,
        password: "Doctor123",
        gender: "male",
        phoneNumber: uniquePhone(),
        address: "12 Clinic Street, Khartoum",
        specialty: "Cardiology",
        about: "Heart specialist.",
        price: "100",
        discount: "0",
        ...overrides,
    };
    let req = api().post("/api/v1/doctors/register");
    for (const [key, value] of Object.entries(fields)) req = req.field(key, value);
    if (withFiles) {
        req = req
            .attach("medicalLicense", PDF, { filename: "license.pdf", contentType: "application/pdf" })
            .attach("personalID", PNG, { filename: "id.png", contentType: "image/png" });
    }
    return { res: await req, fields };
};

const latestOtp = (email) => {
    const message = [...outbox].reverse().find((m) => m.to === email && m.template === "otp");
    return message ? message.locals.code : null;
};

// Registers a doctor, verifies the email and (unless approve=false) approves the account.
const createDoctor = async (adminToken, overrides = {}, { approve = true } = {}) => {
    const { res, fields } = await registerDoctor(overrides);
    assert.equal(res.status, 201, JSON.stringify(res.body));
    const verify = await api()
        .post("/api/v1/auth/verify-email")
        .send({ email: fields.email, code: latestOtp(fields.email) });
    assert.equal(verify.status, 200, JSON.stringify(verify.body));
    const id = verify.body.data.user._id;
    if (approve) {
        const approved = await api().patch(`/api/v1/admin/doctors/${id}/approve`).set(bearer(adminToken));
        assert.equal(approved.status, 200, JSON.stringify(approved.body));
    }
    return { token: verify.body.data.token, id, email: fields.email, fields };
};

// Adds a day of availability `offset` days from today and returns its ids.
const addDay = async (doctorToken, { offset = 1, slots = [{ start: "09:00", end: "12:00", maxPatients: 2 }] } = {}) => {
    const date = addDays(todayKey(), offset);
    const res = await api().post("/api/v1/doctors/me/availability").set(bearer(doctorToken)).send({ date, slots });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    const day = res.body.data.find((d) => d.date === date);
    return { date, availabilityId: day._id, slotId: day.slots[0]._id, slots: day.slots };
};

const book = (patientToken, doctorId, { availabilityId, slotId }, extra = {}) =>
    api()
        .post("/api/v1/appointments")
        .set(bearer(patientToken))
        .send({ doctorId, availabilityId, slotId, ...extra });

// Remaining seats in a slot, read from the doctor's public profile.
const remainingSeats = async (doctorId, slotId) => {
    const res = await api().get(`/api/v1/doctors/${doctorId}`);
    for (const day of res.body.data.availability) {
        const slot = day.slots.find((s) => s._id === slotId);
        if (slot) return slot.remaining;
    }
    return null;
};

module.exports = {
    startDatabase,
    stopDatabase,
    resetDatabase,
    api,
    bearer,
    unique,
    outbox,
    PNG,
    PDF,
    createPatient,
    createAdmin,
    registerDoctor,
    latestOtp,
    createDoctor,
    addDay,
    book,
    remainingSeats,
};
