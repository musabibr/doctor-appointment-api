// controllers/doctorController.js
const validator = require("validator");
const _ = require("lodash");
const doctorService = require("../services/doctor/doctorService");
const response = require("../middleware/response");
// const { uploadMultipleImages } = require("../util/cloudinary");
const JWTUtil = require("../middleware/jwt");
const { compareData } = require("../util/hashData");
const logger = require("../util/logger");

class DoctorController {
    async registerDoctor(req, res) {
        let { name, email, password, gender, phoneNumber, address, specialty, about ,personalID, medicalLicense ,photo } = req.body; // destructuring } = req.body;

        if (!name || !email || !password || !gender || !phoneNumber || !address || !specialty || !about || !personalID || !medicalLicense || !photo) {
            return response(res, 400, "fail", `All fields are required: ${!name ? "name," : ""}${!email ? "email," : ""}${!password ? "password," : ""}${!gender ? "gender," : ""}${!phoneNumber ? "phoneNumber," : ""}${!address ? "address," : ""}${!specialty ? "specialty," : ""}${!about ? "about" : ""} ${!personalID ? "personalID," : ""}${!medicalLicense ? "medicalLicense" : ""} ${!photo ? "photo" : ""}`);
        }

        if (
            !validator.isAlpha(name, "en-US", { ignore: " " }) ||
            name.length < 3 ||
            name.length > 30
        ) {
            return response(res, 400, "fail", "Invalid name format");
        }

        if (!validator.isEmail(email)) {
            return response(res, 400, "fail", "Invalid email address");
        }
        if (password.length < 8) {
            return response(
                res,
                400,
                "fail",
                "Password must be at least 8 characters"
            );
        }
        if (!["male", "female"].includes(gender.trim().toLowerCase())) {
            return response(res, 400, "fail", 'Gender must be "male" or "female"');
        }
        if(!validator.isMobilePhone(phoneNumber)){
            return response(res, 400, "fail", "Invalid phone number");
        }
        if(!validator.isAlpha(address, "en-US", { ignore: " " } || address.length < 3 || address.length > 50)){
            return response(res, 400, "fail", "Invalid address");
        }
        if(!validator.isAlpha(specialty, "en-US", { ignore: " " }) || specialty.length < 3 || specialty.length > 50){
            return response(res, 400, "fail", "Invalid specialty");
        }
        if (!validator.isAlpha(about, "en-US", { ignore: " " }) || about.length > 100) {
            return response(res, 400, "fail", "Invalid about");
        }
        if(!validator.isURL(personalID)){
            return response(res, 400, "fail", "Invalid personal ID");
        }
        if(!validator.isURL(medicalLicense)){
            return response(res, 400, "fail", "Invalid medical license");
        }
        if (!validator.isURL(photo)) {
            return response(res, 400, "fail", "Invalid photo URL");
        }
        
        try {
            // Register the doctor and send OTP
            const doctor = await doctorService.registerDoctor({
                name, email, password, gender, phoneNumber, address, specialty, about ,personalID, medicalLicense
            });

            if (doctor === 'exist') {
                return response(res, 400, 'fail', 'You already have an account with this email. Please login.');
            }

            return response(res, 201, 'success', 'Doctor registered successfully. An OTP has been sent to your email for verification.', doctor);
        } catch (error) {
            console.error(error);
            return response(res, 500, 'fail', error.message);
        }
    }

    async login(req, res, next) {
        const { email, password } = req.body;

        if (!email || !password) {
        return response(res, 400, "fail", "Email and password are required");
        }
        if (!validator.isEmail(email)) {
        return response(res, 400, "fail", "Invalid email address");
        }
        if (password.length < 8) {
        return response(
            res,
            400,
            "fail",
            "Password must be at least 8 characters"
        );
        }

        try {
        const doctor = await doctorService.loginDoctor(email);
        if (doctor === 404) {
            return response(res, 404, "fail", "No account found, please register");
        }

        const isMatch = await compareData(password, doctor.password);
        if (!isMatch) {
            return response(res, 400, "fail", "Invalid credentials");
        }

        const sanitizedDoctor = _.omit(doctor.toObject(), [
            "password",
            "imgPId",
            "__v",
        ]);
        const token = JWTUtil.generateToken(doctor.toObject());

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 3600000, // 1 hour
        });

