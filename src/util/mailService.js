// services/otpService.js
const { setAsync, getAsync, delAsync, incrAsync, expireAsync } = require('../../db_config/redis_config');
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

class MailService {
    constructor() {
        this.MAX_OTP_RETRIES = 5;
        this.OTP_EXPIRY = 10 * 60; // 10 minutes in seconds
    }

    generateOTP() {
        return Math.floor(100000 + Math.random() * 900000); // 6-digit OTP
    }

    async sendEmail(email, subject, message) {
        const msg = {
            to: email,
            from: process.env.EMAIL_FROM, // Use your domain email here
            subject: subject,
            html: message,
        };
        try {
            await sgMail.send(msg);
            console.log(`Email sent to ${email}`);
        } catch (error) {
            console.error('Error sending email:', error);
        }
    }

    async sendOTP(user, email) {
        const otp = this.generateOTP();
        const redisKey = `otp:${user}`;

        // Store OTP in Redis
        await setAsync(redisKey, otp);
        await expireAsync(redisKey, this.OTP_EXPIRY);

        // Send OTP email
        const message = `<p>Your OTP is: <strong>${otp}</strong>. It will expire in 10 minutes.</p>`;
        await this.sendEmail(email, 'Your OTP Code', message);

        console.log(`OTP ${otp} stored for user: ${user}`);
    }

    async verifyOTP(user, otpInput) {
        const redisKey = `otp:${user}`;
        const storedOtp = await getAsync(redisKey);

        if (!storedOtp) {
            throw new Error('OTP expired or not found. Please request a new one.');
        }

        if (storedOtp !== otpInput) {
            const retryKey = `otp_retries:${user}`;
            const retries = await incrAsync(retryKey);
            
            if (retries > this.MAX_OTP_RETRIES) {
                await delAsync(redisKey); // Delete the OTP
                await delAsync(retryKey); // Reset retry count
                throw new Error('Max OTP retries exceeded.');
            }

            await expireAsync(retryKey, this.OTP_EXPIRY); // Retry expiry
            throw new Error(`Invalid OTP. Retry count: ${retries}`);
        }

        // OTP is valid, delete OTP and retry count from Redis
        await delAsync(redisKey);
        await delAsync(`otp_retries:${user}`);

        return true;
    }

    async sendGreetingEmail(email, userName) {
        const message = `<p>Welcome, Mr. ${userName}!</p><p>We are excited to have you on our platform.</p>`;
        await this.sendEmail(email, 'Welcome to Our Platform', message);
    }

    async sendPasswordResetEmail(email, token) {
        const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
        const message = `<p>Click the link below to reset your password:</p><a href="${resetLink}">Reset Password</a>`;
        await this.sendEmail(email, 'Password Reset Request', message);
    }

    async sendNotification(email, subject, content) {
        await this.sendEmail(email, subject, content);
    }
}

module.exports = new OTPService();
