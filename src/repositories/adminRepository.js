const Admin = require('../models/adminModel');

class AdminRepository {
    async createAdmin(adminData) {
        const admin = new Admin(adminData);
        return await admin.save();
    }
    async findAdminByEmail(email) {
        return await Admin.findOne({ email });
    }
    async getAdminById(id) {
        return await Admin.findById(id);
    }
}

module.exports = new AdminRepository()