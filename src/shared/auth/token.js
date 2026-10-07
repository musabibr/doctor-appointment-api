const jwt = require("jsonwebtoken");
const env = require("../config/env");

// The token only carries identifiers. `tv` is the account's tokenVersion:
// bumping it on logout / password change invalidates every issued token.
const signToken = (account, role) =>
    jwt.sign({ sub: String(account._id), role, tv: account.tokenVersion || 0 }, env.JWT_SECRET, {
        expiresIn: env.JWT_EXPIRES_IN,
    });

// Throws JsonWebTokenError / TokenExpiredError, which the error handler maps to 401.
const verifyToken = (token) => jwt.verify(token, env.JWT_SECRET);

module.exports = { signToken, verifyToken };
