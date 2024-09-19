const PatientRepo = require('../repository/patientRepo');
const validator = require('validator');
const response = require('../../../middleware/response');

exports.signup = async (req, res,next) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return response(res, 400, 'fail', 'Please provide name, email and password');
    }
    if (!validator.isAlpha(name, 'en-US', { ignore: ' ' })) {
        return response(res, 400, 'fail', 'Name must only contain alphabets');
    }
    if(name.length < 3 || name.length > 30) {
        return response(res, 400, 'fail', 'Name must be between 3 and 30 characters');
    }
    if (!validator.isEmail(email)) {
        return response(res, 400, 'fail', 'Please provide a valid email');
    }
    if(!validator.isStrongPassword(password, { minSymbols: 0, minNumbers: 0, minUppercase: 0, minLowercase: 0 })) {
        return response(res, 400, 'fail', 'Password must be between 8 and 20 characters.');
    }
    if (req.file) {
        const fileType = req.file.mimetype;
        console.log(fileType);
        if (!fileType.startsWith('image/')) {
            return response(res, 400, 'fail', 'File must be an image');
        }
    }
    try {
        let patient = await  PatientRepo.getPatient(email);
        if (patient) {
            return response(res, 409, 'fail', 'Patient already exists');
        }
        patient = await PatientRepo.createPatient({ name, email, password });
        patient.password = undefined;
        patient.__v = undefined;
        return response(res, 201, 'success', 'Patient created successfully', patient);
    } catch (error) {
        console.log(error.message);
        return response(res, 500, 'fail', 'Something went wrong');
    }
} 

exports.login = async (req, res, next) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return response(res, 400, 'fail', 'Please provide email and password');
    }
    try {
        const patient = await PatientRepo.getPatient(email);
        if (!patient) {
            return response(res, 404, 'fail', 'Patient not found');
        }
        if (password !== patient.password) {
            return response(res, 401, 'fail', 'Incorrect password');
        }
        patient.password = undefined;
        patient.__v = undefined;
        return response(res, 200, 'success', 'Login successful', patient);
    } catch (error) {
        console.log(error.message);
        return response(res, 500, 'fail', 'Something went wrong');
    }
}

exports.updatePassword = async (req, res, next) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return response(res, 400, 'fail', 'Please provide email and password');
    }
    try {
        const patient = await PatientRepo.getPatient(email);
        if (!patient) {
            return response(res, 404, 'fail', 'Patient not found');
        }
        const updatedPatient = await PatientRepo.updatePassword(patient._id, password);
        updatedPatient.password = undefined;
        updatedPatient.__v = undefined;
        return response(res, 200, 'success', 'Password updated successfully', updatedPatient);
    } catch (error) {
        console.log(error.message);
        return response(res, 500, 'fail', 'Something went wrong');
    }
}

exports.deletePatient = async (req, res, next) => {
    const { id } = req.params;
    if (!id) {
        return response(res, 400, 'fail', 'Please provide id');
    }
    try {
        const patient = await PatientRepo.getPatientById(id);
        if (!patient) {
            return response(res, 404, 'fail', 'Patient not found');
        }
        const deletedPatient = (await PatientRepo.deletePatient(id)) || false
        if (!deletedPatient) {
            return response(res, 500, 'fail', 'Something went wrong');
        }

        return response(res, 200, 'success', 'Patient deleted successfully');
    } catch (error) {
        console.log(error.message);
        return response(res, 500, 'fail', 'Something went wrong');
    }
}

