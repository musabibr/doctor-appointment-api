const env = require("../config/env");
const AppError = require("../errors/AppError");

// Accounts created by the demo data (npm run seed / demo mode).
const DEMO_PASSWORDS = { admin: "Admin12345", doctor: "Doctor123", patient: "Patient123" };

// Shown as one-click logins in demo mode.
const DEMO_LOGINS = [
    { role: "patient", label: "Patient", email: "patient@example.com", password: DEMO_PASSWORDS.patient },
    { role: "doctor", label: "Doctor", email: "doctor@example.com", password: DEMO_PASSWORDS.doctor },
    {
        role: "doctor",
        label: "Doctor awaiting approval",
        email: "pending.doctor@example.com",
        password: DEMO_PASSWORDS.doctor,
    },
    { role: "admin", label: "Admin", email: "admin@example.com", password: DEMO_PASSWORDS.admin },
];

const SEEDED_EMAILS = new Set([
    ...DEMO_LOGINS.map((account) => account.email),
    "patient2@example.com",
    "doctor2@example.com",
    "doctor3@example.com",
    "doctor4@example.com",
    "doctor5@example.com",
    "doctor6@example.com",
]);

// In demo mode, testers share the seeded accounts: nobody may lock others out
// of them by changing their password or deleting them.
const isProtectedDemoAccount = (email) => env.DEMO_MODE && SEEDED_EMAILS.has(String(email || "").toLowerCase());

const assertNotProtectedDemoAccount = (email, action) => {
    if (isProtectedDemoAccount(email)) {
        throw AppError.forbidden(
            `Demo accounts can't ${action}. Create your own account to try this.`,
            "DEMO_ACCOUNT_PROTECTED"
        );
    }
};

module.exports = { DEMO_PASSWORDS, DEMO_LOGINS, isProtectedDemoAccount, assertNotProtectedDemoAccount };
