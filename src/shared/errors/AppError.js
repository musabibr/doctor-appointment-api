// An expected, client-facing error. Anything else that reaches the error
// handler is treated as a bug and reported as a generic 500.
class AppError extends Error {
    constructor(message, statusCode = 400, { code, errors } = {}) {
        super(message);
        this.statusCode = statusCode;
        this.status = statusCode >= 500 ? "error" : "fail";
        this.code = code;
        this.errors = errors;
        this.isOperational = true;
    }

    static badRequest(message, errors) {
        return new AppError(message, 400, { errors });
    }

    static validation(errors) {
        return new AppError("Please correct the highlighted fields", 400, {
            code: "VALIDATION_ERROR",
            errors,
        });
    }

    static unauthorized(message = "Please log in to continue", code) {
        return new AppError(message, 401, { code });
    }

    static forbidden(message = "You are not allowed to do this", code) {
        return new AppError(message, 403, { code });
    }

    static notFound(message = "Not found") {
        return new AppError(message, 404);
    }

    static conflict(message, code) {
        return new AppError(message, 409, { code });
    }
}

module.exports = AppError;
