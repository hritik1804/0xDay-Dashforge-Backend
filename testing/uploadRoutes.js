const express = require('express');
const uploadController = require('./uploadController');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

const router = express.Router();

// POST endpoint to upload CSV file
router.post('/csv', upload.single('file'), uploadController.uploadCSV);

module.exports = router;
