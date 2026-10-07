const AppError = require("../../shared/errors/AppError");

// Pending or rejected doctors can sign in and edit their profile, but cannot
// publish availability or handle appointments until an admin approves them.
// Use after protect().
const requireApprovedDoctor = (req, res, next) => {
    if (req.role !== "doctor" || req.user.approvalStatus !== "approved") {
        return next(AppError.forbidden("Your account is awaiting admin approval", "DOCTOR_NOT_APPROVED"));
    }
    next();
};

module.exports = { requireApprovedDoctor };
