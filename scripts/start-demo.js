// Starts the app in demo mode: sample data, one-click demo logins and an in-app
// inbox for emails. Without MONGODB_URI it runs its own embedded MongoDB.
//
//   npm run demo          # builds the web app, then starts on http://localhost:5000
//   npm run start:demo    # starts without building (used by hosting platforms)
const fs = require("fs");
const path = require("path");

process.env.DEMO_MODE = process.env.DEMO_MODE || "true";

if (!fs.existsSync(path.join(__dirname, "..", "client", "dist", "index.html"))) {
    console.warn('The web app is not built yet, only the API will be served. Run "npm run build" first.');
}

require("../server");
