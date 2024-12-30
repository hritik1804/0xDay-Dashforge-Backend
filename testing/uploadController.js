const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const Organization = require('../models/organisationModel');
const DataEntry = require('./dataEntry');
const OpenAI = require('openai');

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/') // Make sure this directory exists
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname)
    }
});

const upload = multer({ storage: storage });

exports.uploadCSV = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const organizationId = req.body.organizationId;
        if (!organizationId) {
            return res.status(400).json({ error: 'Organization ID is required' });
        }

        // Find organization
        const organization = await Organization.findById(organizationId);
        if (!organization) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        // Parse CSV
        const results = [];
        await new Promise((resolve, reject) => {
            fs.createReadStream(req.file.path)
                .pipe(csv())
                .on('data', (data) => results.push(data))
                .on('end', () => resolve())
                .on('error', (error) => reject(error));
        });

        // Update organization
        organization.csvFileName = req.file.originalname;
        await organization.save();

        // Create data entry
        const dataEntry = new DataEntry({
            organizationId: organizationId,
            filteredData: JSON.stringify(results),
            fileName: req.file.originalname
        });

        await dataEntry.save();

        // Clean up uploaded file
        fs.unlinkSync(req.file.path);

        res.json({
            message: 'File uploaded successfully',
            organization: organization.companyName,
            fileName: req.file.originalname,
            rowCount: results.length,
            preview: results.slice(0, 2) // First two rows as preview
        });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            error: 'Error uploading file',
            details: error.message
        });
    }
};


// const Organization = require('../models/organization');
// const DataEntry = require('../models/dataEntry');
const openAIService = require('./openAIService');

exports.analyzeOrganizationData = async (req, res) => {
    const { organizationId } = req.params;
    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required for analysis' });
    }

    try {
        // Find the organization and its associated data
        const organization = await Organization.findById(organizationId);
        if (!organization) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        // Get the most recent data entry for this organization
        const dataEntry = await DataEntry.findOne({ 
            organizationId: organizationId 
        }).sort({ createdAt: -1 });

        if (!dataEntry) {
            return res.status(404).json({ 
                error: 'No CSV data found for this organization' 
            });
        }

        // Parse the stored data back to JSON
        const csvData = JSON.parse(dataEntry.filteredData);

        // Process with OpenAI
        const analysisResult = await openAIService.filterDataWithOpenAI(
            csvData, 
            prompt
        );

        res.json({
            message: 'Analysis completed successfully',
            organizationName: organization.companyName,
            fileName: dataEntry.fileName,
            analysis: analysisResult
        });

    } catch (err) {
        console.error('Error during analysis:', err);
        res.status(500).json({ 
            error: 'Error processing analysis request',
            details: err.message 
        });
    }
};

// Add this temporary debug route
exports.checkOrganizationData = async (req, res) => {
  const { organizationId } = req.params;
  
  try {
      const dataEntries = await DataEntry.find({ organizationId });
      const organization = await Organization.findById(organizationId);
      
      res.json({
          organization,
          dataEntries,
          entriesCount: dataEntries.length
      });
  } catch (err) {
      res.status(500).json({ error: err.message });
  }
};

exports.analyzeOrganizationData = async (req, res) => {
  const { organizationId } = req.params;
  const { prompt } = req.body;

  if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required for analysis' });
  }

  try {
      const organization = await Organization.findById(organizationId);
      if (!organization) {
          return res.status(404).json({ error: 'Organization not found' });
      }

      const dataEntry = await DataEntry.findOne({ 
          organizationId: organizationId 
      }).sort({ createdAt: -1 });

      if (!dataEntry) {
          return res.status(404).json({ 
              error: 'No CSV data found for this organization' 
          });
      }

      const csvData = JSON.parse(dataEntry.filteredData);
      const analysisResult = await openAIService.filterDataWithOpenAI(
          csvData, 
          prompt
      );

      res.json({
          message: 'Analysis completed successfully',
          organizationName: organization.companyName,
          fileName: dataEntry.fileName,
          analysis: analysisResult // This will now be an array of objects
      });

  } catch (err) {
      console.error('Error during analysis:', err);
      res.status(500).json({ 
          error: 'Error processing analysis request',
          details: err.message 
      });
  }
};