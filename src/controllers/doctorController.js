// controllers/doctorController.js
const validator = require("validator");
const doctorService = require("../services/doctor/doctorService");
const response = require("../middleware/response");
const hashData = require("../util/hashData");
const { uploadMultipleImages} = require("../util/cloudinary");

class DoctorController {
    async registerDoctor(req, res) {
        let { name, email, password, gender, phoneNumber, address, specialty, about } = req.body;

        if (!name || !email || !password || !gender || !phoneNumber || !address || !specialty || !about) {
            return response(res, 400, "fail", `All fields are required: ${!name ? "name," : ""}${!email ? "email," : ""}${!password ? "password," : ""}${!gender ? "gender," : ""}${!phoneNumber ? "phoneNumber," : ""}${!address ? "address," : ""}${!specialty ? "specialty," : ""}${!about ? "about" : ""}`);
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
        
        try {
            password = await hashData.encryptData(password);

            const doctorData = {
                name,
                email,
                password,
                gender,
                phoneNumber,
                address,
                specialty,
                about,
            };
            doctor = await doctorService.registerDoctor(doctorData);
            if (doctor === 'exist') {
                return response(res,400,'fail','You already have account with this email please login.')
            }
            console.log("doctor:", doctor)
            response(res, 201, "success", "Doctor registered successfully",doctor);
        } catch (error) {
            // logger.error(error); 
            console.log(error)
            response(res, 500, "fail", error.message);
        }
    }

    async verifyDoctor(req, res) {
        try {
            const doctor = await doctorService.verifyDoctorEmail(req.params.id, req.body.otp);
            res.status(200).json(doctor);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    async searchDoctors(req, res) {
        try {
            const doctors = await doctorService.searchDoctors(req.query);
            res.status(200).json(doctors);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    async updateDoctorAvailability(req, res) {
        try {
            const doctor = await doctorService.updateDoctorAvailability(req.params.id, req.body.isAvailable);
            res.status(200).json(doctor);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    async resendOtp(req, res) {
        try {
            const doctor = await doctorService.resendOtp(req.params.id);
            res.status(200).json(doctor);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
}

module.exports = new DoctorController();
