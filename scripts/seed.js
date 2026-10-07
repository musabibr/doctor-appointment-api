// Fills the database with demo data so the app can be explored right away.
//
//   npm run seed               # only runs on an empty database
//   npm run seed -- --reset    # wipes the database first (never in production)
const { parseArgs } = require("util");
const env = require("../src/shared/config/env");
const { connectToDatabase, disconnectFromDatabase } = require("../src/shared/config/db");
const { DEMO_PASSWORDS } = require("../src/shared/demo/accounts");
const { isDatabaseEmpty, wipeDatabase, loadDemoData } = require("../src/demo/demoData");

const main = async () => {
    const { values } = parseArgs({ options: { reset: { type: "boolean", default: false } } });
    if (env.isProduction) throw new Error("Refusing to seed a production database.");
    if (!env.MONGODB_URI) throw new Error("Set MONGODB_URI (demo mode with the embedded database seeds itself).");

    const connection = await connectToDatabase(env.MONGODB_URI);

    if (values.reset) {
        await wipeDatabase();
        console.log(`Database "${connection.name}" wiped.`);
    } else if (!(await isDatabaseEmpty())) {
        console.log('The database already has data. Run "npm run seed -- --reset" to wipe it and load the demo data.');
        await disconnectFromDatabase();
        return;
    }

    await loadDemoData();

    console.log("\nDemo data loaded. Sign in with:\n");
    console.table([
        { role: "admin", email: "admin@example.com", password: DEMO_PASSWORDS.admin },
        { role: "doctor", email: "doctor@example.com", password: DEMO_PASSWORDS.doctor },
        { role: "doctor (pending approval)", email: "pending.doctor@example.com", password: DEMO_PASSWORDS.doctor },
        { role: "patient", email: "patient@example.com", password: DEMO_PASSWORDS.patient },
    ]);
    console.log("Other doctors: doctor2@example.com ... doctor6@example.com, other patient: patient2@example.com (same passwords).\n");

    await disconnectFromDatabase();
};

main().catch(async (error) => {
    console.error(`Seeding failed: ${error.message}`);
    await disconnectFromDatabase().catch(() => {});
    process.exit(1);
});
