// utils/jwtHelper.js
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key"; // Add this secret key to your .env file

class JWTUtil {
    static generateToken(patient) {
        const payload = { id: patient._id, email: patient.email };
        return jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
    }

    static verifyToken(token) {
        return jwt.verify(token, JWT_SECRET);
    }
}

module.exports = JWTUtil;
