// Modules that own a kind of account (patients, doctors, admin) register an
// "account provider" here when the application starts. The auth module and the
// `protect` middleware talk to accounts only through this interface, so they
// never import those modules directly.
//
// Provider contract:
//   findById(id)                     -> account document or null
//   findByEmail(email)               -> account document or null
//   findByEmailWithPassword(email)   -> account document (with password) or null
//   findByIdWithPassword(id)         -> account document (with password) or null
//   findByResetToken(tokenHash)      -> account with a valid (unexpired) reset token or null
//   setPassword(id, passwordHash)    -> saves the hash, clears reset tokens, revokes sessions
//   revokeSessions(id)               -> bumps tokenVersion so existing JWTs stop working
//   setResetToken(id, hash, expires) -> stores a password-reset token hash
//   canResetPassword                 -> boolean
//   requiresEmailVerification        -> boolean
//   markEmailVerified(id)            -> (only when requiresEmailVerification)
//   assertCanAccess(account)         -> optional, throws AppError to block a session

const providers = new Map();

const registerAccountProvider = (role, provider) => {
    providers.set(role, provider);
};

const getAccountProvider = (role) => providers.get(role) || null;

const registeredRoles = () => [...providers.keys()];

module.exports = { registerAccountProvider, getAccountProvider, registeredRoles };
