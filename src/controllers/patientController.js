const patientService = require("../services/patientService");
const validator = require("validator");
const path = require("path");
const _ = require("lodash");
const response = require("../middleware/response");
const JWTUtil = require("../middleware/jwt");
const { uploadSingleImage } = require("../util/cloudinary");
const { encryptData, compareData } = require("../util/hashData");

// Allowed image types
const allowedImageTypes = ['.jpg', '.jpeg', '.png'];
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 5 MB

// Helper function to validate image type
const isValidImageType = (filename) => {
    const ext = path.extname(filename).toLowerCase();
    return allowedImageTypes.includes(ext);
};

class PatientController {
    /**
     * @api {post} /patient/signup Register Patient
     * @apiName RegisterPatient
     * @apiGroup Patient
     * @apiDescription Register a new patient
     * @apiParam {String} name Patient name
     * @apiParam {String} email Patient email
     * @apiParam {String} password Patient password
     * @apiParam {String} gender Patient gender
     * @apiParam {File} image Patient image
     * @apiSuccess {String} status Status of the response
     * @apiSuccess {String} message Message describing the response
     * @apiSuccess {Object} data Patient data
     * @apiSuccess {String} data._id Patient id
     * @apiSuccess {String} data.name Patient name
     * @apiSuccess {String} data.email Patient email
     * @apiSuccess {String} data.gender Patient gender
     * @apiSuccess {String} data.photo Patient photo
     * @apiSuccess {String} data.imgPId Patient image public id
     * @apiSuccessExample {json} Success-Response:
     * {
     *     "status": "success",
     *     "message": "Patient registered successfully",
     *     "data": {
     *         "_id": "5f7a7a7a7a7a7a7a7a",
     *         "name": "John Doe",
     *         "email": "john@example.com",
     *         "gender": "male",
     *         "photo": "https://example.com/default-image.jpg",
     *         "imgPId": "default-image.jpg"
     *     }
     * }
     * @apiErrorExample {json} Error-Response:
     * {
     *     "status": "fail",
     *     "message": "You already have an account with this please login!"
     * }
     */
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

                password = await encryptData(password);
                
                let patient = await patientService.registerPatient({ name, email, password, gender });
                if (patient === 11001) {
                    return response(res,400,'fail','You already have an account with this please login!');
                }
                if (req.file) {
                    req.body.id = patient._id;
                    const imageBuffer = req.file.buffer;
                    const filename = req.file.originalname;

                    // Validate image type and size 
                    if (!isValidImageType(filename)) {
                        return res.status(400).json({ success: false, message: `Invalid image type. Allowed types are: ${allowedImageTypes.join(", ")}` });
                    }
                    if (imageBuffer.length > MAX_IMAGE_SIZE) {
                        return res.status(400).json({ success: false, message: "Image exceeds maximum size of 5 MB." });
                    }
                    const results = await uploadSingleImage(imageBuffer, req.body.id);
                    
                    if(!results) {
                        return response(res,500,'fail','failed to upload image please try again');
                    }
                    photo = results.secure_url;
                    patient.photo = photo;
                    patient.imgPId = results.public_id;
                    await patient.save();
                    req.body.id = undefined;
                }
                const sanitizedPatient = _.omit(patient.toObject(), ["password", "imgPId","__v"]);
                const token = JWTUtil.generateToken(patient);
                
                res.cookie("token", token, {
                    httpOnly: true, // Ensure it's accessible only via HTTP (not client-side JS)
                    secure: process.env.NODE_ENV === "production", // Set secure only in production
                    maxAge: 3600000 * 24 * 30 // 30 days expiration
                })
                response(res, 201, 'success', 'Patient registered successfully', sanitizedPatient);
            } catch (error) {
                console.log('====================================');
                console.log(error);
                console.log('====================================');
                response(res,500,'fail','something went wrong');
        }
    }
    async login(req, res,next) {
        let { email, password } = req.body;
        if(!email || !password) {
            return response(res,400,'fail',`please fill all the required fields: ${!email ? "email! " : ""} ${!password ? "password!" : ""}`);
        }
        if(!validator.isEmail(email)) {
            return response(res,400,'fail','Invalid email address');
        }
        if(password.length < 8) {
            return response(res,400,'fail','Password must be at least 8 characters long');
        }
        try {
            const patient = await patientService.loginPatient(email);
            if(patient === 404) {
                return response(res,404,'fail','You do not have an account please register');
            }

            const isMatch = await compareData(password, patient.password);
            if(!isMatch) {
                return response(res,400,'fail','Invalid credentials');
            }
            const sanitizedPatient = _.omit(patient.toObject(), ["password", "imgPId","__v"]);
            const token = JWTUtil.generateToken(patient);
            // Set token as a cookie
            res.cookie("token", token, {
                httpOnly: true, // Ensure it's accessible only via HTTP (not client-side JS)
                secure: process.env.NODE_ENV === "production", // Set secure only in production 
                maxAge: 3600000 // 1 hour expiration
            });
            req.patient = sanitizedPatient
            response(res, 200, 'success', 'Patient logged in successfully', sanitizedPatient);
            
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
        next()
    }
    
    async protected(req, res, next) {
    let token, patient, id ,sanitizedPatient;
    try {
        // Check if authorization header exists
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            // Extract token from Authorization header
            token = req.headers.authorization.split(' ')[1];

            // Verify the JWT token
            const decodedToken = JWTUtil.verifyToken(token);

            // Get patient ID from decoded token
            id = decodedToken._id;

            // Fetch the patient details from the database
            patient = await patientService.getPatientById(id);

            // If the patient doesn't exist, return an unauthorized error
            if (!patient) {
                return response(res, 401, 'fail', 'Unauthorized: Patient not found');
            }
        } else {
            // If Authorization header is missing or doesn't start with 'Bearer', return unauthorized
            return response(res, 401, 'fail', 'Unauthorized: Missing or invalid token');
        }
        sanitizedPatient = _.omit(patient.toObject(), ["password", "imgPId", "__v"]);
        res.cookie("token", token, {
            httpOnly: true, // Ensure it's accessible only via HTTP (not client-side JS)
            secure: process.env.NODE_ENV === "production", // Set secure only in production
            maxAge: 3600000 * 24 * 30 // 30 days expiration
        })
    } catch (error) {
        // If token verification fails or any other error occurs, log the error and respond with 500
        console.error('Error in token validation:', error.message);
        return response(res, 500, 'fail', 'Something went wrong: ' + error.message);
    }

    // Attach the patient object to the request for further use in the next middleware or route
    req.patient = sanitizedPatient; 

    // Proceed to the next middleware or route handler
    next();
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
