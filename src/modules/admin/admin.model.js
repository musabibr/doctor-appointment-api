const mongoose = require("mongoose");
const { jsonOptions } = require("../../shared/db/jsonOptions");

const adminSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        password: { type: String, required: true, select: false },
        tokenVersion: { type: Number, default: 0 },
    },
    {
        timestamps: true,
        toJSON: jsonOptions(),
        toObject: jsonOptions(),
    }
);

const Admin = mongoose.model("Admin", adminSchema);

module.exports = Admin;
