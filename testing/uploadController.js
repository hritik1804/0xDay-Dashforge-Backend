const csvParserModel = require('./csvParserModel');
const openAIService = require('./openAIService');

exports.uploadsCSV = (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  const filePath = req.file.path;
  
  // Parse CSV file
  csvParserModel.parseCSV(filePath)
    .then((data) => {
      // Send data to OpenAI for filtering
      openAIService.filterDataWithOpenAI(data)
        .then((filteredData) => {
          res.json({ filteredData });
        })
        .catch((err) => {
          res.status(500).json({ error: 'Error processing data with OpenAI' });
        });
    })
    .catch((err) => {
      res.status(500).json({ error: 'Error parsing CSV file' });
    });
};
