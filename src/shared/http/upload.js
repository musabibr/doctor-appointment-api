const multer = require("multer");
const AppError = require("../errors/AppError");

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const DOCUMENT_TYPES = [...IMAGE_TYPES, "application/pdf"];

// The browser-supplied mimetype can be spoofed, so check the file's first bytes too.
const SIGNATURES = {
    "image/jpeg": (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
    "image/png": (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    "image/webp": (b) => b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP",
    "application/pdf": (b) => b.subarray(0, 5).toString("latin1") === "%PDF-",
};

const DOCUMENT_FIELDS = ["medicalLicense", "personalID"];

const allowedTypesFor = (field) => (DOCUMENT_FIELDS.includes(field) ? DOCUMENT_TYPES : IMAGE_TYPES);

const parser = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE, files: 3, fields: 30 },
    fileFilter: (req, file, callback) => {
        if (!allowedTypesFor(file.fieldname).includes(file.mimetype)) {
            const allowed = DOCUMENT_FIELDS.includes(file.fieldname) ? "JPG, PNG, WEBP or PDF" : "JPG, PNG or WEBP";
            return callback(AppError.badRequest(`${file.fieldname} must be a ${allowed} file`));
        }
        callback(null, true);
    },
});

const verifySignatures = (req, res, next) => {
    const files = req.file ? [req.file] : Object.values(req.files || {}).flat();
    for (const file of files) {
        const check = SIGNATURES[file.mimetype];
        if (!check || !check(file.buffer)) {
            return next(AppError.badRequest(`${file.fieldname} is not a valid ${file.mimetype} file`));
        }
    }
    next();
};

const singlePhoto = [parser.single("photo"), verifySignatures];

const doctorDocuments = [
    parser.fields([
        { name: "photo", maxCount: 1 },
        { name: "medicalLicense", maxCount: 1 },
        { name: "personalID", maxCount: 1 },
    ]),
    verifySignatures,
];

module.exports = { singlePhoto, doctorDocuments, MAX_FILE_SIZE };
