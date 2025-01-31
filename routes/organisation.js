const express = require('express');
const router = express.Router();
const { createOrganization, deleteOrganization, getOrganization, getAllOrganisations } = require('../controllers/organisation');

// Create an organization
router.post('/createCompany', createOrganization);

// Delete an organization by ID
router.delete('/deleteCompany/:id', deleteOrganization);

// Get organization details by ID
router.get('/fetchCompany/:id', getOrganization);

// Get all organisations
router.get('/fetchAllCompanies', getAllOrganisations);

module.exports = router;
