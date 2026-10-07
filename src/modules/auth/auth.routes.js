const express = require("express");
const { protect } = require("../../shared/auth/protect");
const { loginLimiter, sensitiveLimiter } = require("../../shared/http/rateLimiters");
const authController = require("./auth.controller");

const router = express.Router();

router.post("/login", loginLimiter, authController.login);
router.post("/forgot-password", sensitiveLimiter, authController.forgotPassword);
router.post("/reset-password", sensitiveLimiter, authController.resetPassword);
router.post("/verify-email", sensitiveLimiter, authController.verifyEmail);
router.post("/resend-verification", sensitiveLimiter, authController.resendVerification);

router.post("/logout", protect(), authController.logout);
router.get("/me", protect(), authController.me);
router.patch("/me/password", protect(), authController.changePassword);

module.exports = router;
