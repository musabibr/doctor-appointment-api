const crypto = require("crypto");
const env = require("../../shared/config/env");
const AppError = require("../../shared/errors/AppError");
const { getAccountProvider } = require("../../shared/auth/accountRegistry");
const { signToken } = require("../../shared/auth/token");
const { encryptData, compareData, sha256, randomToken } = require("../../shared/utils/hash");
const { sendOtp, sendPasswordReset } = require("../../shared/email/email");
const { assertNotProtectedDemoAccount } = require("../../shared/demo/accounts");
const otpRepository = require("./otp.repository");

const MAX_OTP_ATTEMPTS = 5;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

const providerFor = (role) => {
    const provider = getAccountProvider(role);
    if (!provider) throw AppError.validation({ role: "Choose a valid account type" });
    return provider;
};

const session = (account, role) => ({ token: signToken(account, role), role, user: account });

class AuthService {
    async login({ role, email, password }) {
        const provider = providerFor(role);
        const account = await provider.findByEmailWithPassword(email);
        if (!account || !(await compareData(password, account.password))) {
            throw AppError.unauthorized("Incorrect email or password", "INVALID_CREDENTIALS");
        }
        if (provider.requiresEmailVerification && !account.isVerified) {
            await this.sendVerificationCode(role, account, { respectCooldown: true });
            throw AppError.forbidden(
                "Please verify your email first. We sent a 6-digit code to your inbox.",
                "EMAIL_NOT_VERIFIED"
            );
        }
        return session(account, role);
    }

    // Invalidates every token issued to this account (all devices).
    async logout(role, accountId) {
        await providerFor(role).revokeSessions(accountId);
    }

    async changePassword(role, accountId, { currentPassword, newPassword }) {
        const provider = providerFor(role);
        const account = await provider.findByIdWithPassword(accountId);
        if (!account || !(await compareData(currentPassword, account.password))) {
            throw AppError.validation({ currentPassword: "Current password is incorrect" });
        }
        assertNotProtectedDemoAccount(account.email, "change their password");
        await provider.setPassword(accountId, await encryptData(newPassword));
        // Other sessions are signed out; this one gets a fresh token.
        return session(await provider.findById(accountId), role);
    }

    // Always resolves the same way so the response does not reveal whether the email exists.
    async forgotPassword(role, email) {
        const provider = providerFor(role);
        if (!provider.canResetPassword) {
            throw AppError.badRequest("Password reset by email is not available for this account type");
        }
        assertNotProtectedDemoAccount(email, "reset their password");
        const account = await provider.findByEmail(email);
        if (!account) return;

        const token = randomToken();
        await provider.setResetToken(account._id, sha256(token), new Date(Date.now() + RESET_TOKEN_TTL_MS));
        const url = `${env.CLIENT_URL}/reset-password?token=${token}&role=${role}`;
        await sendPasswordReset(account, url);
    }

    async resetPassword(role, token, password) {
        const provider = providerFor(role);
        const account = await provider.findByResetToken(sha256(token));
        if (!account) {
            throw AppError.badRequest("This reset link is invalid or has expired. Please request a new one.");
        }
        await provider.setPassword(account._id, await encryptData(password));
        // Opening the emailed link proves the person owns the address.
        if (provider.requiresEmailVerification && !account.isVerified) {
            await provider.markEmailVerified(account._id);
        }
    }

    async sendVerificationCode(role, account, { respectCooldown = false } = {}) {
        if (respectCooldown) {
            const latest = await otpRepository.findLatest(role, account.email);
            if (latest && Date.now() - latest.createdAt.getTime() < OTP_RESEND_COOLDOWN_MS) return false;
        }
        const code = crypto.randomInt(100000, 1000000).toString();
        await otpRepository.replace(role, account.email, sha256(code));
        await sendOtp(account, code);
        return true;
    }

    // Silent when the account does not exist or is already verified.
    async resendVerification(role, email) {
        const provider = providerFor(role);
        if (!provider.requiresEmailVerification) return;
        const account = await provider.findByEmail(email);
        if (!account || account.isVerified) return;

        const sent = await this.sendVerificationCode(role, account, { respectCooldown: true });
        if (!sent) {
            throw new AppError("Please wait a minute before requesting another code", 429, { code: "OTP_COOLDOWN" });
        }
    }

    async verifyEmail(role, email, code) {
        const provider = providerFor(role);
        if (!provider.requiresEmailVerification) throw AppError.badRequest("This account type does not need email verification");

        const account = await provider.findByEmail(email);
        if (!account) throw AppError.badRequest("Invalid or expired code", { code: "Invalid or expired code" });
        if (account.isVerified) {
            throw AppError.conflict("Your email is already verified, please log in", "ALREADY_VERIFIED");
        }

        const otp = await otpRepository.findLatest(role, email);
        if (!otp) throw AppError.badRequest("This code has expired. Please request a new one.", { code: "Code expired" });

        if (otp.otpHash !== sha256(code)) {
            const updated = await otpRepository.incrementAttempts(otp._id);
            const left = MAX_OTP_ATTEMPTS - (updated ? updated.attempts : MAX_OTP_ATTEMPTS);
            if (left <= 0) {
                await otpRepository.deleteAll(role, email);
                throw AppError.badRequest("Too many incorrect attempts. Please request a new code.", {
                    code: "Too many attempts",
                });
            }
            throw AppError.badRequest(`Incorrect code. ${left} attempt${left === 1 ? "" : "s"} left.`, {
                code: "Incorrect code",
            });
        }

        await provider.markEmailVerified(account._id);
        await otpRepository.deleteAll(role, email);
        return session(await provider.findById(account._id), role);
    }

    // Public API: used by modules that create accounts needing email verification.
    issueEmailVerification(role, account) {
        return this.sendVerificationCode(role, account);
    }
}

module.exports = new AuthService();
