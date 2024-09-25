const express = require("express");
const router = express.Router();
const patientController = require("../controllers/patientController");
const authMiddleware = require("../middleware/authMiddleware");

const multer = require("multer");
const multerStorage = multer.memoryStorage();
const multerFilter = (req, file, cb) => {
    // Check if the file is an image by checking the mimetype of the file
    if (file.mimetype.startsWith("image")) {
        // If the file is an image, call the callback function with the arguments (null, true)
        cb(null, true);
    } else {
        // If the file is not an image, call the callback function with the arguments (new Error('Not an image! Please upload only images.'), false)
        cb(new Error("Not an image! Please upload only images."), false);
    }
};

const upload = multer({
    storage: multerStorage,
    fileFilter: multerFilter,
});


// Patient Registration
router.post("/signup", upload.single("image"),patientController.register);
// 
// Patient Login
router.post("/login", patientController.login);

// Logout
router.post("/logout", patientController.logout);

// Protected Routes - Require JWT authentication
router.get("/:id", authMiddleware, patientController.getPatient);
router.put("/:id", authMiddleware, patientController.updatePatient);
router.delete("/:id", authMiddleware, patientController.deletePatient);

module.exports = router;
