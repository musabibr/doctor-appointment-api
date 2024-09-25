const patientService = require("../services/patientService");
const validator = require("validator");
const path = require("path");
const _ = require("lodash");
const response = require("../middleware/response");
const JWTUtil = require("../middleware/jwt");
const { uploadSingleImage } = require("../util/cloudinary");
const { encryptData, compareData } = require("../util/hashData");
const logger = require("../util/logger");

// Allowed image types
const allowedImageTypes = [".jpg", ".jpeg", ".png"];
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2 MB

// Helper function to validate image type and size
const validateImage = (file) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const validType = allowedImageTypes.includes(ext);
    const validSize = file.buffer.length <= MAX_IMAGE_SIZE;
    return { validType, validSize };
    };

    class PatientController {
    async register(req, res) {
        try {
        const { name, email, password, gender } = req.body;
        if (!name || !email || !password || !gender) {
            return response(res, 400, "fail", "All fields are required");
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

        const encryptedPassword = await encryptData(password);
        const patient = await patientService.registerPatient({
            name,
            email,
            password: encryptedPassword,
            gender: gender.trim().toLowerCase(),
        });

        if (patient === 11001) {
            return response(
            res,
            400,
            "fail",
            "Account already exists, please login"
            );
        }

        if (req.file) {
            const { validType, validSize } = validateImage(req.file);
            if (!validType) {
            return response(
                res,
                400,
                "fail",
                `Invalid image type. Allowed types: ${allowedImageTypes.join(", ")}`
            );
            }
            if (!validSize) {
            return response(
                res,
                400,
                "fail",
                "Image exceeds maximum size of 2 MB."
            );
            }

            const results = await uploadSingleImage(req.file.buffer, patient._id);
            if (!results) {
            return response(res, 500, "fail", "Image upload failed");
            }

            patient.photo = results.secure_url;
            patient.imgPId = results.public_id;
            await patient.save();
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
        const decodedToken = JWTUtil.decodeToken(token);
        const timeRemaining = decodedToken.exp - Math.floor(Date.now() / 1000);

        await JWTUtil.blacklistToken(token, timeRemaining);
        logger.info("Token blacklisted successfully");

        response(res, 200, "success", "Logged out and token blacklisted");
        } catch (error) {
        logger.error(`Logout failed: ${error.message}`, error);
        response(res, 500, "fail", "Logout failed");
        }
    }

    async updatePatient(req, res) {
        const { name, location } = req.body;

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
        if (location && location.state && location.city && location.area) {
            updates.location = location;
        }

        if (req.file) {
            const { validType, validSize } = validateImage(req.file);
            if (!validType) {
            return response(
                res,
                400,
                "fail",
                `Invalid image type. Allowed types: ${allowedImageTypes.join(", ")}`
            );
            }
            if (!validSize) {
            return response(
                res,
                400,
                "fail",
                "Image exceeds maximum size of 2 MB."
            );
            }

            const results = await uploadSingleImage(req.file.buffer, id);
            updates.photo = results.secure_url;
            updates.imgPId = results.public_id;
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
}

module.exports = new PatientController();
