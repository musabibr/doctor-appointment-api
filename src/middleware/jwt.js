const jwt = require('jsonwebtoken');
const redisClient = require('../db_config/redis_config'); // Assuming you're using Redis for blacklist
const logger = require('../util/logger');

const JWTUtil = {
    
    // Generate a JWT token
    generateToken: (payload) => {
        return jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: '30d',
        });
    },
    // Verify the token and check if it's blacklisted
    verifyToken: async (token) => {
        try {
            // Check if the token is blacklisted
            const isBlacklisted = await redisClient.get(`blacklist_${token}`);
            if (isBlacklisted) {
                throw new Error('Token has been blacklisted');
            }

            // Verify the token using jwt.verify
            return jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
                if (err) {
                    if (err.name === 'TokenExpiredError') {
                        throw new Error('Token has expired');
                    }
                    throw new Error('Invalid token');
                }
                return decoded;
            });
        } catch (error) {
            logger.error(`Token verification failed: ${error.message}`, { token, error });
            throw error;
        }
    },

    // Blacklist the token with an expiration time
    blacklistToken: async (token, expiration) => {
        try {
            // Store the token in Redis with the same expiration time as the JWT
            await redisClient.set(`blacklist_${token}`, true, {
                EX: expiration, // Set expiry in seconds
            });
        } catch (error) {
            logger.error(`Failed to blacklist token: ${error.message}`, { token, error });
            throw error;
        }
    }
};

module.exports = JWTUtil;


module.exports = JWTUtil;

