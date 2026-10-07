const path = require("path");
const logger = require("../shared/utils/logger");

// MongoDB binaries are kept inside the project so hosting platforms that only
// keep the project folder between build and run (e.g. Render) can reuse them.
// A binary already in the user's cache (~/.cache/mongodb-binaries) is used first.
const DOWNLOAD_DIR = path.join(__dirname, "..", "..", ".mongodb-binaries");

let server = null;

const loadMemoryServer = () => {
    try {
        return require("mongodb-memory-server");
    } catch {
        throw new Error(
            'The embedded demo database needs the dev dependencies. Run "npm install" ' +
                '(or "npm ci --include=dev" when NODE_ENV=production).'
        );
    }
};

// Starts a throw-away MongoDB for demo mode and returns its connection string.
const startEmbeddedDatabase = async () => {
    const { MongoMemoryServer } = loadMemoryServer();
    logger.info("Starting the embedded demo database (the first start downloads MongoDB, about a minute)...");
    server = await MongoMemoryServer.create({
        binary: { downloadDir: DOWNLOAD_DIR },
        // Keep memory low enough for small free hosting plans.
        instance: { args: ["--wiredTigerCacheSizeGB", "0.25"] },
    });
    return server.getUri("doctor_appointment");
};

const stopEmbeddedDatabase = async () => {
    if (server) await server.stop();
    server = null;
};

// Downloads the MongoDB binary ahead of time (used during deployment builds).
const prefetchMongoBinary = async () => {
    const { MongoBinary } = loadMemoryServer();
    return MongoBinary.getPath({ downloadDir: DOWNLOAD_DIR });
};

module.exports = { startEmbeddedDatabase, stopEmbeddedDatabase, prefetchMongoBinary };