        req.doctor = sanitizedDoctor;
        response(res, 200, "success", "Logged in successfully", sanitizedDoctor);
        } catch (error) {
            console.log(error);
            
            return response(res, 500, "fail", "Login failed");
        }
        // next();
    }

    async protected(req, res, next) {
        let token;

        try {
        if (
            req.headers.authorization &&
            req.headers.authorization.startsWith("Bearer")
        ) {
            token = req.headers.authorization.split(" ")[1];
            const decodedToken = await JWTUtil.verifyToken(token);

            const doctor = await doctorService.getDoctorById(decodedToken._id);
            if (!doctor) {
            logger.warn(`Doctor not found with ID: ${decodedToken._id}`);
            return response(res, 401, "fail", "Unauthorized: Doctor not found");
            }

            req.doctor = _.omit(doctor.toObject(), ["password","isApproved", "__v","personalID","medicalLicense"]);
            next();
        } else {
            logger.warn("Unauthorized access attempt: Missing or invalid token");
            return response(
            res,
            401,
            "fail",
            "Unauthorized: Missing or invalid token"
            );
        }
        } catch (error) {
        logger.error("Error in token validation:", error);
        return response(
            res,
            500,
            "fail",
            `Something went wrong: ${error.message}`
        );
        }
    }

    async logout(req, res) {
        try {
        const token = req.headers.authorization.split(" ")[1];
        const decodedToken = await JWTUtil.verifyToken(token);
        const timeRemaining = 1 || decodedToken.exp - Math.floor(Date.now() / 1000);

        await JWTUtil.blacklistToken(token,timeRemaining );
        logger.info("Token blacklisted successfully");

        response(res, 200, "success", "Logged out and token blacklisted");
        } catch (error) {
            console.log(error)
            response(res, 500, "fail", "Logout failed");
        }
    }

    // Resend OTP
    async resendOtp(req, res) {
        const { email } = req.body;

        if (!email) {
            return response(res, 400, 'fail', 'Email is required.');
        }

        try {
            await doctorService.resendOtp(email);
            return response(res, 200, 'success', 'A new OTP has been sent to your email for verification.');
        } catch (error) {
            return response(res, 400, 'fail', error.message);
        }
    }

    // Verify OTP
    async verifyOtp(req, res) {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return response(res, 400, 'fail', 'Email and OTP are required.');
        }

        try {
            const result = await doctorService.verifyDoctor(email, otp);
            return response(res, result.valid ? 200 : 400, result.valid ? 'success' : 'fail', result.message);
        } catch (error) {
            console.error(error);
            return response(res, 500, 'fail', 'Error verifying OTP.');
        }
    }
    // Add Availability
    async addAvailability(req, res) {
        const { doctorId, date, hours, maxPatients } = req.body;

        if (!doctorId || !date || !hours || !Array.isArray(hours)) {
            return response(res, 400, 'fail', 'Doctor ID, date, and hours are required.');
        }

        if (!validator.isDate(date)) {
            return response(res, 400, 'fail', 'Invalid date format.');
        }

        if (hours.some(hour => !hour.start || !hour.end || !/^\d{2}:\d{2}$/.test(hour.start) || !/^\d{2}:\d{2}$/.test(hour.end))) {
            return response(res, 400, 'fail', 'Invalid time format for hours. Use HH:MM.');
        }

        try {
            const availability = await doctorService.addAvailability(doctorId, { date, hours, maxPatients });
            return response(res, 201, 'success', 'Availability added successfully', availability);
        } catch (error) {
            return response(res, 500, 'fail', `Failed to add availability: ${error.message}`);
        }
    }

    // Update Availability
    async updateAvailability(req, res) {
        const { doctorId, availabilityId, date, hours, maxPatients } = req.body;

        if (!doctorId || !availabilityId || !date || !hours || !Array.isArray(hours)) {
            return response(res, 400, 'fail', 'Doctor ID, availability ID, date, and hours are required.');
        }

        if (!validator.isDate(date)) {
            return response(res, 400, 'fail', 'Invalid date format.');
        }

        if (hours.some(hour => !hour.start || !hour.end || !/^\d{2}:\d{2}$/.test(hour.start) || !/^\d{2}:\d{2}$/.test(hour.end))) {
            return response(res, 400, 'fail', 'Invalid time format for hours. Use HH:MM.');
        }

        try {
            const availability = await doctorService.updateAvailability(doctorId, availabilityId, { date, hours, maxPatients });
            return response(res, 200, 'success', 'Availability updated successfully', availability);
        } catch (error) {
            return response(res, 500, 'fail', `Failed to update availability: ${error.message}`);
        }
    }

    // Delete Availability
    async deleteAvailability(req, res) {
        const { doctorId, availabilityId } = req.body;

        if (!doctorId || !availabilityId) {
            return response(res, 400, 'fail', 'Doctor ID and availability ID are required.');
        }

        try {
            await doctorService.deleteAvailability(doctorId, availabilityId);
            return response(res, 200, 'success', 'Availability deleted successfully');
        } catch (error) {
            return response(res, 500, 'fail', `Failed to delete availability: ${error.message}`);
        }
    }

    // Get Availability
    async getAvailability(req, res) {
        const { doctorId } = req.params;

        if (!doctorId) {
            return response(res, 400, 'fail', 'Doctor ID is required.');
        }

        try {
            const availability = await doctorService.getAvailability(doctorId);
            return response(res, 200, 'success', 'Availability retrieved successfully', availability);
        } catch (error) {
            return response(res, 500, 'fail', `Failed to retrieve availability: ${error.message}`);
        }
    }
}


module.exports = new DoctorController();