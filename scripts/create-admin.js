// Creates an admin account, or resets the password of an existing one.
//
//   npm run create-admin -- --email admin@example.com --password "Admin12345" --name "Site Admin"
//
// Missing options fall back to ADMIN_EMAIL, ADMIN_PASSWORD and ADMIN_NAME from .env.
const { parseArgs } = require("util");
const env = require("../src/shared/config/env");
const { connectToDatabase, disconnectFromDatabase } = require("../src/shared/config/db");
const { Validator, normalizeEmail } = require("../src/shared/utils/validation");
const admin = require("../src/modules/admin");

const main = async () => {
    const { values } = parseArgs({
        options: {
            email: { type: "string" },
            password: { type: "string" },
            name: { type: "string" },
        },
    });
    const email = values.email || process.env.ADMIN_EMAIL;
    const password = values.password || process.env.ADMIN_PASSWORD;
    const name = values.name || process.env.ADMIN_NAME || "Administrator";

    const v = new Validator();
    v.email(email);
    v.password(password);
    v.name(name);
    if (Object.keys(v.errors).length) {
        console.error("Cannot create the admin:");
        for (const [field, message] of Object.entries(v.errors)) console.error(`  - ${field}: ${message}`);
        console.error('\nUsage: npm run create-admin -- --email you@example.com --password "Secret123" --name "Your Name"');
        process.exit(1);
    }

    await connectToDatabase(env.MONGODB_URI);
    const { created } = await admin.createOrUpdateAdmin({ name: name.trim(), email: normalizeEmail(email), password });
    console.log(created ? `Admin ${email} created.` : `Admin ${email} already existed: name and password updated.`);
    await disconnectFromDatabase();
};

main().catch(async (error) => {
    console.error(error.message);
    await disconnectFromDatabase().catch(() => {});
    process.exit(1);
});
