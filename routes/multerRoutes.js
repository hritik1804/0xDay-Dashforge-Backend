const express = require('express');
const multer = require('multer');
const router = express.Router();
const csvController = require('../controllers/uploadCSV');
const fs = require('fs');
const path = require('path');

// Create uploads directory if it doesn't exist
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

// Setup multer to handle file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');  // Store uploaded files in the 'uploads' folder
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);  // Keep the original file name
    }
});
const upload = multer({ storage: storage });


// Route for CSV file upload
router.post('/upload-csv', upload.single('file'), csvController.uploadCSV);


// Route to parse CSV and save to DB
router.post('/parse-csv', csvController.parseCSVAndSaveToDB);

// Route to read saved data
router.get('/read-data', csvController.readData);

module.exports = router;
