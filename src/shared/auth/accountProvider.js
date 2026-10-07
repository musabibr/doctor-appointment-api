// Builds the standard account provider (see accountRegistry.js) for a Mongoose
// model with the usual account fields: email, password, tokenVersion and the
// optional resetPasswordToken / resetPasswordExpires pair.
const createAccountProvider = (Model, overrides = {}) => ({
    findById: (id) => Model.findById(id),
    findByEmail: (email) => Model.findOne({ email }),
    findByEmailWithPassword: (email) => Model.findOne({ email }).select("+password"),
    findByIdWithPassword: (id) => Model.findById(id).select("+password"),
    findByResetToken: (tokenHash) =>
        Model.findOne({ resetPasswordToken: tokenHash, resetPasswordExpires: { $gt: new Date() } }),
    setPassword: (id, passwordHash) =>
        Model.updateOne(
            { _id: id },
            {
                $set: { password: passwordHash },
                $unset: { resetPasswordToken: 1, resetPasswordExpires: 1 },
                $inc: { tokenVersion: 1 },
            }
        ),
    revokeSessions: (id) => Model.updateOne({ _id: id }, { $inc: { tokenVersion: 1 } }),
    setResetToken: (id, tokenHash, expires) =>
        Model.updateOne({ _id: id }, { $set: { resetPasswordToken: tokenHash, resetPasswordExpires: expires } }),
    canResetPassword: true,
    requiresEmailVerification: false,
    ...overrides,
});

module.exports = { createAccountProvider };
