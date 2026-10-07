// Auth module: sessions (login / logout), passwords and email verification.
// It works with every account type through the shared account registry.
const router = require("./auth.routes");
const authService = require("./auth.service");

module.exports = {
    name: "auth",
    routes: [{ path: "/api/v1/auth", router }],

    // Public API
    issueEmailVerification: (role, account) => authService.issueEmailVerification(role, account),
};
