const Admin = require("./admin.model");

class AdminRepository {
    create(adminData) {
        return Admin.create(adminData);
    }

    findByEmail(email) {
        return Admin.findOne({ email });
    }

    findById(id) {
        return Admin.findById(id);
    }

    update(id, update) {
        return Admin.findByIdAndUpdate(id, update, { new: true, runValidators: true });
    }
}

module.exports = new AdminRepository();
