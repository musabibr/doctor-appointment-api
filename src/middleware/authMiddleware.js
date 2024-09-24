const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key";

module.exports = (req, res, next) => {
    const token = req.cookies.token; // Token should be stored in cookies
    if (!token) {
        return res.status(401).json({ message: "Access denied. No token provided." });
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.patient = decoded; // Attach patient data to request
        next();
    } catch (error) {
        return res.status(400).json({ message: "Invalid token." });
    }
};
