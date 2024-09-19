require('../db_config/db');
const express = require("express");
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const patientRouter = require('../domains/patient/routes/patientRouter');
//rate limit
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

//cors
const allowedOrigins = [];
const corsOptions = {
    origin: (origin, callback) => {
        if (allowedOrigins.includes(origin)|| !origin) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    optionsSuccessStatus: 204,
    credentials: true,//access-control-allow-credentials:true
    allowedHeaders: 'Origin, X-Requested-With, Content-Type, Accept, Authorization',//access-control-allow-headers
};

//creating the app
const app = express();

app.use(cors(corsOptions));
app.use(helmet());
app.use(hpp());
app.use(mongoSanitize());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(morgan('dev'));
app.use(limiter);
app.use('/api/v1/patient', patientRouter);

app.all('*', (req, res, next) => {
    res.status(404 || 401).json({
        status: 'fail',
        method: `${req.method}`,
        message: `Can't find ${req.originalUrl} on this server!`
    })
});

module.exports = app;