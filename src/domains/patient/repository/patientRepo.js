const Patient = require('../model/userModel');

const createPatient = async (data) => {
    const patient = await Patient.create(data);
    return patient;
}
const getPatient = async (email) => {
    const patient = await Patient.findOne({ email });
    return patient;
}
const getPatientById = async (id) => {
    const patient = await Patient.findById(id);
    return patient;
}
const updatePatient = async (id, data) => {
    const patient = await Patient.findByIdAndUpdate(id, data, { new: true });
    return patient;
}
const updatePassword = async (id, password) => {
    const patient = await Patient.findByIdAndUpdate(id, { password }, { new: true });
    return patient;
}
const deletePatient = async (id) => {
    const patient = await Patient.findByIdAndDelete(id);
    return patient;
}
const getAllPatients = async () => {
    const patients = await Patient.find();
    return patients;
}

module.exports = {
    createPatient,
    getPatient,
    getPatientById,
    updatePatient,
    updatePassword,
    deletePatient,
    getAllPatients
}