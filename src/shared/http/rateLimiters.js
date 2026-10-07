const rateLimit = require("express-rate-limit");
const env = require("../config/env");

const message = (text) => ({ status: "fail", message: text });

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: env.RATE_LIMIT_MAX,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: message("Too many requests, please try again later."),
});

// Login: only failed attempts count, to slow down password guessing.
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: env.AUTH_RATE_LIMIT_MAX,
    skipSuccessfulRequests: true,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: message("Too many failed login attempts, please try again in 15 minutes."),
});

// Registration, OTP and password-reset emails.
const sensitiveLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: env.AUTH_RATE_LIMIT_MAX,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: message("Too many attempts, please try again in 15 minutes."),
});

module.exports = { apiLimiter, loginLimiter, sensitiveLimiter };
