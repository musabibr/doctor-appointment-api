const nodemailer = require('nodemailer');
const logger = require('./logger');

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            service: process.env.MAIL_SERVICE, // You can use other services like 'smtp' or custom services
            auth: {
                user: process.env.EMAIL_USER, // Your email
                pass: process.env.EMAIL_PASS  // Your email password or app-specific password
            }
        });
    }

    async sendResetToken(email, token) {
        try {
            const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Password Reset',
                text: `You requested a password reset. Click the link below to reset your password: \n\n ${resetUrl} \n\n If you did not request this, please ignore this email.`,
                html: `<p>You requested a password reset. Click the link below to reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you did not request this, please ignore this email.</p>`
            };

            await this.transporter.sendMail(mailOptions);
            logger.info(`Password reset email sent to ${email}`);
        } catch (error) {
            logger.error(`Failed to send reset email: ${error.message}`);
            throw new Error('Failed to send reset email');
        }
    }
}

module.exports = new EmailService();
