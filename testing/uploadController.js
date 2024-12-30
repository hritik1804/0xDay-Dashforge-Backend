// const csvParserModel = require('./csvParserModel');
// const openAIService = require('./openAIService');
// const DataEntry = require('./dataEntry');
// const Organization = require('../models/organisationModel');

// exports.uploadCSV = async (req, res) => {
//   if (!req.file) {
//     return res.status(400).send('No file uploaded.');
//   }

//   const organizationId = req.body.organizationId;
//   if (!organizationId) {
//     return res.status(400).send('Organization ID is required.');
//   }

//   const prompt = req.body.prompt || 'Filter and analyze this data';
//   const filePath = req.file.path;
  
//   try {
//     const organization = await Organization.findById(organizationId);
//     if (!organization) {
//       return res.status(404).json({ error: 'Organization not found' });
//     }

//     organization.csvFileName = req.file.originalname;
//     await organization.save();

//     const data = await csvParserModel.parseCSV(filePath);
//     const filteredData = await openAIService.filterDataWithOpenAI(data, prompt);
//     // console.log("filteredData", filteredData);
    
//     const dataEntry = new DataEntry({
//       organizationId: organizationId,
//       filteredData: JSON.stringify(filteredData),
//       fileName: req.file.originalname
//     });
    
//     await dataEntry.save();
    
//     res.json({ 
//       message: 'Data processed and stored successfully',
//       entriesProcessed: 1,
//       organizationId: organizationId
//     });
//   } catch (err) {
//     console.error('Error:', err);
//     res.status(500).json({ error: 'Error processing and storing data' });
//   }
// };


const csvParserModel = require('./csvParserModel');
const DataEntry = require('./dataEntry');
const Organization = require('../models/organisationModel');
const fs = require('fs');

exports.uploadCSV = async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  const organizationId = req.body.organizationId;
  if (!organizationId) {
    return res.status(400).send('Organization ID is required.');
  }

  const filePath = req.file.path;
  
  try {
    // Check if organization exists
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Parse CSV file
    const data = await csvParserModel.parseCSV(filePath);
    
    // Update organization with CSV filename
    organization.csvFileName = req.file.originalname;
    await organization.save();

    // Create a new DataEntry document
    const dataEntry = new DataEntry({
      organizationId: organizationId,
      filteredData: JSON.stringify(data), // Store the parsed CSV data
      fileName: req.file.originalname
    });
    
    await dataEntry.save();
    
    // Log for debugging
    console.log('Data Entry saved:', {
      id: dataEntry._id,
      organizationId: dataEntry.organizationId,
      fileName: dataEntry.fileName
    });

    res.json({ 
      message: 'CSV file uploaded and stored successfully',
      fileName: req.file.originalname,
      organizationId: organizationId,
      dataEntryId: dataEntry._id // Include this for verification
    });

  } catch (err) {
    console.error('Error during upload:', err);
    res.status(500).json({ 
      error: 'Error processing and storing CSV file',
      details: err.message 
    });
  } finally {
    // Clean up: remove the temporary file
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      console.error('Error removing temporary file:', err);
    }
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