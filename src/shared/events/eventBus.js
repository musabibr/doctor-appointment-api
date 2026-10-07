const logger = require("../utils/logger");

// In-process publish/subscribe used for communication between modules.
// Handlers run one after another and are awaited, so when publish() resolves
// every reaction (cascades, emails) has finished. A failing handler is logged
// and re-thrown after the remaining handlers have run.

const handlers = new Map();

const subscribe = (eventName, handler) => {
    if (!handlers.has(eventName)) handlers.set(eventName, []);
    handlers.get(eventName).push(handler);
};

const publish = async (eventName, payload) => {
    let firstError = null;
    for (const handler of handlers.get(eventName) || []) {
        try {
            await handler(payload);
        } catch (error) {
            logger.error(`Handler for "${eventName}" failed: ${error.stack || error}`);
            firstError = firstError || error;
        }
    }
    if (firstError) throw firstError;
};

const clearSubscriptions = () => handlers.clear();

module.exports = { subscribe, publish, clearSubscriptions };
