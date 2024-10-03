require('./db_config/db');
const express = require("express");
const cors = require('cors');
const morgan = require('morgan');const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const bodyParser = require('body-parser');
const multer = require('multer');
const patientRoutes = require('./routes/patientRoutes');
const redisClient = require('./db_config/redis_config');
const doctorRoutes = require('./routes/doctorRoutes');
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
        if (origin === 'http://127.0.0.1:5500/' || !origin) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    optionsSuccessStatus: 204,
    credentials: true,//access-control-allow-credentials:true
    allowedHeaders: 'Origin, X-Requested-With, Content-Type, Accept, Authorization',//access-control-allow-headers
};

//creating the app
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors({origin:'*', credentials: true}));
app.use(helmet());
app.use(hpp());
app.use(mongoSanitize());
app.use(morgan('dev'));
app.use(limiter);
app.use('/api/v1/patients', patientRoutes)
app.use('/api/v1/doctors', doctorRoutes)


redisClient.connect();
redisClient.on('connect', () => {
    console.log('Redis connected');
})
redisClient.on('error', (err) => {
    console.log('Redis connection error:', err);
});

app.all('*', (req, res, next) => {
    if (!res.headersSent) {
        res.status(404 || 401).json({
            status: 'fail',
            method: `${req.method}`,
            message: `Can't find ${req.originalUrl} on this server!`
        });
    }
});

module.exports = app;