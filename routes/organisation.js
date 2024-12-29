const express = require('express');
const router = express.Router();
const { createOrganization, deleteOrganization, getOrganization } = require('../controllers/organisation');

// Create an organization
router.post('/create', createOrganization);

// Delete an organization by ID
router.delete('/delete/:id', deleteOrganization);

// Get organization details by ID
router.get('/get/:id', getOrganization);

module.exports = router;
