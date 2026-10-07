const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const env = require("../config/env");

// bcrypt generates a fresh random salt per hash when given a cost factor.
const encryptData = (data) => bcrypt.hash(String(data), env.BCRYPT_ROUNDS);

const compareData = (plainText, hash) => {
    if (!hash) return Promise.resolve(false);
    return bcrypt.compare(String(plainText), hash);
};

// For one-time secrets (reset tokens, OTPs) that we store but never need to read back.
const sha256 = (value) => crypto.createHash("sha256").update(String(value)).digest("hex");

const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString("hex");

module.exports = { encryptData, compareData, sha256, randomToken };
