// Fields that must never leave the API, whatever endpoint returns the document.
const PRIVATE_FIELDS = ["password", "tokenVersion", "resetPasswordToken", "resetPasswordExpires", "__v"];

const jsonOptions = (extraPrivate = []) => ({
    virtuals: true,
    transform: (doc, ret) => {
        for (const field of [...PRIVATE_FIELDS, ...extraPrivate]) delete ret[field];
        delete ret.id;
        return ret;
    },
});

module.exports = { jsonOptions };
