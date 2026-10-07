// Demo mode: one-click logins, the in-app inbox and protected demo accounts.
process.env.DEMO_MODE = "true";

const { describe, test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const helpers = require("./helpers");
const { loadDemoData } = require("../src/demo/demoData");
const { clearDemoInbox } = require("../src/shared/email/email");

const { api, bearer } = helpers;

before(helpers.startDatabase);
after(helpers.stopDatabase);
beforeEach(async () => {
    await helpers.resetDatabase();
    clearDemoInbox();
});

const login = async (role, email, password) => {
    const res = await api().post("/api/v1/auth/login").send({ role, email, password });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    return res.body.data.token;
};

describe("demo mode", () => {
    test("lists the one-click demo accounts", async () => {
        const res = await api().get("/api/v1/demo");
        assert.equal(res.status, 200);
        assert.equal(res.body.data.enabled, true);
        assert.deepEqual(
            res.body.data.accounts.map((a) => a.role),
            ["patient", "doctor", "doctor", "admin"]
        );
    });

    test("every demo account can log in after the demo data is loaded", async () => {
        await loadDemoData();
        const { accounts } = (await api().get("/api/v1/demo")).body.data;
        for (const account of accounts) await login(account.role, account.email, account.password);
    });

    test("emails land in the demo inbox, newest first", async () => {
        const { res, fields } = await helpers.registerDoctor();
        assert.equal(res.status, 201);
        await api().post("/api/v1/auth/forgot-password").send({ role: "doctor", email: fields.email });

        const inbox = (await api().get("/api/v1/demo/emails").query({ to: fields.email })).body.data;
        assert.equal(inbox.length, 2);
        assert.match(inbox[0].subject, /Reset your password/);
        assert.match(inbox[1].text, new RegExp(helpers.latestOtp(fields.email)));

        const other = (await api().get("/api/v1/demo/emails").query({ to: "nobody@example.com" })).body.data;
        assert.equal(other.length, 0);
    });

    test("testers cannot lock others out of the shared demo accounts", async () => {
        await loadDemoData();
        const patientToken = await login("patient", "patient@example.com", "Patient123");
        const adminToken = await login("admin", "admin@example.com", "Admin12345");

        const change = await api()
            .patch("/api/v1/auth/me/password")
            .set(bearer(patientToken))
            .send({ currentPassword: "Patient123", newPassword: "Hijacked123" });
        assert.equal(change.status, 403);
        assert.equal(change.body.code, "DEMO_ACCOUNT_PROTECTED");

        const forgot = await api().post("/api/v1/auth/forgot-password").send({ role: "patient", email: "patient@example.com" });
        assert.equal(forgot.status, 403);

        const patients = (await api().get("/api/v1/admin/patients").query({ q: "patient@example.com" }).set(bearer(adminToken))).body.data;
        const remove = await api().delete(`/api/v1/admin/patients/${patients.items[0]._id}`).set(bearer(adminToken));
        assert.equal(remove.status, 403);

        // Accounts created by testers behave normally.
        const mine = await helpers.createPatient();
        const ok = await api()
            .patch("/api/v1/auth/me/password")
            .set(bearer(mine.token))
            .send({ currentPassword: mine.password, newPassword: "Brandnew123" });
        assert.equal(ok.status, 200);
    });
});
