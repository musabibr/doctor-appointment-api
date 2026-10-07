// Demo mode: everything needed to try the app online without any setup.
//  - an embedded MongoDB when no MONGODB_URI is configured,
//  - demo data loaded at start and reloaded on a schedule,
//  - GET /api/v1/demo (one-click logins) and GET /api/v1/demo/emails (inbox).
const express = require("express");
const env = require("../shared/config/env");
const logger = require("../shared/utils/logger");
const response = require("../shared/http/response");
const { DEMO_LOGINS } = require("../shared/demo/accounts");
const { recentDemoEmails, clearDemoInbox } = require("../shared/email/email");
const { isDatabaseEmpty, wipeDatabase, loadDemoData } = require("./demoData");
const { startEmbeddedDatabase, stopEmbeddedDatabase } = require("./embeddedDatabase");

const state = { loadedAt: null, nextResetAt: null, timer: null };

const reloadDemoData = async () => {
    await wipeDatabase();
    clearDemoInbox();
    await loadDemoData();
    state.loadedAt = new Date();
};

const scheduleResets = () => {
    if (!env.DEMO_RESET_HOURS) return;
    const interval = env.DEMO_RESET_HOURS * 60 * 60 * 1000;
    state.nextResetAt = new Date(Date.now() + interval);
    state.timer = setInterval(async () => {
        try {
            await reloadDemoData();
            logger.info("Demo data was reset");
        } catch (error) {
            logger.error(`Demo data reset failed: ${error.stack || error}`);
        }
        state.nextResetAt = new Date(Date.now() + interval);
    }, interval);
    state.timer.unref();
};

// Called once the database is connected.
const prepareDemo = async () => {
    if (env.useEmbeddedDatabase || (await isDatabaseEmpty())) {
        await reloadDemoData();
        logger.info("Demo data loaded");
    } else {
        logger.info("Demo mode: the database already has data, so the demo data was not loaded");
    }
    scheduleResets();
};

const stopDemo = async () => {
    if (state.timer) clearInterval(state.timer);
    await stopEmbeddedDatabase();
};

const router = express.Router();

router.get("/", (req, res) => {
    response(res, 200, "success", "Demo mode", {
        enabled: true,
        accounts: DEMO_LOGINS,
        resetHours: env.DEMO_RESET_HOURS,
        nextResetAt: state.nextResetAt,
    });
});

router.get("/emails", (req, res) => {
    response(res, 200, "success", "Demo inbox", recentDemoEmails({ to: req.query.to }));
});

module.exports = { router, prepareDemo, stopDemo, startEmbeddedDatabase, reloadDemoData };
