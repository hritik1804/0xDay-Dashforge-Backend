const express = require('express');
const router = express.Router();
const { queryCSVData } = require('../controllers/query'); // Ensure correct path

// Define the route for querying CSV data
router.get('/csv/query', queryCSVData); // Correct HTTP method and path

module.exports = router;
