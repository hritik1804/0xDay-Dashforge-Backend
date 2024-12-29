const csvParserModel = require('./csvParserModel');
const openAIService = require('./openAIService');
const DataEntry = require('./dataEntry');

exports.uploadCSV = async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  const prompt = req.body.prompt || 'Filter and analyze this data';
  const filePath = req.file.path;
  
  try {
    const data = await csvParserModel.parseCSV(filePath);
    const filteredData = await openAIService.filterDataWithOpenAI(data, prompt);
    console.log("filteredData",filteredData);
    
    // Create a new DataEntry document with the filtered data
    const dataEntry = new DataEntry({
      filteredData: JSON.stringify(filteredData) // Convert to string if it's an object
    });
    
    // Save the single document
    await dataEntry.save();
    
    res.json({ 
      message: 'Data processed and stored successfully',
      entriesProcessed: 1
    });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Error processing and storing data' });
  }
};
