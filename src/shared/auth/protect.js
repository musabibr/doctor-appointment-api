const AppError = require("../errors/AppError");
const catchAsync = require("../http/catchAsync");
const { verifyToken } = require("./token");
const { getAccountProvider } = require("./accountRegistry");

const readBearerToken = (req) => {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");
    return scheme === "Bearer" && token ? token : null;
};

// protect()                     -> any signed-in account
// protect("doctor")             -> doctors only
// protect("patient", "doctor")  -> patients or doctors
//
// On success: req.user is the account document and req.role its role.
const protect = (...roles) =>
    catchAsync(async (req, res, next) => {
        const token = readBearerToken(req);
        if (!token) throw AppError.unauthorized();

        const payload = verifyToken(token);
        const provider = getAccountProvider(payload.role);
        if (!provider) throw AppError.unauthorized("Invalid session, please log in again", "SESSION_EXPIRED");
        if (roles.length > 0 && !roles.includes(payload.role)) {
            throw AppError.forbidden("Your account type cannot access this page");
        }

        const account = await provider.findById(payload.sub);
        if (!account || (account.tokenVersion || 0) !== payload.tv) {
            throw AppError.unauthorized("Your session has expired, please log in again", "SESSION_EXPIRED");
        }
        if (provider.assertCanAccess) provider.assertCanAccess(account);

        req.user = account;
        req.role = payload.role;
        next();
    });

module.exports = { protect };
