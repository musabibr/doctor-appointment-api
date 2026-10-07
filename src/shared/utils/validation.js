const validator = require("validator");
const mongoose = require("mongoose");
const AppError = require("../errors/AppError");

// Letters from any alphabet (e.g. Arabic names), spaces, apostrophes, dots and hyphens.
const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M}\s'.-]*$/u;
const PHONE_RE = /^\+?\d{7,15}$/;

const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;

const cleanString = (value) => (typeof value === "string" ? value.trim() : value);

const normalizeEmail = (value) => (typeof value === "string" ? value.trim().toLowerCase() : value);

const normalizePhone = (value) =>
    typeof value === "string" ? value.replace(/[\s\-()]/g, "") : value;

const isObjectId = (value) =>
    typeof value === "string" && mongoose.Types.ObjectId.isValid(value) && /^[a-f\d]{24}$/i.test(value);

// Collects field errors and throws them together so the client can show all of them.
class Validator {
    constructor() {
        this.errors = {};
    }

    add(field, message) {
        if (!this.errors[field]) this.errors[field] = message;
        return this;
    }

    check(condition, field, message) {
        if (!condition) this.add(field, message);
        return this;
    }

    required(value, field, label = field) {
        if (!isNonEmptyString(value)) this.add(field, `${label} is required`);
        return isNonEmptyString(value);
    }

    name(value, field = "name", { required = true } = {}) {
        if (value === undefined && !required) return this;
        if (!this.required(value, field, "Name")) return this;
        const name = value.trim();
        return this.check(
            name.length >= 2 && name.length <= 60 && NAME_RE.test(name),
            field,
            "Name must be 2-60 letters"
        );
    }

    email(value, field = "email") {
        if (!this.required(value, field, "Email")) return this;
        return this.check(validator.isEmail(value.trim()), field, "Enter a valid email address");
    }

    password(value, field = "password") {
        if (typeof value !== "string" || value.length === 0) return this.add(field, "Password is required");
        return this.check(
            value.length >= 8 && value.length <= 72 && /[A-Za-z]/.test(value) && /\d/.test(value),
            field,
            "Password must be 8-72 characters and include a letter and a number"
        );
    }

    gender(value, field = "gender", { required = true } = {}) {
        if (value === undefined && !required) return this;
        return this.check(
            typeof value === "string" && ["male", "female"].includes(value.trim().toLowerCase()),
            field,
            'Gender must be "male" or "female"'
        );
    }

    phone(value, field = "phoneNumber", { required = true } = {}) {
        if ((value === undefined || value === "") && !required) return this;
        if (!this.required(value, field, "Phone number")) return this;
        return this.check(PHONE_RE.test(normalizePhone(value)), field, "Enter a valid phone number (7-15 digits)");
    }

    text(value, field, { label = field, min = 0, max = 500, required = false } = {}) {
        if ((value === undefined || value === null || value === "") && !required) return this;
        if (typeof value !== "string") return this.add(field, `${label} must be text`);
        const length = value.trim().length;
        if (required && length === 0) return this.add(field, `${label} is required`);
        return this.check(
            length >= min && length <= max,
            field,
            min > 0 ? `${label} must be ${min}-${max} characters` : `${label} must be at most ${max} characters`
        );
    }

    number(value, field, { label = field, min = 0, max = Number.MAX_SAFE_INTEGER, required = false, integer = false } = {}) {
        if ((value === undefined || value === null || value === "") && !required) return this;
        const number = Number(value);
        const valid =
            Number.isFinite(number) && number >= min && number <= max && (!integer || Number.isInteger(number));
        return this.check(valid, field, `${label} must be a${integer ? " whole" : ""} number between ${min} and ${max}`);
    }

    objectId(value, field, label = field) {
        return this.check(isObjectId(value), field, `${label} is not a valid id`);
    }

    oneOf(value, allowed, field, label = field) {
        return this.check(allowed.includes(value), field, `${label} must be one of: ${allowed.join(", ")}`);
    }

    throwIfInvalid() {
        if (Object.keys(this.errors).length > 0) throw AppError.validation(this.errors);
    }
}

const assertObjectId = (value, label = "id") => {
    if (!isObjectId(value)) throw AppError.badRequest(`Invalid ${label}`);
};

module.exports = {
    Validator,
    isObjectId,
    assertObjectId,
    isNonEmptyString,
    cleanString,
    normalizeEmail,
    normalizePhone,
    PHONE_RE,
};
