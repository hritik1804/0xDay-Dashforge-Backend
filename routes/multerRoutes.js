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

// Setup multer with 300MB file size limit
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 300 * 1024 * 1024, // 300MB in bytes
        files: 1 // Maximum number of files
    },
    fileFilter: (req, file, cb) => {
        // Accept only CSV files
        if (file.mimetype === 'text/csv' || file.mimetype === 'application/vnd.ms-excel') {
            cb(null, true);
        } else {
            cb(new Error('Only CSV files are allowed'));
        }
    }
});

// Route for CSV file upload
router.post('/upload-csv', upload.single('file'), csvController.uploadCSV);


// Route to parse CSV and save to DB
router.post('/parse-csv', csvController.parseCSVAndSaveToDB);

// Route to read saved data
router.get('/data/:id', csvController.readDataById);

// Route to list all CSV files
router.get('/files', csvController.listAllFiles);

module.exports = router;
