const { describe, test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const helpers = require("./helpers");
const { todayKey, addDays } = require("../src/shared/utils/time");

const { api, bearer, outbox } = helpers;

before(helpers.startDatabase);
after(helpers.stopDatabase);
beforeEach(helpers.resetDatabase);

describe("doctor registration", () => {
    test("requires the verification documents", async () => {
        const { res } = await helpers.registerDoctor({}, { withFiles: false });
        assert.equal(res.status, 400);
        assert.ok(res.body.errors.medicalLicense);
        assert.ok(res.body.errors.personalID);
    });

    test("rejects a file whose content does not match its type", async () => {
        const res = await api()
            .post("/api/v1/doctors/register")
            .field("name", "Fake Files")
            .attach("medicalLicense", Buffer.from("<script>alert(1)</script>"), {
                filename: "license.png",
                contentType: "image/png",
            });
        assert.equal(res.status, 400);
        assert.match(res.body.message, /not a valid image\/png file/);
    });

    test("must verify the email before logging in", async () => {
        const { res, fields } = await helpers.registerDoctor();
        assert.equal(res.status, 201);
        assert.ok(helpers.latestOtp(fields.email), "an OTP email was sent");

        const login = await api()
            .post("/api/v1/auth/login")
            .send({ role: "doctor", email: fields.email, password: fields.password });
        assert.equal(login.status, 403);
        assert.equal(login.body.code, "EMAIL_NOT_VERIFIED");

        const wrong = await api().post("/api/v1/auth/verify-email").send({ email: fields.email, code: "000000" });
        assert.equal(wrong.status, 400);
        assert.match(wrong.body.message, /4 attempts left/);

        const verified = await api()
            .post("/api/v1/auth/verify-email")
            .send({ email: fields.email, code: helpers.latestOtp(fields.email) });
        assert.equal(verified.status, 200);
        assert.equal(verified.body.data.user.approvalStatus, "pending");

        const again = await api()
            .post("/api/v1/auth/login")
            .send({ role: "doctor", email: fields.email, password: fields.password });
        assert.equal(again.status, 200);
    });

    test("invalidates the code after too many wrong attempts", async () => {
        const { fields } = await helpers.registerDoctor();
        let res;
        for (let i = 0; i < 5; i++) {
            res = await api().post("/api/v1/auth/verify-email").send({ email: fields.email, code: "000000" });
        }
        assert.match(res.body.message, /Too many incorrect attempts/);
        const late = await api()
            .post("/api/v1/auth/verify-email")
            .send({ email: fields.email, code: helpers.latestOtp(fields.email) });
        assert.equal(late.status, 400);
    });

    test("rate-limits resending the code", async () => {
        const { fields } = await helpers.registerDoctor();
        const res = await api().post("/api/v1/auth/resend-verification").send({ email: fields.email });
        assert.equal(res.status, 429);
    });
});

describe("approval", () => {
    test("pending doctors cannot publish availability and are hidden from patients", async () => {
        const admin = await helpers.createAdmin();
        const doctor = await helpers.createDoctor(admin.token, {}, { approve: false });

        const add = await api()
            .post("/api/v1/doctors/me/availability")
            .set(bearer(doctor.token))
            .send({ date: addDays(todayKey(), 1), slots: [{ start: "09:00", end: "10:00", maxPatients: 1 }] });
        assert.equal(add.status, 403);
        assert.equal(add.body.code, "DOCTOR_NOT_APPROVED");

        assert.equal((await api().get("/api/v1/doctors")).body.data.total, 0);
        assert.equal((await api().get(`/api/v1/doctors/${doctor.id}`)).status, 404);

        await api().patch(`/api/v1/admin/doctors/${doctor.id}/approve`).set(bearer(admin.token)).expect(200);
        assert.equal((await api().get("/api/v1/doctors")).body.data.total, 1);
        assert.ok(outbox.some((m) => m.to === doctor.email && /approved/.test(m.subject)));
    });

    test("rejected doctors see the reason", async () => {
        const admin = await helpers.createAdmin();
        const doctor = await helpers.createDoctor(admin.token, {}, { approve: false });

        const noReason = await api().patch(`/api/v1/admin/doctors/${doctor.id}/reject`).set(bearer(admin.token)).send({});
        assert.equal(noReason.status, 400);

        await api()
            .patch(`/api/v1/admin/doctors/${doctor.id}/reject`)
            .set(bearer(admin.token))
            .send({ reason: "The license image is not readable" })
            .expect(200);
        const me = await api().get("/api/v1/doctors/me").set(bearer(doctor.token));
        assert.equal(me.body.data.approvalStatus, "rejected");
        assert.equal(me.body.data.rejectionReason, "The license image is not readable");
    });

    test("only admins see the verification documents", async () => {
        const admin = await helpers.createAdmin();
        const doctor = await helpers.createDoctor(admin.token);

        const asAdmin = await api().get(`/api/v1/admin/doctors/${doctor.id}`).set(bearer(admin.token));
        assert.match(asAdmin.body.data.medicalLicense, /^\/uploads\/documents\/.+\.pdf$/);
        assert.match(asAdmin.body.data.personalID, /^\/uploads\/documents\/.+\.png$/);

        const publicProfile = await api().get(`/api/v1/doctors/${doctor.id}`);
        const own = await api().get("/api/v1/doctors/me").set(bearer(doctor.token));
        for (const body of [publicProfile.body.data, own.body.data]) {
            assert.equal(body.medicalLicense, undefined);
            assert.equal(body.personalID, undefined);
            assert.equal(body.password, undefined);
        }
        assert.equal(publicProfile.body.data.email, undefined);
    });
});

describe("availability", () => {
    let admin;
    let doctor;
    beforeEach(async () => {
        admin = await helpers.createAdmin();
        doctor = await helpers.createDoctor(admin.token);
    });

    const add = (body) => api().post("/api/v1/doctors/me/availability").set(bearer(doctor.token)).send(body);

    test("validates dates and slots", async () => {
        const tomorrow = addDays(todayKey(), 1);
        assert.equal((await add({ date: addDays(todayKey(), -1), slots: [{ start: "09:00", end: "10:00", maxPatients: 1 }] })).status, 400);
        assert.equal((await add({ date: tomorrow, slots: [] })).status, 400);
        assert.equal((await add({ date: tomorrow, slots: [{ start: "10:00", end: "09:00", maxPatients: 1 }] })).status, 400);
        const overlap = await add({
            date: tomorrow,
            slots: [
                { start: "09:00", end: "11:00", maxPatients: 1 },
                { start: "10:30", end: "12:00", maxPatients: 1 },
            ],
        });
        assert.equal(overlap.status, 400);
        assert.match(Object.values(overlap.body.errors)[0], /Overlaps/);
    });

    test("one entry per date, editable and removable", async () => {
        const day = await helpers.addDay(doctor.token, { offset: 2 });
        const duplicate = await add({ date: day.date, slots: [{ start: "13:00", end: "14:00", maxPatients: 1 }] });
        assert.equal(duplicate.status, 409);

        const update = await api()
            .patch(`/api/v1/doctors/me/availability/${day.availabilityId}`)
            .set(bearer(doctor.token))
            .send({
                slots: [
                    { _id: day.slotId, start: "09:00", end: "12:00", maxPatients: 6 },
                    { start: "14:00", end: "16:00", maxPatients: 3 },
                ],
            });
        assert.equal(update.status, 200, JSON.stringify(update.body));
        assert.equal(update.body.data.slots.length, 2);
        assert.equal(update.body.data.slots[0]._id, day.slotId);
        assert.equal(update.body.data.slots[0].maxPatients, 6);

        await api()
            .delete(`/api/v1/doctors/me/availability/${day.availabilityId}`)
            .set(bearer(doctor.token))
            .expect(200);
        const list = await api().get("/api/v1/doctors/me/availability").set(bearer(doctor.token));
        assert.equal(list.body.data.length, 0);
    });

    test("booked slots are protected from destructive edits", async () => {
        const day = await helpers.addDay(doctor.token, { offset: 2, slots: [{ start: "09:00", end: "12:00", maxPatients: 3 }] });
        const patient = await helpers.createPatient();
        await helpers.book(patient.token, doctor.id, day).expect(201);

        const patch = (slots, extra = {}) =>
            api()
                .patch(`/api/v1/doctors/me/availability/${day.availabilityId}`)
                .set(bearer(doctor.token))
                .send({ slots, ...extra });

        assert.equal((await patch([{ _id: day.slotId, start: "10:00", end: "12:00", maxPatients: 3 }])).status, 409);
        assert.equal((await patch([{ _id: day.slotId, start: "09:00", end: "12:00", maxPatients: 0 }])).status, 400);
        assert.equal((await patch([{ start: "13:00", end: "14:00", maxPatients: 2 }])).status, 409);
        assert.equal(
            (await patch([{ _id: day.slotId, start: "09:00", end: "12:00", maxPatients: 3 }], { date: addDays(todayKey(), 3) })).status,
            409
        );
        assert.equal((await patch([{ _id: day.slotId, start: "09:00", end: "12:00", maxPatients: 5 }])).status, 200);

        const remove = await api()
            .delete(`/api/v1/doctors/me/availability/${day.availabilityId}`)
            .set(bearer(doctor.token));
        assert.equal(remove.status, 409);
    });
});

describe("search", () => {
    test("filters by name, specialty, city and date and paginates", async () => {
        const admin = await helpers.createAdmin();
        const cardio = await helpers.createDoctor(admin.token, { name: "Amina Yousif", specialty: "Cardiology", price: "150" });
        const derma = await helpers.createDoctor(admin.token, { name: "Khalid Osman", specialty: "Dermatology", price: "90" });

        await api()
            .put("/api/v1/doctors/me/clinic")
            .set(bearer(cardio.token))
            .send({
                name: "Nile Heart Center",
                location: { city: "Khartoum", state: "Khartoum" },
                contact: { phone: "+249912345678" },
                services: "ECG, Echo",
            })
            .expect(200);
        const day = await helpers.addDay(cardio.token, { offset: 3 });

        const search = async (query) => (await api().get("/api/v1/doctors").query(query)).body.data;

        assert.deepEqual((await search({ q: "amina" })).items.map((d) => d._id), [cardio.id]);
        assert.deepEqual((await search({ specialty: "derma" })).items.map((d) => d._id), [derma.id]);
        assert.deepEqual((await search({ city: "khartoum" })).items.map((d) => d._id), [cardio.id]);
        assert.deepEqual((await search({ date: day.date })).items.map((d) => d._id), [cardio.id]);
        assert.deepEqual((await search({ sort: "price_asc" })).items.map((d) => d._id), [derma.id, cardio.id]);
        assert.equal((await search({ q: ".*" })).total, 0, "user input is not treated as a regex");

        const page = await search({ limit: 1, page: 2, sort: "name" });
        assert.equal(page.total, 2);
        assert.equal(page.pages, 2);
        assert.equal(page.items[0]._id, derma.id);

        const card = (await search({ q: "amina" })).items[0];
        assert.equal(card.clinic.name, "Nile Heart Center");
        assert.equal(card.nextAvailableDate, day.date);

        const specialties = await api().get("/api/v1/doctors/specialties");
        assert.deepEqual(specialties.body.data, ["Cardiology", "Dermatology"]);

        assert.equal((await api().get("/api/v1/doctors").query({ date: "tomorrow" })).status, 400);
    });
});
