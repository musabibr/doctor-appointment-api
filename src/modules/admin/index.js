// Admin module: admin accounts and the back-office endpoints. It owns no
// other data and works through the public APIs of the other modules.
const router = require("./admin.routes");
const adminService = require("./admin.service");
const Admin = require("./admin.model");
const { createAccountProvider } = require("../../shared/auth/accountProvider");

module.exports = {
    name: "admin",
    routes: [{ path: "/api/v1/admin", router }],
    accountProvider: createAccountProvider(Admin, { canResetPassword: false }),

    // Public API (used by scripts)
    createOrUpdateAdmin: (data) => adminService.createOrUpdate(data),
};
