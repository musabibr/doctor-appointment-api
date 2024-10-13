const validator = require("validator");
const response = require("../middleware/response");
const adminService = require("../services/adminService");
const { encryptData, compareData } = require("../util/hashData");
const _ = require("lodash");
const JWTUtil = require("../middleware/jwt");
const logger = require('../util/logger');

class AdminController {
    async register(req, res) {
        let { name, email, password } = req.body;
        if (!name || !email || !password) {
            return response(res, 400, "fail", "All fields are required");
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
            if(await adminService.findAdminByEmail(email)) {
                return response(res, 409, "fail", "Admin already exists");
            }
            password = await encryptData(password);
            const admin = await adminService.createAdmin({
                name,
                email,
                password,
            });
            const sanitizedData = _.omit(admin.toObject(), ["password", "__v"]);
            response(res, 201, "success", "Admin created successfully", sanitizedData);
        } catch (error) {
            console.log(error)
            response(res, 500, "fail", "Something went wrong");
        }
    }

    async login(req, res) {
        const { email, password } = req.body;
        if (!email || !password) {
            return response(res, 400, "fail", "All fields are required");
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
            const admin = await adminService.findAdminByEmail(email);
            if (admin === 404) {
                return response(res, 404, "fail", "No account found, please register");
            }
            const isMatch = await compareData(password, admin.password);
            if (!isMatch) {
                return response(res, 400, "fail", "Invalid credentials");
            }
            const sanitizedData = _.omit(admin.toObject(), ["password", "__v"]);
            const token = JWTUtil.generateToken(sanitizedData);
            res.cookie("token", token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                maxAge:3600000*24*30
            });
            
            response(res, 200, "success", "Admin logged in successfully", sanitizedData);
        } catch (error) {
            console.log(error)
            response(res, 500, "fail", "Something went wrong");
        }
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

            const admin = await adminService.getAdminById(decodedToken._id);
            if (!admin) {
            logger.warn(`Admin not found with ID: ${decodedToken._id}`);
            return response(res, 401, "fail", "Unauthorized: Admin not found");
            }
            req.admin = _.omit(admin.toObject(), ["password", "__v"]);
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
}
module.exports = new AdminController()