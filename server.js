const env = require("./src/shared/config/env");
const logger = require("./src/shared/utils/logger");
const { connectToDatabase, disconnectFromDatabase } = require("./src/shared/config/db");
const app = require("./src/app");

// Hide credentials when printing the connection string.
const safeUri = (uri) => uri.replace(/\/\/([^@/]+)@/, "//***@");

const start = async () => {
    if (env.usingDevJwtSecret) {
        logger.warn("JWT_SECRET is not set - using an insecure development secret. Set it in .env before deploying.");
    }

    try {
        await connectToDatabase(env.MONGODB_URI);
    } catch (error) {
        logger.error(
            `Could not connect to MongoDB at ${safeUri(env.MONGODB_URI)}: ${error.message}\n` +
                "Is MongoDB running? See the README section \"Start MongoDB\"."
        );
        process.exit(1);
    }

    const server = app.listen(env.PORT, () => {
        logger.info(`API ready on http://localhost:${env.PORT} (${env.NODE_ENV})`);
    });

    const shutdown = (signal) => {
        logger.info(`${signal} received, shutting down`);
        server.close(async () => {
            await disconnectFromDatabase();
            process.exit(0);
        });
    };
    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
};

start();
