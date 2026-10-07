const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const cloudinary = require("cloudinary").v2;
const env = require("../config/env");

if (env.useCloudinary) {
    cloudinary.config({
        cloud_name: env.CLOUDINARY_CLOUD_NAME,
        api_key: env.CLOUDINARY_API_KEY,
        api_secret: env.CLOUDINARY_API_SECRET,
    });
}

const EXTENSIONS = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "application/pdf": "pdf",
};

const uploadToCloudinary = (file, folder) =>
    new Promise((resolve, reject) => {
        cloudinary.uploader
            .upload_stream(
                {
                    folder: `${env.APP_NAME.toLowerCase()}/${folder}`,
                    public_id: crypto.randomUUID(),
                    resource_type: "auto",
                },
                (error, result) => (error ? reject(error) : resolve(result.secure_url))
            )
            .end(file.buffer);
    });

const saveLocally = async (file, folder) => {
    const fileName = `${crypto.randomUUID()}.${EXTENSIONS[file.mimetype] || "bin"}`;
    const directory = path.join(env.UPLOAD_DIR, folder);
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(path.join(directory, fileName), file.buffer);
    // Served by express.static under /uploads; the web client prefixes the API origin.
    return `/uploads/${folder}/${fileName}`;
};

// Returns a URL for the stored file. File names are random UUIDs so they cannot be guessed.
const saveFile = (file, folder) =>
    env.useCloudinary ? uploadToCloudinary(file, folder) : saveLocally(file, folder);

const removeFile = async (url) => {
    if (typeof url !== "string" || !url.startsWith("/uploads/")) return;
    const target = path.join(env.UPLOAD_DIR, url.replace(/^\/uploads\//, ""));
    if (!target.startsWith(env.UPLOAD_DIR + path.sep)) return;
    await fs.rm(target, { force: true });
};

module.exports = { saveFile, removeFile };
