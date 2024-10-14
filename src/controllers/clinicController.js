const clinicService = require("../services/doctor/clinicService");
const logger = require('../util/logger');
const doctorService = require('../services/doctor/doctorService');
const response = require("../middleware/response");
const validator = require('validator');
const mongoose = require('mongoose');
class ClinicController {

    async createClinic(req, res) {
        const { name, location, contact, services } = req.body;
        let doctorId;
        if (!req.doctor) {
            return response(res, 401, "fail", "Unauthorized: Doctor not found");
        } else {
            doctorId = req.doctor._id
        }

        // Input Validation
        if (!name || !location || !contact ) {
            return response(res, 400, "fail", `All fields are required: ${!name ? "name," : ""}${!location ? "location," : ""}${!contact ? "contact," : ""} ${!services ? "services" : ""}`);
        }

        if (!validator.isAlpha(name, "en-US", { ignore: " " }) || name.length < 3 || name.length > 30) {
            return response(res, 400, "fail", "Invalid clinic name format");
        }

        if (contact) {
            if(!contact.phone || !contact.email) {
                return response(res, 400, "fail", "Both phone and email are required");
            }
            
            if (!validator.isMobilePhone(contact.phone)) {
                return response(res, 400, "fail", "Invalid phone number");
            }
    
            if (!validator.isEmail(contact.email)) {
                return response(res, 400, "fail", "Invalid email address");
            }
        }
        if (location) {
            if(!location.city || !location.state) {
                return response(res, 400, "fail", "Both city and state are required");
            }
            if (!validator.isAlpha(location.city, "en-US", { ignore: " " }) || location.city.length < 3 || location.city.length > 30) {
                return response(res, 400, "fail", "Invalid city name format");
            }
            if (!validator.isAlpha(location.state, "en-US", { ignore: " " }) || location.state.length < 3 || location.state.length > 30) {
                return response(res, 400, "fail", "Invalid state name format");
            }
        }

        try {
            // Check if the clinic already exists
            const existingClinic = await clinicService.getClinicByName(name);
            if (existingClinic && existingClinic.name === name) {
                const doctor = await doctorService.getDoctorById(new mongoose.Types.ObjectId(doctorId));
                if (!doctor) {
                    return response(res, 404, "fail", "Doctor not found");
                }
                if(doctor?.clinic?.id === existingClinic.id) {
                    return response(res, 400, "fail", "Doctor already registered this Clinic");
                }
                doctor.clinic = existingClinic._id
                await doctor.save();
                if(doctor) {
                    return response(res, 200, "success", "Clinic already exists,Doctor updated successfully");
                }
            }
            
            const newClinic = await clinicService.createClinic({ name, location, contact, services });
            return response(res, 201, "success", "Clinic created successfully",  newClinic);
        } catch (error) {
            console.log(error)
            return response(res, 500, "fail", "Error creating clinic");
        }
    }
    async getClinics(req, res) {
        try {
            const clinics = await clinicService.getClinics();
            return response(res, 200, "success", "Clinics retrieved successfully", clinics);
        } catch (error) {
            logger.error(error);
            return response(res, 500, "fail", "Error retrieving clinics");
        }
    }

    // Get Clinics by Location with Pagination and Filtering by Specialties
    async getClinicsByLocation(req, res) {
        const { city, state, specialty, page = 1, limit = 10, skip = 0 } = req.query;
        const data = {};

        if (!city && !state) {
            return response(res, 400, "fail", "City or state is required");
        }

        const paginationOptions = {
            page: parseInt(page),
            limit: parseInt(limit),
            skip: parseInt(skip)
        };

        try {
            data.city = city;
            data.state = state;
            data.specialty = specialty;
            const clinics = await clinicService.getClinics(data, paginationOptions);
            if (clinics.docs.length === 0) {
                return response(res, 404, "fail", "No clinics found for the specified location");
            }
            return response(res, 200, "success", "Clinics retrieved successfully", clinics);
        } catch (error) {
            logger.error(error);
            return response(res, 500, "fail", "Error retrieving clinics by location");
        }
    }

    // Get Clinics by Operating Hours with Pagination
    async getClinicsByOperatingHours(req, res) {
        const { day, time, page = 1, limit = 10, skip = 0 } = req.query;
        const data = {};

        if (!day || !time) {
            return response(res, 400, "fail", "Day and time are required");
        }

        if (!["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].includes(day.toLowerCase())) {
            return response(res, 400, "fail", "Invalid day of the week");
        }

        if (!/^\d{2}:\d{2}$/.test(time)) {
            return response(res, 400, "fail", "Invalid time format, use HH:MM");
        }

        const paginationOptions = {
            page: parseInt(page),
            limit: parseInt(limit),
            skip: parseInt(skip)
        };

        try {
            data.day = day.toLowerCase();
            data.time = time;
            const clinics = await clinicService.getClinics(data, paginationOptions);
            if (clinics.docs.length === 0) {
                return response(res, 404, "fail", "No clinics found for the specified operating hours");
            }
            return response(res, 200, "success", "Clinics retrieved successfully", clinics);
        } catch (error) {
            logger.error(error);
            return response(res, 500, "fail", "Error retrieving clinics by operating hours");
        }
    }

    // Update Clinic (Partial Update - same as before)
    async updateClinic(req, res) {
        const { id } = req.params;
        const updateData = req.body;

        if (!validator.isMongoId(id)) {
            return response(res, 400, "fail", "Invalid clinic ID format");
        }

        // Validate only the fields provided in the update request
        if (updateData.name && (!validator.isAlpha(updateData.name, "en-US", { ignore: " " }) || updateData.name.length < 3 || updateData.name.length > 30)) {
            return response(res, 400, "fail", "Invalid clinic name format");
        }

        if (updateData.contact && updateData.contact.phone && !validator.isMobilePhone(updateData.contact.phone)) {
            return response(res, 400, "fail", "Invalid phone number");
        }

        if (updateData.contact && updateData.contact.email && !validator.isEmail(updateData.contact.email)) {
            return response(res, 400, "fail", "Invalid email address");
        }

        try {
            const updatedClinic = await clinicService.updateClinic(id, updateData);
            if (!updatedClinic) {
                return response(res, 404, "fail", "Clinic not found");
            }
            return response(res, 200, "success", "Clinic updated successfully", updatedClinic);
        } catch (error) {
            logger.error(error);
            return response(res, 500, "fail", "Error updating clinic");
        }
    }

    // Delete Clinic (same as before)
    async deleteClinic(req, res) {
        const { id } = req.params;

        if (!validator.isMongoId(id)) {
            return response(res, 400, "fail", "Invalid clinic ID format");
        }

        try {
            const deletedClinic = await clinicService.deleteClinic(id);
            if (!deletedClinic) {
                return response(res, 404, "fail", "Clinic not found");
            }
            return response(res, 204, "success", "Clinic deleted successfully");
        } catch (error) {
            logger.error(error);
            return response(res, 500, "fail", "Error deleting clinic");
        }
    }
}

module.exports = new ClinicController();
