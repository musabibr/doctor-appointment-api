// File: email.js

const sendgrid = require("@sendgrid/mail");
const pug = require("pug");
const { convert } = require("html-to-text");
const crypto = require("crypto");
const OtpModel = require("../models/otpModel"); // Assuming you have this model set up for MongoDB

// Set the SendGrid API key
sendgrid.setApiKey(process.env.SENDGRID_API_KEY);

const MAX_RETRIES = 5; // Maximum allowed OTP retries

module.exports = class Email {
    constructor(user, url) {
        this.to = user.email;
        this.firstName = user.name?.split(" ")[0];
        this.url = url;
        this.from = `Psychotherapist <${process.env.EMAIL_FROM}>`;
    }

    // Generate a 6-digit OTP
    static generateOtp() {
        return crypto.randomInt(100000, 999999).toString();
    }

    // Send the actual email using SendGrid
    async send(template, subject, other = "") {
        try {
        // 1) Render HTML based on a pug template
        const html = pug.renderFile(
            `${__dirname}/../views/${template}.pug`,
            {
            firstName: this.firstName,
            url: this.url,
            code: other, // OTP or other code
            subject,
            }
        );

        // 2) Define email options
        const mailOptions = {
            from: this.from,
            to: this.to,
            subject,
            html,
            text: convert(html, { wordwrap: 130 }),
        };

        // 3) Send email with SendGrid
        await sendgrid.send(mailOptions);
        } catch (error) {
        console.error("Error sending email:", error);
        throw new Error("There was an issue sending the email.");
        }
    }

    // Send OTP email and store OTP in the database
    async sendOtp() {
        const otp = Email.generateOtp(); // Generate OTP

        // Save OTP to the database with a timestamp and initialize retries
        try {
        await OtpModel.create({
            email: this.to,
            otp,
            createdAt: Date.now(),
            retries: 0, // Initialize retries to 0
        });

        // Send OTP email
        await this.send("otp", "Your OTP Code", otp);
        } catch (error) {
        console.log(error);
        }
    }

    // Verify OTP from the database with a max of 5 retries
    static async verifyOtp(email, otp) {
        try {
        // Find the OTP in the database
        const otpEntry = await OtpModel.findOne({ email }).sort({
            createdAt: -1,
        });

        if (!otpEntry) {
            return { valid: false, message: "OTP not found." };
        }

        // Check if the number of retries has exceeded the limit
        if (otpEntry.retries >= MAX_RETRIES) {
            await OtpModel.deleteOne({ _id: otpEntry._id }); // Remove OTP after max retries
            return {
            valid: false,
            message: "Maximum retry limit reached. OTP invalidated.",
            };
        }

        // Check OTP validity (valid for 10 minutes)
        const isExpired = Date.now() - otpEntry.createdAt > 10 * 60 * 1000;

        if (isExpired) {
            await OtpModel.deleteOne({ _id: otpEntry._id }); // Remove expired OTP
            return { valid: false, message: "OTP expired." };
        }

        // Check if the OTP matches
        if (otpEntry.otp === otp) {
            await OtpModel.deleteOne({ _id: otpEntry._id }); // Remove OTP after successful verification
            return { valid: true, message: "OTP verified successfully." };
        } else {
            // Increment retries
            otpEntry.retries += 1;
            await otpEntry.save();

            return { valid: false, message: "Invalid OTP. Please try again." };
        }
        } catch (error) {
        console.error("Error verifying OTP:", error);
        return { valid: false, message: "Error during OTP verification." };
        }
    }

    async sendWelcome() {
        try {
        await this.send("welcome", "Welcome to the Doctorri Family!");
        } catch (error) {
        console.log(error);
        }
    }

    async sendPasswordReset() {
        try {
        await this.send(
            "passwordReset",
            "Your password reset token (valid for only 10 minutes)"
        );
        } catch (error) {
        console.log(error);
        }
    }
};
