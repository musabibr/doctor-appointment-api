const fs = require('fs');
const path = require('path');

// Log file path
const logFilePath = path.join(__dirname, 'access_attempts.log');

// Middleware to log unauthorized or sensitive access attempts
const logAccessAttempt = (req, res, next) => {
    const logMessage = `[${new Date().toISOString()}] Unauthorized access attempt: ${req.method} ${req.originalUrl} from IP: ${req.ip}\n`;

    // Append log to the file
    fs.appendFile(logFilePath, logMessage, (err) => {
        if (err) {
            console.error('Error logging access attempt:', err.message);
        }
    });

    // Proceed to the next middleware or return unauthorized
    return res.status(401).json({
        status: 'fail',
        message: 'Unauthorized access attempt logged',
    });
};

module.exports = logAccessAttempt;
