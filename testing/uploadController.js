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

    // Update organization with CSV filename
    organization.csvFileName = req.file.originalname;
    await organization.save();

    const data = await csvParserModel.parseCSV(filePath);
    
    // Create a new DataEntry document
    const dataEntry = new DataEntry({
      organizationId: organizationId,
      filteredData: JSON.stringify(data), // Store raw CSV data instead of filtered
      fileName: req.file.originalname
    });
    
    await dataEntry.save();
    
    res.json({ 
      message: 'CSV file uploaded and stored successfully',
      fileName: req.file.originalname,
      organizationId: organizationId
    });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Error processing and storing CSV file' });
  }
};