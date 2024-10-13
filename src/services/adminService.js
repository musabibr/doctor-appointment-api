const AdminRepository = require("../repositories/adminRepository");

class adminService {
    async createAdmin(adminData) {
        return await AdminRepository.createAdmin(adminData) || 404;
    }
    async findAdminByEmail(email) {
        return await AdminRepository.findAdminByEmail(email);
    }
    async getAdminById(id) {
        return await AdminRepository.getAdminById(id);
    }
    async findAdminByEmail(email) {
        return await AdminRepository.findAdminByEmail(email);
    }
}

module.exports = new adminService()