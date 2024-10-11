const express = require('express');
const router = express.Router()
const AdminController = require('../controllers/adminController');
const patientController = require('../controllers/patientController');
const doctorController = require('../controllers/doctorController');
const reviewController = require('../controllers/reviewController');


router.post('/register', AdminController.register);
router.post('/login', AdminController.login);
// router.get('/logout','') 

router.use(AdminController.protected);

// managing doctors
router.post('/approve-doctor', doctorController.verifyAndApproveDoctor);
router.get('/get-all-doctors', doctorController.searchDoctors);
router.delete('/delete-doctor', doctorController.deleteDoctor);

// managing patients
// router.get('/get-all-patients',patientController)
router.delete('/delete-patient', patientController.deletePatient);

// manage reviews
router.get('/get-reported-reviews', reviewController.getReportedReviews)
router.delete('/delete-reported-review', reviewController.deleteReview);

module.exports = router;
