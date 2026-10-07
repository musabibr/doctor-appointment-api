const path = require("path");
const crypto = require("crypto");
require("dotenv").config({ path: path.join(__dirname, "..", "..", "..", ".env"), quiet: true });

const NODE_ENV = process.env.NODE_ENV || "development";
const isProduction = NODE_ENV === "production";
const isTest = NODE_ENV === "test";

const DEV_JWT_SECRET = "dev-only-insecure-secret-change-me";

const toNumber = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && value !== "" ? parsed : fallback;
};

const toBoolean = (value) => ["1", "true", "yes", "on"].includes(String(value || "").trim().toLowerCase());

// Demo mode: sample data, one-click demo logins and an in-app inbox for emails.
// Without MONGODB_URI it also runs an embedded MongoDB, so nothing else is needed.
const DEMO_MODE = toBoolean(process.env.DEMO_MODE);

const PORT = toNumber(process.env.PORT, 5000);

// MONGODB_URL_DEV / MONGODB_URL_PROD are still honoured for older .env files.
const legacyMongoUrl = isProduction ? process.env.MONGODB_URL_PROD : process.env.MONGODB_URL_DEV;
const configuredMongoUri = process.env.MONGODB_URI || legacyMongoUrl || "";

// Public address of the app when a hosting platform provides one.
const platformUrl = () => {
    if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL;
    if (process.env.RENDER_EXTERNAL_URL) return process.env.RENDER_EXTERNAL_URL;
    if (process.env.CODESPACE_NAME && process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN) {
        return `https://${process.env.CODESPACE_NAME}-${PORT}.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`;
    }
    return "";
};
const onHostingPlatform = Boolean(process.env.RENDER || process.env.CODESPACES === "true");

// In demo mode the API serves the web app itself, so links point at the API's port.
const defaultClientUrl = platformUrl() || (DEMO_MODE ? `http://localhost:${PORT}` : "http://localhost:5173");

// A demo without a configured secret gets a random one (sessions end on restart).
const jwtSecret =
    process.env.JWT_SECRET ||
    (DEMO_MODE ? crypto.randomBytes(48).toString("hex") : isProduction ? "" : DEV_JWT_SECRET);

const env = {
    NODE_ENV,
    isProduction,
    isTest,
    DEMO_MODE,
    APP_NAME: process.env.APP_NAME || "Doctorri",
    PORT,
    MONGODB_URI: configuredMongoUri || (DEMO_MODE ? "" : "mongodb://127.0.0.1:27017/doctor_appointment"),
    JWT_SECRET: jwtSecret,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
    BCRYPT_ROUNDS: toNumber(process.env.BCRYPT_ROUNDS, isTest ? 4 : 10),
    // Comma separated list of origins allowed to call the API from a browser.
    CLIENT_URLS: (process.env.CLIENT_URL || defaultClientUrl)
        .split(",")
        .map((origin) => origin.trim().replace(/\/$/, ""))
        .filter(Boolean),
    // Time zone used to decide whether a slot is in the past (e.g. "Africa/Khartoum").
    APP_TIMEZONE:
        process.env.APP_TIMEZONE || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    RATE_LIMIT_MAX: toNumber(process.env.RATE_LIMIT_MAX, isTest ? 100000 : 1000),
    AUTH_RATE_LIMIT_MAX: toNumber(process.env.AUTH_RATE_LIMIT_MAX, isTest ? 100000 : DEMO_MODE ? 100 : 20),
    // Render and Codespaces put one proxy in front of the app.
    TRUST_PROXY: toNumber(process.env.TRUST_PROXY, onHostingPlatform ? 1 : 0),
    UPLOAD_DIR: path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, "..", "..", "..", "uploads")),
    SENDGRID_API_KEY: process.env.SENDGRID_API_KEY || "",
    EMAIL_FROM: process.env.EMAIL_FROM || "",
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || "",
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || "",
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || "",
};

env.CLIENT_URL = env.CLIENT_URLS[0] || defaultClientUrl;
env.useCloudinary = Boolean(
    env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET
);
env.useSendgrid = Boolean(env.SENDGRID_API_KEY && env.EMAIL_FROM);
env.usingDevJwtSecret = env.JWT_SECRET === DEV_JWT_SECRET;
// The demo runs its own throw-away MongoDB unless a database is configured.
env.useEmbeddedDatabase = DEMO_MODE && !configuredMongoUri;
// Demo data is wiped and reloaded on this schedule (0 = never). Only on by
// default with the embedded database, so a real database is never wiped by accident.
env.DEMO_RESET_HOURS = toNumber(process.env.DEMO_RESET_HOURS, env.useEmbeddedDatabase ? 12 : 0);

if (isProduction && (!env.JWT_SECRET || env.JWT_SECRET.length < 32)) {
    throw new Error("JWT_SECRET must be set to a random string of at least 32 characters in production.");
}

module.exports = env;
