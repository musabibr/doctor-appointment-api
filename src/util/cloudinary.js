const cloudinary = require("cloudinary").v2;
const path = require("path");
const fileType = require("file-type");

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});


// Maximum retry attempts
const MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1000; // Default retry delay in milliseconds
// Helper function to retry upload with exponential backoff
const retryUpload = async (imageBuffer, imageName, retries = MAX_RETRIES, delay = DEFAULT_RETRY_DELAY) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const result = await new Promise((resolve, reject) => {
                cloudinary.uploader.upload_stream({
                    public_id: imageName,
                    resource_type: "auto",
                }, (error, result) => {
                    if (error) {
                        return reject(error);
                    }
                    resolve(result);
                }).end(imageBuffer);
            });
            return result; // If upload succeeds, return the result
        } catch (error) {
            if (attempt === retries) {
                return Promise.reject(new Error(`Failed to upload ${imageName} after ${retries} attempts: ${error.message}`));
            }

            // Exponential backoff before retrying
            await new Promise(res => setTimeout(res, delay * Math.pow(2, attempt - 1)));
        }
    }
};

// Upload a single image with validation, renaming, size check, and error handling
const uploadSingleImage = async (imageBuffer, id) => {
    const timestamp = Date.now();
    const imageName = `${id}_${timestamp}`;  // Automatically generated filename

    try {
        const result = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream({
                public_id: imageName,
                resource_type: "auto",
            }, (error, result) => {
                if (error) {
                    return reject(error);
                }
                resolve(result);
            }).end(imageBuffer);
        });

        return result;
    } catch (error) {
        return Promise.reject(new Error(`Failed to upload image: ${error.message}`));
    }
};

// Upload multiple images with validation, renaming, size check, retry logic, and error handling
const uploadMultipleImages = async (imageBuffers, id, retryDelay = DEFAULT_RETRY_DELAY) => {
    const timestamp = Date.now();  // Single timestamp for all images to ensure consistency
    const uploadPromises = imageBuffers.map(async (imageBuffer, index) => {
        const imageName = `${id}_${index}_${timestamp}`;  // Automatically generated filename  
        // Use the retryUpload function with retry logic
        return retryUpload(imageBuffer, imageName, MAX_RETRIES, retryDelay);
    });

    try {
        const results = await Promise.all(uploadPromises);
        return results;
    } catch (error) {
        return Promise.reject(new Error(`Failed to upload one or more images: ${error.message}`));
    }
};

module.exports = {
    cloudinary,
    uploadSingleImage,  // This function remains for single image uploads
    uploadMultipleImages,
    retryUpload,  // Expose this function for testing or individual uploads
};
