const express = require('express');
const router = express.Router();
const uploadController = require('./uploadController');
const multer = require('multer');

// Configure multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/') // Make sure this directory exists
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname)
    }
});

const upload = multer({ storage: storage });

// Upload route
router.put('/upload', upload.single('file'), uploadController.uploadCSV);

module.exports = router;
