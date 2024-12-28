require('dotenv').config();
const fs = require('fs');
const csv = require('csv-parser');
const DataModel = require('../models/dataModel');
const { generateAIInsights } = require('../middleware/openaiHelper');  // Import helper functions
const { MongoClient, GridFSBucket, ObjectId } = require('mongodb');
const mongoose = require('mongoose');
const path = require('path');

// MongoDB URI
const uri = process.env.MONGODB_URI;

// Add this helper function at the top of the file
function detectType(value) {
    // Remove any whitespace
    if (typeof value === 'string') {
        value = value.trim();
    }
    
    // Check if value is empty
    if (value === '' || value === null || value === undefined) {
        return { type: 'null', value: null };
    }
    
    // Check if value is a number
    if (!isNaN(value) && value !== '') {
        return { type: 'number', value: parseFloat(value) };
    }
    
    // Check if value is a boolean
    if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') {
        return { type: 'boolean', value: value.toLowerCase() === 'true' };
    }
    
    // Check if value is a date
    const dateValue = new Date(value);
    if (!isNaN(dateValue) && value.length > 5) {
        return { type: 'date', value: dateValue };
    }
    
    // Default to string
    return { type: 'string', value: value };
}

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
                // Return the fileId in the response
                res.status(200).json({
                    message: `File uploaded successfully: ${filename}`,
                    fileId: uploadStream.id.toString(),
                    filename: filename
                });
            });
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        res.status(500).send('Error connecting to database.');
    }
};

// Controller to parse CSV, save data to DB, and generate AI insights
// CSV Upload and Parsing
exports.parseCSVAndSaveToDB = async (req, res) => {
    try {
        const { fileId, prompt, filename } = req.body;
        
        if (!fileId) {
            return res.status(400).json({ message: 'Please provide a fileId' });
        }

        const client = new MongoClient(uri);
        await client.connect();
        const db = client.db('final');
        const bucket = new GridFSBucket(db);

        const results = [];

        try {
            // Get the file metadata to get the filename
            const fileInfo = await db.collection('fs.files').findOne({ 
                _id: new ObjectId(fileId) 
            });

            if (!fileInfo) {
                return res.status(404).json({ message: 'File not found' });
            }

            const downloadStream = bucket.openDownloadStream(new ObjectId(fileId));
            
            await new Promise((resolve, reject) => {
                downloadStream
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
                            fileId: fileId,
                            filename: fileInfo.filename
                        };
                        results.push(rowData);
                    })
                    .on('end', resolve)
                    .on('error', reject);
            });

            // Save to database and generate AI insights
            await DataModel.insertMany(results);
            const aiResponse = await generateAIInsights(results, prompt);

            res.status(200).json({
                message: 'CSV parsed, data saved to database, and AI insights generated.',
                aiResponse,
                rowCount: results.length,
                filename: fileInfo.filename
            });

        } finally {
            await client.close();
        }

    } catch (err) {
        console.error('Error processing file:', err);
        res.status(500).json({
            message: 'Error processing file',
            error: err.message
        });
    }
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

// Add this new controller to list all CSV files
exports.listAllFiles = async (req, res) => {
    try {
        const client = new MongoClient(uri);
        await client.connect();
        const db = client.db('final');

        try {
            // Query the fs.files collection
            const files = await db.collection('fs.files')
                .find({})
                .project({
                    filename: 1,
                    length: 1,
                    uploadDate: 1,
                    metadata: 1
                })
                .toArray();

            if (!files || files.length === 0) {
                return res.status(404).json({ 
                    message: 'No files found' 
                });
            }

            // Format the response
            const formattedFiles = files.map(file => ({
                id: file._id,
                filename: file.filename,
                size: file.length,
                uploadDate: file.uploadDate,
                metadata: file.metadata || {}
            }));

            res.status(200).json({
                message: 'Files retrieved successfully',
                files: formattedFiles,
                count: formattedFiles.length
            });

        } finally {
            await client.close();
        }
    } catch (err) {
        console.error('Error listing files:', err);
        res.status(500).json({ 
            message: 'Error retrieving files',
            error: err.message 
        });
    }
};
