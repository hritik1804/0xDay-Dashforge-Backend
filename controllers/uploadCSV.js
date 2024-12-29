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

// Add this helper function to process crew data
const processCrewData = (crewString) => {
    if (!crewString) return [];
    
    try {
        let validJsonString = crewString
            .replace(/'/g, '"')
            .replace(/None/g, 'null')
            .replace(/True/g, 'true')
            .replace(/False/g, 'false')
            .replace(/"\s+/g, '"')
            .replace(/\s+"/g, '"')
            .replace(/\n/g, '')
            .replace(/\r/g, '')
            .trim();

        if (!validJsonString.startsWith('[')) validJsonString = '[' + validJsonString;
        if (!validJsonString.endsWith(']')) validJsonString += ']';

        const parsedCrew = JSON.parse(validJsonString);
        return Array.isArray(parsedCrew) ? parsedCrew : [];
    } catch (err) {
        console.error('Error parsing crew field:', err);
        console.log('Problematic crew string:', crewString);
        return [];
    }
};

// Controller to upload CSV file
exports.uploadCSV = async (req, res) => {
    console.log('Starting file upload process...');
    console.log('File details:', req.file);

    if (!req.file) {
        return res.status(400).send('No file uploaded. Please ensure the file is attached and the field name is correct.');
    }

    const { path, filename } = req.file;

    try {
        console.log('Connecting to MongoDB...');
        const client = new MongoClient(uri, {
            maxPoolSize: 50,
            wtimeoutMS: 2500,
            useNewUrlParser: true
        });
        
        await client.connect();
        console.log('Connected to MongoDB for file upload');
        
        const db = client.db('final');
        const bucket = new GridFSBucket(db);

        console.log('Starting file stream to GridFS...');
        const uploadStream = bucket.openUploadStream(filename);
        
        // Add error handler for the read stream
        const readStream = fs.createReadStream(path);
        readStream.on('error', (error) => {
            console.error('Error reading file:', error);
            res.status(500).send('Error reading uploaded file.');
        });

        // Wrap the pipe operation in a promise
        await new Promise((resolve, reject) => {
            readStream
                .pipe(uploadStream)
                .on('error', (error) => {
                    console.error('Error uploading to GridFS:', error);
                    reject(error);
                })
                .on('finish', () => {
                    console.log('File upload to GridFS completed');
                    resolve();
                });
        });

        // Clean up the temporary file
        try {
            fs.unlinkSync(path);
            console.log('Temporary file cleaned up');
        } catch (cleanupError) {
            console.warn('Warning: Could not delete temporary file:', cleanupError);
        }

        console.log('Upload process completed successfully');
        res.status(200).json({
            message: `File uploaded successfully: ${filename}`,
            fileId: uploadStream.id.toString(),
            filename: filename
        });

    } catch (error) {
        console.error('Error in upload process:', error);
        // Try to clean up the temporary file in case of error
        try {
            if (fs.existsSync(path)) {
                fs.unlinkSync(path);
                console.log('Temporary file cleaned up after error');
            }
        } catch (cleanupError) {
            console.warn('Warning: Could not delete temporary file:', cleanupError);
        }

        res.status(500).json({
            message: 'Error uploading file',
            error: error.message
        });
    }
};

// Controller to parse CSV, save data to DB, and generate AI insights
// CSV Upload and Parsing
exports.parseCSVAndSaveToDB = async (req, res) => {
    const client = new MongoClient(uri);
    
    try {
        const { fileId } = req.body;
        
        if (!fileId) {
            return res.status(400).json({ message: 'Please provide a fileId' });
        }

        await client.connect();
        const db = client.db('final');
        const bucket = new GridFSBucket(db);

        // Delete existing records for this file
        await DataModel.deleteMany({ fileId });

        const downloadStream = bucket.openDownloadStream(new ObjectId(fileId));
        const results = [];
        const BATCH_SIZE = 1000;
        let batch = [];
        let headers = null;

        await new Promise((resolve, reject) => {
            downloadStream
                .pipe(csv({
                    strict: false, // Be more lenient with parsing
                    skipLines: 0,
                    maxRows: Infinity,
                    headers: true,
                    skipEmptyLines: true, // Skip empty lines
                    ignoreEmpty: true, // Ignore empty fields
                    trim: true // Trim whitespace from fields
                }))
                .on('headers', (headerList) => {
                    headers = headerList;
                    console.log('CSV Headers:', headers);
                })
                .on('data', async (row) => {
                    try {
                        // Validate row data
                        if (!row || Object.keys(row).length === 0) {
                            console.warn('Skipping empty row');
                            return;
                        }

                        const dynamicFields = {};
                        
                        // Process only the fields that exist in headers
                        headers?.forEach(header => {
                            const value = row[header];
                            if (value !== '' && value !== undefined && value !== null) {
                                const { type, value: processedValue } = detectType(value);
                                dynamicFields[header] = { type, value: processedValue };
                            }
                        });

                        // Only add row if it has data
                        if (Object.keys(dynamicFields).length > 0) {
                            const document = new DataModel({
                                fileId,
                                filename: req.body.filename,
                                dynamicFields,
                                uploadDate: new Date()
                            });

                            batch.push(document);
                            
                            if (batch.length >= BATCH_SIZE) {
                                await DataModel.insertMany(batch);
                                results.push(...batch);
                                batch = [];
                            }
                        }
                    } catch (error) {
                        console.error('Error processing row:', error, 'Row data:', row);
                    }
                })
                .on('end', async () => {
                    try {
                        if (batch.length > 0) {
                            await DataModel.insertMany(batch);
                            results.push(...batch);
                        }
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                })
                .on('error', (error) => {
                    console.error('CSV parsing error:', error);
                    reject(error);
                });
        });

        // Generate AI insights only if there are results
        let aiInsights = null;
        if (results.length > 0) {
            const prompt = `Analyze the following data and generate insights, trends, or notable patterns:`;
            aiInsights = await generateAIInsights(results, prompt);
        }

        res.status(200).json({
            success: true,
            message: 'CSV parsed, saved, and AI insights generated successfully',
            recordCount: results.length,
            aiInsights,
            sampleData: results.slice(0, 2).map(doc => ({
                fileId: doc.fileId,
                fields: doc.dynamicFields
            }))
        });

    } catch (error) {
        console.error('Error parsing CSV:', error);
        res.status(500).json({
            success: false,
            message: 'Error parsing CSV file',
            error: error.message
        });
    } finally {
        await client.close();
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
        const { id } = req.params;
        console.log('Searching for document with ID:', id);

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

            // Create an array to store the CSV data
            const results = [];

            // Create a read stream from GridFS
            const downloadStream = bucket.openDownloadStream(new ObjectId(id));

            // Parse the CSV data
            await new Promise((resolve, reject) => {
                downloadStream
                    .pipe(csv())
                    .on('data', (data) => {
                        results.push(data);
                    })
                    .on('end', resolve)
                    .on('error', reject);
            });

            res.status(200).json({
                message: 'File retrieved successfully',
                fileInfo: {
                    id: file._id,
                    filename: file.filename,
                    size: file.length,
                    uploadDate: file.uploadDate
                },
                data: results,
                rowCount: results.length
            });

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
