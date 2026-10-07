const multer = require("multer");
const env = require("../config/env");
const logger = require("../utils/logger");
const AppError = require("./AppError");

const DUPLICATE_LABELS = {
    email: "An account with this email already exists",
    phoneNumber: "This phone number is already registered",
    appointment: "This appointment has already been reviewed",
    doctor: "This doctor already has a clinic",
};

// Converts known library errors into client-friendly AppErrors.
const normalize = (err) => {
    if (err instanceof AppError) return err;

    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError" || err.name === "NotBeforeError") {
        return AppError.unauthorized("Your session has expired, please log in again", "SESSION_EXPIRED");
    }
    if (err.name === "CastError") {
        return AppError.badRequest(`Invalid ${err.path}`);
    }
    if (err.name === "ValidationError") {
        const errors = Object.fromEntries(Object.entries(err.errors).map(([field, e]) => [field, e.message]));
        return AppError.validation(errors);
    }
    if (err.name === "VersionError") {
        return AppError.conflict("This record was changed by someone else, please reload and try again");
    }
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue || err.keyPattern || {})[0];
        return AppError.conflict(DUPLICATE_LABELS[field] || "This record already exists");
    }
    if (err instanceof multer.MulterError) {
        const text =
            err.code === "LIMIT_FILE_SIZE"
                ? "Each file must be 5 MB or smaller"
                : err.code === "LIMIT_UNEXPECTED_FILE"
                  ? `Unexpected file field "${err.field}"`
                  : err.message;
        return AppError.badRequest(text);
    }
    if (err.type === "entity.parse.failed") {
        return AppError.badRequest("Request body is not valid JSON");
    }
    if (err.type === "entity.too.large") {
        return new AppError("Request body is too large", 413);
    }
    return null;
};

const notFound = (req, res, next) => {
    next(AppError.notFound(`Can't find ${req.method} ${req.originalUrl} on this server`));
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
    const appError = normalize(err);

    if (!appError) {
        logger.error(`${req.method} ${req.originalUrl} failed: ${err.stack || err}`);
        const body = { status: "error", message: "Something went wrong, please try again later" };
        if (!env.isProduction) body.debug = err.message;
        return res.status(500).json(body);
    }

    const body = { status: appError.status, message: appError.message };
    if (appError.code) body.code = appError.code;
    if (appError.errors) body.errors = appError.errors;
    res.status(appError.statusCode).json(body);
};

module.exports = { notFound, errorHandler };
