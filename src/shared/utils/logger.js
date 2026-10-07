const { createLogger, format, transports } = require("winston");
require("winston-daily-rotate-file");

const NODE_ENV = process.env.NODE_ENV || "development";

const logTransports = [
    new transports.Console({
        silent: NODE_ENV === "test" && !process.env.DEBUG_TESTS,
    }),
];

if (NODE_ENV !== "test") {
    logTransports.push(
        new transports.DailyRotateFile({
            filename: "logs/error-%DATE%.log",
            datePattern: "YYYY-MM-DD",
            level: "error",
            maxFiles: "14d", // Keep logs for 14 days
        }),
        new transports.DailyRotateFile({
            filename: "logs/combined-%DATE%.log",
            datePattern: "YYYY-MM-DD",
            maxFiles: "14d",
        })
    );
}

const logger = createLogger({
    level: "info",
    format: format.combine(
        format.timestamp(),
        format.errors({ stack: true }),
        format.printf(({ level, message, timestamp, stack }) => {
            return `${timestamp} [${level}]: ${stack || message}`;
        })
    ),
    transports: logTransports,
});

module.exports = logger;
