const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const hpp = require("hpp");
const morgan = require("morgan");
const mongoose = require("mongoose");
const mongoSanitize = require("express-mongo-sanitize");

const env = require("./shared/config/env");
const { apiLimiter } = require("./shared/http/rateLimiters");
const { notFound, errorHandler } = require("./shared/errors/errorHandler");
const { mountRoutes } = require("./modules");

const CLIENT_DIST = path.join(__dirname, "..", "client", "dist");

const app = express();

app.set("trust proxy", env.TRUST_PROXY);

app.use(
    helmet({
        // Images in /uploads are loaded by the web client from another origin in development.
        crossOriginResourcePolicy: { policy: "cross-origin" },
        // Applies to the built React app when the API serves it. Uploaded files may
        // live on Cloudinary (https), and local HTTP runs must not be upgraded to HTTPS.
        contentSecurityPolicy: {
            directives: {
                "img-src": ["'self'", "data:", "blob:", "https:"],
                "frame-src": ["'self'", "https:"],
                "upgrade-insecure-requests": env.isProduction ? [] : null,
            },
        },
    })
);
app.use(
    cors({
        origin: (origin, callback) => callback(null, !origin || env.CLIENT_URLS.includes(origin)),
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false, limit: "100kb" }));
app.use(mongoSanitize());
app.use(hpp());
if (!env.isTest) app.use(morgan(env.isProduction ? "combined" : "dev"));

app.use("/uploads", express.static(env.UPLOAD_DIR, { index: false, maxAge: "7d" }));

app.get("/api/v1/health", (req, res) => {
    const database = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
    res.status(database === "connected" ? 200 : 503).json({ status: "ok", database });
});

app.use("/api", apiLimiter);
mountRoutes(app);
app.use("/api", notFound);

// After `npm run build`, the API also serves the React app.
if (fs.existsSync(path.join(CLIENT_DIST, "index.html"))) {
    app.use(express.static(CLIENT_DIST, { index: false }));
    app.get(/^\/(?!api\/|uploads\/).*/, (req, res) => res.sendFile(path.join(CLIENT_DIST, "index.html")));
}

app.use(notFound);
app.use(errorHandler);

module.exports = app;
