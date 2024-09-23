require('../db_config/db');
const express = require("express");
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const multer = require('multer');
const path = require('path');
const patientRouter = require('../domains/patient/routes/patientRouter');
const {uploadSingleImage, uploadMultipleImages} = require('../util/cloudinary');
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

app.use(cors({origin:'*', credentials: true}));
app.use(helmet());
app.use(hpp());
app.use(mongoSanitize());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(morgan('dev'));
app.use(limiter);
app.use('/api/v1/patient', patientRouter);

// multer setup
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Allowed image types
const allowedImageTypes = ['.jpg', '.jpeg', '.png'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

// Helper function to validate image type
const isValidImageType = (filename) => {
    const ext = path.extname(filename).toLowerCase();
    return allowedImageTypes.includes(ext);
};

// Endpoint for uploading a single image
app.post("/upload-single/:id?", upload.single("image"), async (req, res) => {
    const id = req.params.id || req.body.id; // Get id from either req.params or req.body

    // Validate if 'id' and 'file' are present
    if (!id) {
        return res.status(400).json({ success: false, message: "ID is required." });
    }
    if (!req.file) {
        return res.status(400).json({ success: false, message: "No image file uploaded." });
    }

    const imageBuffer = req.file.buffer;
    const filename = req.file.originalname;

    // Validate image type and size
    if (!isValidImageType(filename)) {
        return res.status(400).json({ success: false, message: `Invalid image type. Allowed types are: ${allowedImageTypes.join(", ")}` });
    }
    if (imageBuffer.length > MAX_IMAGE_SIZE) {
        return res.status(400).json({ success: false, message: "Image exceeds maximum size of 5 MB." });
    }

    try {
        const results = await uploadSingleImage(imageBuffer, id); // Upload single image to Cloudinary
        res.cookie('result', JSON.stringify(results), { httpOnly: true, secure: true, sameSite: false });
        res.status(200).json({ success: true, results });
    } catch (error) {
    res.status(500).json({ success: false, message: `${error.message}` });
    }
});

// Endpoint for uploading multiple images
app.post('/upload-multiple/:id?', upload.array('images', 5), async (req, res) => {
    const id = req.params.id || req.body.id || 'image1234'; // Get id from either req.params or req.body

    // Validate if 'id' and 'files' are present
    if (!id) {
        return res.status(400).json({ success: false, message: "ID is required." });
    }
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, message: "No image files uploaded." });
    }

    const imageBuffers = req.files.map(file => file.buffer);
    const filenames = req.files.map(file => file.originalname);

    // Validate image types and sizes
    for (let i = 0; i < filenames.length; i++) {
        if (!isValidImageType(filenames[i])) {
            return res.status(400).json({ success: false, message: `Invalid image type for file at index ${i}. Allowed types are: ${allowedImageTypes.join(", ")}` });
        }
        if (imageBuffers[i].length > MAX_IMAGE_SIZE) {
            return res.status(400).json({ success: false, message: `Image at index ${i} exceeds maximum size of 5 MB.` });
        }
    }

    try {
        
        const results = await uploadMultipleImages(imageBuffers, id); // Upload multiple images to Cloudinary
        res.status(200).json({ success: true, results });
    } catch (error) {
        console.log('====================================');
        console.log(error);
        console.log('====================================');
        res.status(500).json({ success: false, message: error.message });
    }
});

// Assuming app.listen or further setup happens below this point


app.all('*', (req, res, next) => {
    res.status(404 || 401).json({
        status: 'fail',
        method: `${req.method}`,
        message: `Can't find ${req.originalUrl} on this server!`
    })
});

module.exports = app;

//