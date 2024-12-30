const express = require('express');
const router = express.Router();
const analysisController = require('./uploadController');

router.post('/organizations/:organizationId/analyze', analysisController.analyzeOrganizationData);
router.get('/organizations/:organizationId/check-data', analysisController.checkOrganizationData);

module.exports = router;
