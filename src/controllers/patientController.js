const patientService = require("../services/patientService");
const validator = require("validator");
const _ = require("lodash");
const response = require("../middleware/response");
const JWTUtil = require("../middleware/jwt");
const { encryptData, compareData } = require("../util/hashData");
const logger = require("../util/logger");
const crypto = require("crypto");
const emailService = require("../util/emailService");

    class PatientController {
    async register(req, res) {
        try {
        let { name, email, password, gender ,location ,photo} = req.body;
        if (!name || !email || !password || !gender) {
            return response(res, 400, "fail", `All fields are required: ${!name?'name':''} ${!email?'email':''} ${!password?'password':''} ${!gender?'gender':''}`);
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
        if (location) {
            if(!location.state || !validator.isAlpha(location.state, "en-US", { ignore: " " }) || location.state.length < 3 || location.state.length > 30){
                return response(res, 400, "fail", "Invalid state format");
            }
            if(!location.city || !validator.isAlpha(location.city, "en-US", { ignore: " " }) || location.city.length < 3 || location.city.length > 30){
                return response(res, 400, "fail", "Invalid city format");
            }
        }
        if (photo) {
            if(!validator.isURL(photo)){
                return response(res, 400, "fail", "Invalid photo format");
            }
        }
        password= await encryptData(password);
        const patientData = {
            name,
            email,
            password,
            gender: gender.trim().toLowerCase(),
        }
        if (photo) patientData.photo = photo;
        if(location){
            patientData.location = location;
        }
        const patient = await patientService.registerPatient(patientData);

        if (patient === 11001) {
            return response(
            res,
            400,
            "fail",
            "Account already exists, please login"
            );
        }

        

        const sanitizedPatient = _.omit(patient.toObject(), [
            "password",
            "imgPId",
            "__v",
        ]);
        const token = JWTUtil.generateToken(patient.toObject());

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 3600000 * 24 * 30, // 30 days
        });

        response(
            res,
            201,
            "success",
            "Patient registered successfully",
            sanitizedPatient
        );
        } catch (error) {
        logger.error(error);
        response(res, 500, "fail", "Something went wrong");
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
        const patient = await patientService.loginPatient(email);
        if (patient === 404) {
            return response(res, 404, "fail", "No account found, please register");
        }

        const isMatch = await compareData(password, patient.password);
        if (!isMatch) {
            return response(res, 400, "fail", "Invalid credentials");
        }

        const sanitizedPatient = _.omit(patient.toObject(), [
            "password",
            "imgPId",
            "__v",
        ]);
        const token = JWTUtil.generateToken(patient.toObject());

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 3600000, // 1 hour
        });

        req.patient = sanitizedPatient;
        response(res, 200, "success", "Logged in successfully", sanitizedPatient);
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

            const patient = await patientService.getPatientById(decodedToken._id);
            if (!patient) {
            logger.warn(`Patient not found with ID: ${decodedToken._id}`);
            return response(res, 401, "fail", "Unauthorized: Patient not found");
            }

            req.patient = _.omit(patient.toObject(), ["password", "imgPId", "__v"]);
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
        logger.error(`Logout failed: ${error.message}`, error);
        response(res, 500, "fail", "Logout failed");
        }
    }

    async updatePatient(req, res) {
        const { name, location ,photo } = req.body;

        if (!req.patient) {
        return response(res, 401, "fail", "Unauthorized: Patient not found");
        }

        try {
        const id = req.patient._id;
        let patient = await patientService.getPatientById(id);

        if (!patient) {
            return response(res, 401, "fail", "Unauthorized: Invalid credentials");
        }

        const updates = {};
        if (
            name &&
            validator.isAlpha(name, "en-US", { ignore: " " }) &&
            name.length >= 3 &&
            name.length <= 50
        ) {
            updates.name = name;
        }
        if (location && (location.state || location.city )) {
            updates.location = location;
        }
        if (photo) {
            updates.photo = photo
        }

        patient = await patientService.updatePatient(id, updates);

        const sanitizedPatient = _.omit(patient.toObject(), [
            "password",
            "imgPId",
            "__v",
        ]);
        response(
            res,
            200,
            "success",
            "Patient details updated successfully",
            sanitizedPatient
        );
        } catch (error) {
        response(res, 500, "fail", `Something went wrong: ${error.message}`);
        }
    }
    //Update Password
    async updatePassword(req, res) {
        try {
            const { oldPassword, newPassword } = req.body;

            if (!req.patient) {
                return response(res, 401, "fail", "Unauthorized: Patient not found");
            }

            if (!oldPassword || !newPassword || newPassword.length < 8) {
                return response(res, 400, "fail", "Invalid input: Password must be at least 8 characters");
            }

            const patient = await patientService.getPatientById(req.patient._id);
            if (!patient) {
                return response(res, 404, "fail", "Patient not found");
            }

            const isMatch = await compareData(oldPassword, patient.password);
            if (!isMatch) {
                return response(res, 400, "fail", "Old password is incorrect");
            }

            const encryptedNewPassword = await encryptData(newPassword);
            await patientService.updatePatient(req.patient._id, { password: encryptedNewPassword });

            response(res, 200, "success", "Password updated successfully");
        } catch (error) {
            logger.error(`Password update failed: ${error.message}`);
            response(res, 500, "fail", `Something went wrong: ${error.message}`);
        }
    }


    // Forgot Password
    async forgotPassword(req, res) {
        try {
            const { email } = req.body;

            if (!email || !validator.isEmail(email)) {
                return response(res, 400, "fail", "Valid email is required");
            }

            const patient = await patientService.getPatientByEmail(email);
            if (!patient) {
                return response(res, 404, "fail", "No account found with this email");
            }

            const resetToken = crypto.randomBytes(32).toString('hex');
            const resetTokenExpiry = Date.now() + 3600000; // 1 hour expiration

            await patientService.updatePatient(patient._id, { resetToken, resetTokenExpiry });

            // Send the email with the reset token
            await emailService.sendResetToken(email, resetToken);

            response(res, 200, "success", "Password reset token sent to email");
        } catch (error) {
            logger.error(`Forgot password failed: ${error.message}`);
            response(res, 500, "fail", `Something went wrong: ${error.message}`);
        }
    }


    //Reset Password using the Token
    async resetPassword(req, res) {
        try {
            const { token, newPassword } = req.body;

            if (!token || !newPassword || newPassword.length < 8) {
                return response(res, 400, "fail", "Invalid input: Token and password must be provided, password must be at least 8 characters");
            }

            const patient = await patientService.getPatientByResetToken(token);
            if (!patient || patient.resetTokenExpiry < Date.now()) {
                return response(res, 400, "fail", "Invalid or expired token");
            }

            const encryptedNewPassword = await encryptData(newPassword);
            await patientService.updatePatient(patient._id, { password: encryptedNewPassword, resetToken: null, resetTokenExpiry: null });

            response(res, 200, "success", "Password reset successfully");
        } catch (error) {
            logger.error(`Password reset failed: ${error.message}`);
            response(res, 500, "fail", `Something went wrong: ${error.message}`);
        }
    }

    // Get Patient
    async getPatient(req, res) {
        try {
            if (!req.patient) {
                return response(res, 401, "fail", "Unauthorized: Patient not found");
            }
            const sanitizedPatient = _.omit(req.patient.toObject(), [
                "password",
                "imgPId",
                "__v",
            ]);
            return response(res, 200, "success", "Patient retrieved successfully", sanitizedPatient);
        } catch (error) {
            return response(res, 500, "fail", `Something went wrong: ${error.message}`);
        }
    }

    // Delete Patient
    async deletePatient(req, res) {
        try {
            if (!req.patient) {
                return response(res, 401, "fail", "Unauthorized: Patient not found");
            }
            await patientService.deletePatient(req.patient._id);
            return response(res, 200, "success", "Patient deleted successfully");
        } catch (error) {
            return response(res, 500, "fail", `Something went wrong: ${error.message}`);
        }
    }
}

module.exports = new PatientController();
// 