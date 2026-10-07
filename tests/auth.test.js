const { describe, test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const helpers = require("./helpers");
const jwt = require("jsonwebtoken");

const { api, bearer, outbox } = helpers;

before(helpers.startDatabase);
after(helpers.stopDatabase);
beforeEach(helpers.resetDatabase);

describe("patient registration and login", () => {
    test("registers a patient and returns a session without secrets", async () => {
        const { token, user } = await helpers.createPatient({ name: "سارة أحمد" });
        assert.equal(user.name, "سارة أحمد");
        assert.equal(user.password, undefined);
        assert.equal(user.tokenVersion, undefined);

        const payload = jwt.decode(token);
        assert.deepEqual(Object.keys(payload).sort(), ["exp", "iat", "role", "sub", "tv"]);
        assert.equal(payload.role, "patient");

        const me = await api().get("/api/v1/auth/me").set(bearer(token));
        assert.equal(me.status, 200);
        assert.equal(me.body.data.role, "patient");
        assert.equal(me.body.data.user.email, user.email);
    });

    test("rejects invalid input with field errors", async () => {
        const res = await api()
            .post("/api/v1/patients/register")
            .send({ name: "A", email: "not-an-email", password: "short", gender: "other" });
        assert.equal(res.status, 400);
        assert.equal(res.body.code, "VALIDATION_ERROR");
        assert.deepEqual(Object.keys(res.body.errors).sort(), ["email", "gender", "name", "password"]);
    });

    test("rejects a duplicate email", async () => {
        const { email } = await helpers.createPatient();
        const res = await api()
            .post("/api/v1/patients/register")
            .send({ name: "Someone Else", email, password: "Patient123", gender: "male" });
        assert.equal(res.status, 409);
    });

    test("uses the same error for an unknown email and a wrong password", async () => {
        const { email } = await helpers.createPatient();
        const wrongPassword = await api()
            .post("/api/v1/auth/login")
            .send({ role: "patient", email, password: "Wrong12345" });
        const unknownEmail = await api()
            .post("/api/v1/auth/login")
            .send({ role: "patient", email: "nobody@example.com", password: "Wrong12345" });
        assert.equal(wrongPassword.status, 401);
        assert.equal(unknownEmail.status, 401);
        assert.equal(wrongPassword.body.message, unknownEmail.body.message);
    });

    test("logs in with the right role only", async () => {
        const { email, password } = await helpers.createPatient();
        const ok = await api().post("/api/v1/auth/login").send({ role: "patient", email, password });
        assert.equal(ok.status, 200);
        const asDoctor = await api().post("/api/v1/auth/login").send({ role: "doctor", email, password });
        assert.equal(asDoctor.status, 401);
    });
});

describe("sessions", () => {
    test("logout revokes the token", async () => {
        const { token } = await helpers.createPatient();
        assert.equal((await api().post("/api/v1/auth/logout").set(bearer(token))).status, 200);
        const me = await api().get("/api/v1/auth/me").set(bearer(token));
        assert.equal(me.status, 401);
        assert.equal(me.body.code, "SESSION_EXPIRED");
    });

    test("rejects missing, malformed and tampered tokens", async () => {
        const { token } = await helpers.createPatient();
        assert.equal((await api().get("/api/v1/auth/me")).status, 401);
        assert.equal((await api().get("/api/v1/auth/me").set(bearer("garbage"))).status, 401);

        const [header, , signature] = token.split(".");
        const forged = Buffer.from(JSON.stringify({ ...jwt.decode(token), role: "admin" })).toString("base64url");
        const res = await api().get("/api/v1/admin/stats").set(bearer(`${header}.${forged}.${signature}`));
        assert.equal(res.status, 401);
    });

    test("changing the password signs out other sessions and returns a new token", async () => {
        const { token, email } = await helpers.createPatient();

        const wrong = await api()
            .patch("/api/v1/auth/me/password")
            .set(bearer(token))
            .send({ currentPassword: "Nope12345", newPassword: "Brandnew123" });
        assert.equal(wrong.status, 400);
        assert.ok(wrong.body.errors.currentPassword);

        const res = await api()
            .patch("/api/v1/auth/me/password")
            .set(bearer(token))
            .send({ currentPassword: "Patient123", newPassword: "Brandnew123" });
        assert.equal(res.status, 200);
        assert.equal((await api().get("/api/v1/auth/me").set(bearer(token))).status, 401);
        assert.equal((await api().get("/api/v1/auth/me").set(bearer(res.body.data.token))).status, 200);

        const login = await api().post("/api/v1/auth/login").send({ role: "patient", email, password: "Brandnew123" });
        assert.equal(login.status, 200);
    });
});

describe("password reset", () => {
    test("sends a reset link and lets the user choose a new password once", async () => {
        const { email, token: oldToken } = await helpers.createPatient();

        const res = await api().post("/api/v1/auth/forgot-password").send({ role: "patient", email });
        assert.equal(res.status, 200);
        const message = outbox.find((m) => m.to === email && m.template === "passwordReset");
        assert.ok(message, "reset email was not sent");
        const resetToken = new URL(message.locals.url).searchParams.get("token");

        const reset = await api()
            .post("/api/v1/auth/reset-password")
            .send({ role: "patient", token: resetToken, password: "Resetpass123" });
        assert.equal(reset.status, 200);

        const reused = await api()
            .post("/api/v1/auth/reset-password")
            .send({ role: "patient", token: resetToken, password: "Another12345" });
        assert.equal(reused.status, 400);

        assert.equal((await api().get("/api/v1/auth/me").set(bearer(oldToken))).status, 401);
        const login = await api().post("/api/v1/auth/login").send({ role: "patient", email, password: "Resetpass123" });
        assert.equal(login.status, 200);
    });

    test("does not reveal whether an email is registered", async () => {
        const res = await api()
            .post("/api/v1/auth/forgot-password")
            .send({ role: "patient", email: "ghost@example.com" });
        assert.equal(res.status, 200);
        assert.equal(outbox.length, 0);
    });
});

describe("admin accounts", () => {
    test("there is no public admin sign-up", async () => {
        const res = await api()
            .post("/api/v1/admin/register")
            .send({ name: "Mallory", email: "mallory@example.com", password: "Mallory123" });
        assert.notEqual(res.status, 201);
        const login = await api()
            .post("/api/v1/auth/login")
            .send({ role: "admin", email: "mallory@example.com", password: "Mallory123" });
        assert.equal(login.status, 401);
    });

    test("other roles cannot use admin endpoints", async () => {
        const { token } = await helpers.createPatient();
        const res = await api().get("/api/v1/admin/stats").set(bearer(token));
        assert.equal(res.status, 403);
    });

    test("admins log in and see stats", async () => {
        const { token } = await helpers.createAdmin();
        const res = await api().get("/api/v1/admin/stats").set(bearer(token));
        assert.equal(res.status, 200);
        assert.equal(res.body.data.patients, 0);
    });
});
