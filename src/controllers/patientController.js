// controllers/patientController.js
const patientService = require("../services/patientService");
const validator = require("validator");
const response = require("../middleware/response");
const JWTUtil = require("../middleware/jwt");
const {upload, uploadSingleImage} = require('../middleware/imageUploader')
class PatientController {
    async register(req, res) {
        try {
            let { name, email, password, gender } = req.body;
            let photo;
            if (!name || !email || !password || !gender) {
                return response(res,400,'fail',`please fill all the required fields: ${!name ? "name," : ""} ${!email ? "email," : ""} ${!password ? "password," : ""} ${!gender ? "gender" : ""}`);
            }
            if (!validator.isAlpha(name, "en-US", { ignore: " " })) {
                return response(res,400,'fail','Name must contain only letters');
            }
            if (name.length < 3 || name.length > 30) {
                return response(res,400,'fail','Name must be between 3 and 30 characters long');
            }
            if (!validator.isEmail(email)) {
                return response(res,400,'fail','Invalid email address');
            }
            if (password.length < 8) {
                return response(res,400,'fail','Password must be at least 8 characters long');
            }
            if (!['male', 'female'].includes(gender.trim().toLowerCase())) {
                return response(res,400,'fail','Gender must be "male" or "female"');
            }
            gender = gender.trim().toLowerCase();
            let patient = await patientService.registerPatient({ name, email, password, gender });
            if (patient === 11001) {
                return response(res,400,'fail','Email already in use');
            }
            if(req.file){
                upload.single("image");
                req.body.id = patient._id;
                const results = await uploadSingleImage(req,res);
                patient.photo = results.secure_url;
                patient.imageId = results.public_id;

                patient = await patient.save();
                if (!patient) {
                    return response(res,500,'fail','Unable to upload you image try again later');   
                }   
                req.body.id= undefined;
            }
            patient.password = undefined;
            patient.__v = undefined;
            const token = JWTUtil.generateToken(patient);
            res.cookie("token", token, {
                httpOnly: true, // Ensure it's accessible only via HTTP (not client-side JS)
                secure: process.env.NODE_ENV === "production", // Set secure only in production
                maxAge: 3600000 * 24 * 30 // 30 days expiration
            })
            response(res, 201, 'success', 'Patient registered successfully', patient);
        } catch (error) {
            console.log('====================================');
            console.log(error);
            console.log('====================================');
            response(res,500,'fail','something went wrong');
        }
    }

    async login(req, res) {
        const { email, password } = req.body;
        try {
            const { patient, token } = await patientService.loginPatient(email, password);
            
            // Set token as a cookie
            res.cookie("token", token, {
                httpOnly: true, // Ensure it's accessible only via HTTP (not client-side JS)
                secure: process.env.NODE_ENV === "production", // Set secure only in production
                maxAge: 3600000 // 1 hour expiration
            });
            
            res.status(200).json({ message: "Login successful", patient });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    async getPatient(req, res) {
        try {
            const patient = await patientService.getPatientById(req.params.id);
            if (!patient) {
                return res.status(404).json({ error: "Patient not found" });
            }
            res.status(200).json(patient);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    async updatePatient(req, res) {
        try {
            const patient = await patientService.updatePatient(req.params.id, req.body);
            if (!patient) {
                return res.status(404).json({ error: "Patient not found" });
            }
            res.status(200).json(patient);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    async deletePatient(req, res) {
        try {
            await patientService.deletePatient(req.params.id);
            res.status(204).send();
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    async logout(req, res) {
        // Clear the cookie and logout
        res.clearCookie("token");
        res.status(200).json({ message: "Logout successful" });
    }
}

module.exports = new PatientController();
