// Composition root of the modular monolith: the only place that knows about
// every module. It registers account providers and event handlers and exposes
// the list of routers for app.js to mount.
const { registerAccountProvider } = require("../shared/auth/accountRegistry");

const auth = require("./auth");
const patients = require("./patients");
const doctors = require("./doctors");
const appointments = require("./appointments");
const reviews = require("./reviews");
const admin = require("./admin");
const notifications = require("./notifications");

const modules = [auth, patients, doctors, appointments, reviews, admin, notifications];

let initialized = false;

const initModules = () => {
    if (initialized) return modules;

    registerAccountProvider("patient", patients.accountProvider);
    registerAccountProvider("doctor", doctors.accountProvider);
    registerAccountProvider("admin", admin.accountProvider);

    for (const mod of modules) {
        if (typeof mod.registerEventHandlers === "function") mod.registerEventHandlers();
    }

    initialized = true;
    return modules;
};

const mountRoutes = (app) => {
    for (const mod of initModules()) {
        for (const { path, router } of mod.routes || []) app.use(path, router);
    }
};

module.exports = { initModules, mountRoutes, modules };
