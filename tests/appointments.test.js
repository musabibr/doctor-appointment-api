const { describe, test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const helpers = require("./helpers");
const Appointment = require("../src/modules/appointments/appointment.model");
const { todayKey, addDays, parseDateKey } = require("../src/shared/utils/time");

const { api, bearer, outbox } = helpers;

before(helpers.startDatabase);
after(helpers.stopDatabase);

let admin;
let doctor;
let otherDoctor;
let patient;
let otherPatient;
let day;

beforeEach(async () => {
    await helpers.resetDatabase();
    admin = await helpers.createAdmin();
    doctor = await helpers.createDoctor(admin.token, { name: "Amina Yousif", price: "200", discount: "10" });
    otherDoctor = await helpers.createDoctor(admin.token, { name: "Khalid Osman" });
    patient = await helpers.createPatient({ name: "Sara Ahmed" });
    otherPatient = await helpers.createPatient({ name: "Omar Khalid" });
    day = await helpers.addDay(doctor.token, { offset: 1, slots: [{ start: "09:00", end: "12:00", maxPatients: 2 }] });
});

const patchAs = (token, id, action, body = {}) =>
    api().patch(`/api/v1/appointments/${id}/${action}`).set(bearer(token)).send(body);

// Moves an appointment into the past, as if its day had come and gone.
const moveToYesterday = (id) =>
    Appointment.updateOne({ _id: id }, { $set: { appointmentDate: parseDateKey(addDays(todayKey(), -1)) } });

describe("booking", () => {
    test("books a seat at the discounted price and notifies the doctor", async () => {
        const res = await helpers.book(patient.token, doctor.id, day, { reasonForVisit: "Chest pain" });
        assert.equal(res.status, 201, JSON.stringify(res.body));
        const appointment = res.body.data;
        assert.equal(appointment.status, "pending");
        assert.equal(appointment.price, 180);
        assert.equal(appointment.appointmentHour, "09:00");
        assert.equal(appointment.doctor.name, "Amina Yousif");
        assert.equal(await helpers.remainingSeats(doctor.id, day.slotId), 1);
        assert.ok(outbox.some((m) => m.to === doctor.email && m.subject === "New appointment request"));
    });

    test("refuses a second booking in the same slot", async () => {
        await helpers.book(patient.token, doctor.id, day).expect(201);
        const again = await helpers.book(patient.token, doctor.id, day);
        assert.equal(again.status, 409);
        assert.equal(again.body.code, "DUPLICATE_BOOKING");
    });

    test("never overbooks a slot, even with simultaneous requests", async () => {
        const patients = await Promise.all([1, 2, 3, 4, 5].map((i) => helpers.createPatient({ name: `Patient ${"x".repeat(i)}` })));
        const results = await Promise.all(patients.map((p) => helpers.book(p.token, doctor.id, day)));
        const statuses = results.map((r) => r.status).sort();
        assert.deepEqual(statuses, [201, 201, 409, 409, 409]);
        assert.equal(await helpers.remainingSeats(doctor.id, day.slotId), 0);
        assert.equal(await Appointment.countDocuments({ slot: day.slotId }), 2);
    });

    test("only patients can book, and only real slots of approved doctors", async () => {
        assert.equal((await helpers.book(doctor.token, doctor.id, day)).status, 403);
        assert.equal((await helpers.book(patient.token, otherDoctor.id, day)).status, 404);

        const pending = await helpers.createDoctor(admin.token, {}, { approve: false });
        assert.equal((await helpers.book(patient.token, pending.id, day)).status, 404);

        const invalid = await api().post("/api/v1/appointments").set(bearer(patient.token)).send({ doctorId: "nope" });
        assert.equal(invalid.status, 400);
        assert.ok(invalid.body.errors.doctorId);
    });
});

describe("lifecycle", () => {
    test("pending -> confirmed -> completed -> reviewed", async () => {
        const booked = (await helpers.book(patient.token, doctor.id, day).expect(201)).body.data;

        const confirmed = await patchAs(doctor.token, booked._id, "confirm");
        assert.equal(confirmed.status, 200);
        assert.equal(confirmed.body.data.status, "confirmed");
        assert.ok(outbox.some((m) => m.to === patient.email && /confirmed/.test(m.subject)));

        const tooEarly = await patchAs(doctor.token, booked._id, "complete");
        assert.equal(tooEarly.status, 400);

        const earlyReview = await api()
            .post("/api/v1/reviews")
            .set(bearer(patient.token))
            .send({ appointmentId: booked._id, rating: 5 });
        assert.equal(earlyReview.status, 400);

        await moveToYesterday(booked._id);
        const completed = await patchAs(doctor.token, booked._id, "complete", { doctorNotes: "All good" });
        assert.equal(completed.status, 200);
        assert.equal(completed.body.data.status, "completed");
        assert.equal(completed.body.data.doctorNotes, "All good");

        const review = await api()
            .post("/api/v1/reviews")
            .set(bearer(patient.token))
            .send({ appointmentId: booked._id, rating: 4, comment: "Very attentive" });
        assert.equal(review.status, 201, JSON.stringify(review.body));

        const duplicate = await api()
            .post("/api/v1/reviews")
            .set(bearer(patient.token))
            .send({ appointmentId: booked._id, rating: 1 });
        assert.equal(duplicate.status, 409);

        const profile = (await api().get(`/api/v1/doctors/${doctor.id}`)).body.data;
        assert.equal(profile.ratingAverage, 4);
        assert.equal(profile.ratingCount, 1);

        const reviews = (await api().get(`/api/v1/reviews/doctor/${doctor.id}`)).body.data;
        assert.equal(reviews.total, 1);
        assert.equal(reviews.items[0].patient.name, "Sara Ahmed");

        const history = (await api().get("/api/v1/appointments?scope=history").set(bearer(patient.token))).body.data;
        assert.equal(history.items[0].review, review.body.data._id);

        await api().delete(`/api/v1/reviews/${review.body.data._id}`).set(bearer(patient.token)).expect(200);
        const after = (await api().get(`/api/v1/doctors/${doctor.id}`)).body.data;
        assert.equal(after.ratingCount, 0);
    });

    test("declining and canceling give the seat back", async () => {
        const first = (await helpers.book(patient.token, doctor.id, day).expect(201)).body.data;
        const second = (await helpers.book(otherPatient.token, doctor.id, day).expect(201)).body.data;
        assert.equal(await helpers.remainingSeats(doctor.id, day.slotId), 0);

        const declined = await patchAs(doctor.token, first._id, "decline", { reason: "Fully booked that morning" });
        assert.equal(declined.body.data.status, "declined");
        assert.equal(await helpers.remainingSeats(doctor.id, day.slotId), 1);

        const canceled = await patchAs(otherPatient.token, second._id, "cancel", { reason: "Feeling better" });
        assert.equal(canceled.body.data.status, "canceled");
        assert.equal(canceled.body.data.canceledBy, "patient");
        assert.equal(await helpers.remainingSeats(doctor.id, day.slotId), 2);
        assert.ok(outbox.some((m) => m.to === doctor.email && m.subject === "Appointment canceled"));

        assert.equal((await patchAs(otherPatient.token, second._id, "cancel")).status, 409);
        assert.equal((await patchAs(doctor.token, first._id, "confirm")).status, 409);
        assert.equal(await helpers.remainingSeats(doctor.id, day.slotId), 2, "seats are released only once");
    });

    test("doctors can cancel confirmed appointments too", async () => {
        const booked = (await helpers.book(patient.token, doctor.id, day).expect(201)).body.data;
        await patchAs(doctor.token, booked._id, "confirm").expect(200);
        const canceled = await patchAs(doctor.token, booked._id, "cancel", { reason: "Emergency" });
        assert.equal(canceled.status, 200);
        assert.equal(canceled.body.data.canceledBy, "doctor");
        assert.ok(outbox.some((m) => m.to === patient.email && m.subject === "Appointment canceled"));
    });
});

describe("ownership", () => {
    test("people can only see and change their own appointments", async () => {
        const booked = (await helpers.book(patient.token, doctor.id, day).expect(201)).body.data;

        assert.equal((await api().get(`/api/v1/appointments/${booked._id}`).set(bearer(otherPatient.token))).status, 404);
        assert.equal((await api().get(`/api/v1/appointments/${booked._id}`).set(bearer(otherDoctor.token))).status, 404);
        assert.equal((await api().get(`/api/v1/appointments/${booked._id}`).set(bearer(doctor.token))).status, 200);

        assert.equal((await patchAs(otherPatient.token, booked._id, "cancel")).status, 404);
        assert.equal((await patchAs(otherDoctor.token, booked._id, "confirm")).status, 404);
        assert.equal((await patchAs(otherDoctor.token, booked._id, "decline")).status, 404);
        assert.equal((await patchAs(patient.token, booked._id, "confirm")).status, 403);

        const theirs = (await api().get("/api/v1/appointments").set(bearer(otherPatient.token))).body.data;
        assert.equal(theirs.total, 0);
    });

    test("only the patient who had the visit can review it, and only the doctor reviewed can report it", async () => {
        const booked = (await helpers.book(patient.token, doctor.id, day).expect(201)).body.data;
        await patchAs(doctor.token, booked._id, "confirm").expect(200);
        await moveToYesterday(booked._id);
        await patchAs(doctor.token, booked._id, "complete").expect(200);

        const stranger = await api()
            .post("/api/v1/reviews")
            .set(bearer(otherPatient.token))
            .send({ appointmentId: booked._id, rating: 1 });
        assert.equal(stranger.status, 404);

        const review = (
            await api().post("/api/v1/reviews").set(bearer(patient.token)).send({ appointmentId: booked._id, rating: 2, comment: "Meh" })
        ).body.data;

        assert.equal((await api().delete(`/api/v1/reviews/${review._id}`).set(bearer(otherPatient.token))).status, 404);

        const wrongDoctor = await api()
            .post(`/api/v1/reviews/${review._id}/report`)
            .set(bearer(otherDoctor.token))
            .send({ reason: "Not my patient" });
        assert.equal(wrongDoctor.status, 404);

        const reported = await api()
            .post(`/api/v1/reviews/${review._id}/report`)
            .set(bearer(doctor.token))
            .send({ reason: "This is not what happened" });
        assert.equal(reported.status, 200);

        const list = (await api().get("/api/v1/admin/reviews/reported").set(bearer(admin.token))).body.data;
        assert.equal(list.total, 1);
        assert.equal(list.items[0].reportReason, "This is not what happened");

        await api().patch(`/api/v1/admin/reviews/${review._id}/dismiss`).set(bearer(admin.token)).expect(200);
        assert.equal((await api().get("/api/v1/admin/reviews/reported").set(bearer(admin.token))).body.data.total, 0);

        await api().delete(`/api/v1/admin/reviews/${review._id}`).set(bearer(admin.token)).expect(200);
        assert.equal((await api().get(`/api/v1/doctors/${doctor.id}`)).body.data.ratingCount, 0);
    });
});

describe("listing", () => {
    test("splits upcoming and history and summarises for the doctor", async () => {
        const upcoming = (await helpers.book(patient.token, doctor.id, day).expect(201)).body.data;
        const past = (await helpers.book(otherPatient.token, doctor.id, day).expect(201)).body.data;
        await patchAs(doctor.token, past._id, "confirm").expect(200);
        await moveToYesterday(past._id);
        await patchAs(doctor.token, past._id, "complete").expect(200);

        const list = async (token, query) =>
            (await api().get("/api/v1/appointments").query(query).set(bearer(token))).body.data.items.map((a) => a._id);

        assert.deepEqual(await list(doctor.token, { scope: "upcoming" }), [upcoming._id]);
        assert.deepEqual(await list(doctor.token, { scope: "history" }), [past._id]);
        assert.deepEqual(await list(doctor.token, { status: "completed" }), [past._id]);

        const summary = (await api().get("/api/v1/appointments/summary").set(bearer(doctor.token))).body.data;
        assert.deepEqual(summary, { pendingRequests: 1, upcoming: 1, today: 0, completed: 1 });
    });
});
