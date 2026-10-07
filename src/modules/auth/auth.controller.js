const catchAsync = require("../../shared/http/catchAsync");
const response = require("../../shared/http/response");
const { Validator, normalizeEmail } = require("../../shared/utils/validation");
const authService = require("./auth.service");

const ROLES = ["patient", "doctor", "admin"];

const login = catchAsync(async (req, res) => {
    const { role, email, password } = req.body;
    const v = new Validator();
    v.oneOf(role, ROLES, "role", "Account type");
    v.email(email);
    v.check(typeof password === "string" && password.length > 0, "password", "Password is required");
    v.throwIfInvalid();

    const session = await authService.login({ role, email: normalizeEmail(email), password });
    response(res, 200, "success", "Logged in successfully", session);
});

const logout = catchAsync(async (req, res) => {
    await authService.logout(req.role, req.user._id);
    response(res, 200, "success", "Logged out from all devices");
});

const me = (req, res) => {
    response(res, 200, "success", "Current account", { role: req.role, user: req.user });
};

const changePassword = catchAsync(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const v = new Validator();
    v.check(typeof currentPassword === "string" && currentPassword.length > 0, "currentPassword", "Current password is required");
    v.password(newPassword, "newPassword");
    v.check(currentPassword !== newPassword, "newPassword", "New password must be different from the current one");
    v.throwIfInvalid();

    const session = await authService.changePassword(req.role, req.user._id, { currentPassword, newPassword });
    response(res, 200, "success", "Password updated", session);
});

const forgotPassword = catchAsync(async (req, res) => {
    const { role = "patient", email } = req.body;
    const v = new Validator();
    v.oneOf(role, ["patient", "doctor"], "role", "Account type");
    v.email(email);
    v.throwIfInvalid();

    await authService.forgotPassword(role, normalizeEmail(email));
    response(res, 200, "success", "If an account exists for this email, a reset link is on its way.");
});

const resetPassword = catchAsync(async (req, res) => {
    const { role = "patient", token, password } = req.body;
    const v = new Validator();
    v.oneOf(role, ["patient", "doctor"], "role", "Account type");
    v.check(typeof token === "string" && /^[a-f\d]{64}$/i.test(token), "token", "This reset link is invalid");
    v.password(password);
    v.throwIfInvalid();

    await authService.resetPassword(role, token, password);
    response(res, 200, "success", "Your password has been reset. You can now log in.");
});

const verifyEmail = catchAsync(async (req, res) => {
    const { role = "doctor", email, code } = req.body;
    const v = new Validator();
    v.email(email);
    v.check(typeof code === "string" && /^\d{6}$/.test(code.trim()), "code", "Enter the 6-digit code");
    v.throwIfInvalid();

    const session = await authService.verifyEmail(role, normalizeEmail(email), code.trim());
    response(res, 200, "success", "Email verified", session);
});

const resendVerification = catchAsync(async (req, res) => {
    const { role = "doctor", email } = req.body;
    const v = new Validator();
    v.email(email);
    v.throwIfInvalid();

    await authService.resendVerification(role, normalizeEmail(email));
    response(res, 200, "success", "If the account needs verification, a new code has been sent.");
});

module.exports = {
    login,
    logout,
    me,
    changePassword,
    forgotPassword,
    resetPassword,
    verifyEmail,
    resendVerification,
};
