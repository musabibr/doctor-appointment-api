const multer = require("multer");
const path = require("path");
const { uploadSingleImage, uploadMultipleImages, } = require("../util/cloudinary");

// multer setup
const storage = multer.memoryStorage();
exports.upload = multer({ storage: storage });

// Allowed image types
const allowedImageTypes = ['.jpg', '.jpeg', '.png'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

// Helper function to validate image type
const isValidImageType = (filename) => {
    const ext = path.extname(filename).toLowerCase();
    return allowedImageTypes.includes(ext);
};

// Endpoint for uploading a single image
exports.uploadSingleImage = async (req, res) => {
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
};

exports.uploadMultipleImages = async (req, res) => {
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
}

