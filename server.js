const env = require("./src/shared/config/env");
const logger = require("./src/shared/utils/logger");
const { connectToDatabase, disconnectFromDatabase } = require("./src/shared/config/db");
const app = require("./src/app");

// Only loaded in demo mode (see src/demo).
const demo = env.DEMO_MODE ? require("./src/demo") : null;

// Hide credentials when printing the connection string.
const safeUri = (uri) => uri.replace(/\/\/([^@/]+)@/, "//***@");

const start = async () => {
    if (env.usingDevJwtSecret) {
        logger.warn("JWT_SECRET is not set - using an insecure development secret. Set it in .env before deploying.");
    }

    let uri = env.MONGODB_URI;
    try {
        if (env.useEmbeddedDatabase) uri = await demo.startEmbeddedDatabase();
        await connectToDatabase(uri);
    } catch (error) {
        logger.error(
            `Could not connect to MongoDB at ${safeUri(uri || "(embedded)")}: ${error.message}\n` +
                'Is MongoDB running? See the README section "Start MongoDB", or run "npm run demo" to use an embedded database.'
        );
        process.exit(1);
    }

    if (demo) await demo.prepareDemo();

    const server = app.listen(env.PORT, () => {
        logger.info(`API ready on http://localhost:${env.PORT} (${env.NODE_ENV}${env.DEMO_MODE ? ", demo mode" : ""})`);
        if (env.DEMO_MODE) {
            logger.info(`Open ${env.CLIENT_URL} and use the one-click demo logins on the login page.`);
        }
    });

    const shutdown = (signal) => {
        logger.info(`${signal} received, shutting down`);
        server.close(async () => {
            await disconnectFromDatabase();
            if (demo) await demo.stopDemo();
            process.exit(0);
        });
    };
    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
};

start();
