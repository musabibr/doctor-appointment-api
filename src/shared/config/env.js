const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", "..", "..", ".env"), quiet: true });

const NODE_ENV = process.env.NODE_ENV || "development";
const isProduction = NODE_ENV === "production";
const isTest = NODE_ENV === "test";

const DEV_JWT_SECRET = "dev-only-insecure-secret-change-me";

const toNumber = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && value !== "" ? parsed : fallback;
};

// MONGODB_URL_DEV / MONGODB_URL_PROD are still honoured for older .env files.
const legacyMongoUrl = isProduction ? process.env.MONGODB_URL_PROD : process.env.MONGODB_URL_DEV;

const env = {
    NODE_ENV,
    isProduction,
    isTest,
    APP_NAME: process.env.APP_NAME || "Doctorri",
    PORT: toNumber(process.env.PORT, 5000),
    MONGODB_URI:
        process.env.MONGODB_URI ||
        legacyMongoUrl ||
        "mongodb://127.0.0.1:27017/doctor_appointment",
    JWT_SECRET: process.env.JWT_SECRET || (isProduction ? "" : DEV_JWT_SECRET),
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
    BCRYPT_ROUNDS: toNumber(process.env.BCRYPT_ROUNDS, isTest ? 4 : 10),
    // Comma separated list of origins allowed to call the API from a browser.
    CLIENT_URLS: (process.env.CLIENT_URL || "http://localhost:5173")
        .split(",")
        .map((origin) => origin.trim().replace(/\/$/, ""))
        .filter(Boolean),
    // Time zone used to decide whether a slot is in the past (e.g. "Africa/Khartoum").
    APP_TIMEZONE:
        process.env.APP_TIMEZONE || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    RATE_LIMIT_MAX: toNumber(process.env.RATE_LIMIT_MAX, isTest ? 100000 : 1000),
    AUTH_RATE_LIMIT_MAX: toNumber(process.env.AUTH_RATE_LIMIT_MAX, isTest ? 100000 : 20),
    TRUST_PROXY: toNumber(process.env.TRUST_PROXY, 0),
    UPLOAD_DIR: path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, "..", "..", "..", "uploads")),
    SENDGRID_API_KEY: process.env.SENDGRID_API_KEY || "",
    EMAIL_FROM: process.env.EMAIL_FROM || "",
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || "",
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || "",
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || "",
};

env.CLIENT_URL = env.CLIENT_URLS[0] || "http://localhost:5173";
env.useCloudinary = Boolean(
    env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET
);
env.useSendgrid = Boolean(env.SENDGRID_API_KEY && env.EMAIL_FROM);
env.usingDevJwtSecret = env.JWT_SECRET === DEV_JWT_SECRET;

if (isProduction && (!env.JWT_SECRET || env.JWT_SECRET.length < 32)) {
    throw new Error("JWT_SECRET must be set to a random string of at least 32 characters in production.");
}

module.exports = env;
