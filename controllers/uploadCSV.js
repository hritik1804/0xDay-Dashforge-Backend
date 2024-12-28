const fs = require('fs');
const csv = require('csv-parser');
const DataModel = require('../models/dataModel');
const { detectType, generateAIInsights } = require('../middleware/openaiHelper');  // Import helper functions

// Controller to upload CSV file
exports.uploadCSV = (req, res) => {

    console.log('file---', req.file);
    const { path } = req?.file;

    if (!path) {
        return res.status(400).send('No file uploaded.');
    }

    res.status(200).send(`File uploaded successfully: ${req.file.filename}`);

};

// Controller to parse CSV, save data to DB, and generate AI insights
// CSV Upload and Parsing
exports.parseCSVAndSaveToDB = async (req, res) => {
    const results = [];
    const filePath = `uploads/${req.body.filename}`;
    const userPrompt = req.body.prompt;
    const filename = req.body.filename;  // Capture the filename from the request body

    console.log("---", filePath);

    if (!fs.existsSync(filePath)) {
        return res.status(400).send('File not found.');
    }

    fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => {
            const industry = data.Industry || 'Unknown';
            const dynamicFields = new Map();

            Object.keys(data).forEach(key => {
                if (key !== 'Industry') {
                    dynamicFields.set(key, detectType(data[key]));
                }
            });

            const rowData = {
                industry: industry,
                dynamicFields: Object.fromEntries(dynamicFields),
                filename: filename  // Add the filename to each row of data
            };
            results.push(rowData);
        })
        .on('end', async () => {
            try {
                await DataModel.insertMany(results);

                const aiResponse = await generateAIInsights(results, userPrompt);

                res.status(200).send({
                    message: 'CSV parsed, data saved to database, and AI insights generated.',
                    aiResponse,
                });
            } catch (err) {
                console.error('Database insertion error:', err);
                res.status(500).send(err.message);
            }
        })
        .on('error', (err) => {
            console.error('CSV parsing error:', err);
            res.status(500).send(err.message);
        });
};

// Controller to read data from MongoDB
exports.readData = (req, res) => {
    DataModel.find({})
        .then(data => {
            res.status(200).json(data);
        })
        .catch(err => {
            console.error('Error reading data:', err);
            res.status(500).send('Error retrieving data from database.');
        });
};
