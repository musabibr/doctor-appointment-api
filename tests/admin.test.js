const { describe, test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const helpers = require("./helpers");
const Appointment = require("../src/modules/appointments/appointment.model");
const Review = require("../src/modules/reviews/review.model");
const { todayKey, addDays, parseDateKey } = require("../src/shared/utils/time");

const { api, bearer } = helpers;

before(helpers.startDatabase);
after(helpers.stopDatabase);
beforeEach(helpers.resetDatabase);

// A completed and reviewed visit plus an upcoming booking for the same patient and doctor.
const scenario = async () => {
    const admin = await helpers.createAdmin();
    const doctor = await helpers.createDoctor(admin.token);
    const patient = await helpers.createPatient();
    const day = await helpers.addDay(doctor.token, { offset: 1, slots: [{ start: "09:00", end: "12:00", maxPatients: 2 }] });

    const pastVisit = (await helpers.book(patient.token, doctor.id, day).expect(201)).body.data;
    await api().patch(`/api/v1/appointments/${pastVisit._id}/confirm`).set(bearer(doctor.token)).expect(200);
    await Appointment.updateOne({ _id: pastVisit._id }, { $set: { appointmentDate: parseDateKey(addDays(todayKey(), -1)) } });
    await api().patch(`/api/v1/appointments/${pastVisit._id}/complete`).set(bearer(doctor.token)).expect(200);
    await api()
        .post("/api/v1/reviews")
        .set(bearer(patient.token))
        .send({ appointmentId: pastVisit._id, rating: 5, comment: "Great" })
        .expect(201);

    const secondDay = await helpers.addDay(doctor.token, { offset: 2, slots: [{ start: "09:00", end: "12:00", maxPatients: 2 }] });
    const upcoming = (await helpers.book(patient.token, doctor.id, secondDay).expect(201)).body.data;

    return { admin, doctor, patient, day: secondDay, upcoming };
};

describe("admin", () => {
    test("stats cover every module", async () => {
        const { admin } = await scenario();
        const stats = (await api().get("/api/v1/admin/stats").set(bearer(admin.token))).body.data;
        assert.equal(stats.patients, 1);
        assert.equal(stats.doctors.approved, 1);
        assert.equal(stats.appointments.completed, 1);
        assert.equal(stats.appointments.pending, 1);
        assert.equal(stats.reportedReviews, 0);
    });

    test("lists doctors by approval status", async () => {
        const admin = await helpers.createAdmin();
        await helpers.createDoctor(admin.token, { name: "Approved Doctor" });
        await helpers.createDoctor(admin.token, { name: "Pending Doctor" }, { approve: false });

        const pending = (await api().get("/api/v1/admin/doctors?status=pending").set(bearer(admin.token))).body.data;
        assert.deepEqual(pending.items.map((d) => d.name), ["Pending Doctor"]);
        assert.equal(pending.items[0].password, undefined);

        const all = (await api().get("/api/v1/admin/doctors").set(bearer(admin.token))).body.data;
        assert.equal(all.total, 2);
    });

    test("an approved doctor cannot be rejected", async () => {
        const admin = await helpers.createAdmin();
        const doctor = await helpers.createDoctor(admin.token);
        const res = await api()
            .patch(`/api/v1/admin/doctors/${doctor.id}/reject`)
            .set(bearer(admin.token))
            .send({ reason: "Changed my mind" });
        assert.equal(res.status, 409);
    });

    test("deleting a patient cancels their bookings, frees seats and removes their reviews", async () => {
        const { admin, doctor, patient, day, upcoming } = await scenario();
        assert.equal(await helpers.remainingSeats(doctor.id, day.slotId), 1);

        await api().delete(`/api/v1/admin/patients/${patient.user._id}`).set(bearer(admin.token)).expect(200);

        const appointment = await Appointment.findById(upcoming._id);
        assert.equal(appointment.status, "canceled");
        assert.equal(appointment.canceledBy, "admin");
        assert.equal(await helpers.remainingSeats(doctor.id, day.slotId), 2);
        assert.equal(await Review.countDocuments(), 0);

        const profile = (await api().get(`/api/v1/doctors/${doctor.id}`)).body.data;
        assert.equal(profile.ratingCount, 0);
        assert.equal((await api().get("/api/v1/auth/me").set(bearer(patient.token))).status, 401);
    });

    test("deleting a doctor cancels their bookings and removes them from search", async () => {
        const { admin, doctor, upcoming } = await scenario();

        await api().delete(`/api/v1/admin/doctors/${doctor.id}`).set(bearer(admin.token)).expect(200);

        assert.equal((await Appointment.findById(upcoming._id)).status, "canceled");
        assert.equal(await Review.countDocuments({ doctor: doctor.id }), 0);
        assert.equal((await api().get("/api/v1/doctors")).body.data.total, 0);
        assert.equal((await api().get("/api/v1/auth/me").set(bearer(doctor.token))).status, 401);
    });

    test("lists appointments across the platform", async () => {
        const { admin } = await scenario();
        const all = (await api().get("/api/v1/admin/appointments").set(bearer(admin.token))).body.data;
        assert.equal(all.total, 2);
        const completed = (await api().get("/api/v1/admin/appointments?status=completed").set(bearer(admin.token))).body.data;
        assert.equal(completed.total, 1);
        assert.ok(completed.items[0].patient.name);
        assert.ok(completed.items[0].doctor.name);
    });
});
