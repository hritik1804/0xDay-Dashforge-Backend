require('dotenv').config();
const fs = require('fs');
const csv = require('csv-parser');
const DataModel = require('../models/dataModel');
const { detectType, generateAIInsights } = require('../middleware/openaiHelper');  // Import helper functions
const { MongoClient, GridFSBucket, ObjectId } = require('mongodb');
const mongoose = require('mongoose');
const path = require('path');

// MongoDB URI
const uri = process.env.MONGODB_URI;

// Controller to upload CSV file
exports.uploadCSV = async (req, res) => {
    console.log('file---', req.file);

    if (!req.file) {
        return res.status(400).send('No file uploaded. Please ensure the file is attached and the field name is correct.');
    }

    const { path, filename } = req.file;

    try {
        const client = new MongoClient(uri);
        await client.connect();
        const db = client.db('final');
        const bucket = new GridFSBucket(db);

        const uploadStream = bucket.openUploadStream(filename);
        fs.createReadStream(path)
            .pipe(uploadStream)
            .on('error', async (error) => {
                console.error('Error uploading file to GridFS:', error);
                await client.close();
                res.status(500).send('Error uploading file.');
            })
            .on('finish', async () => {
                console.log('File uploaded to GridFS successfully.');
                await client.close();
                res.status(200).send(`File uploaded successfully: ${filename}`);
            });
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        res.status(500).send('Error connecting to database.');
    }
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

// Controller to read data by ID or filename
exports.readDataById = async (req, res) => {
    try {
        const { id } = req.query;
        console.log('Searching for document with ID:', id);

        if (!id) {
            return res.status(400).json({ message: 'Please provide an id' });
        }

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid ID format' });
        }

        // Connect to MongoDB and get the GridFS bucket
        const client = new MongoClient(uri);
        await client.connect();
        const db = client.db('final');
        const bucket = new GridFSBucket(db);

        try {
            // Find the file metadata
            const file = await db.collection('fs.files').findOne({ 
                _id: new ObjectId(id) 
            });

            if (!file) {
                return res.status(404).json({ 
                    message: 'No file found',
                    queriedId: id
                });
            }

            res.status(200).json(file);
        } finally {
            await client.close();
        }
    } catch (err) {
        console.error('Error reading file:', err);
        res.status(500).json({ 
            message: 'Error retrieving file from database',
            error: err.message 
        });
    }
};
