require('dotenv').config();
const fs = require('fs');
const csv = require('csv-parser');
const DataModel = require('../models/dataModel');
const { generateAIInsights } = require('../middleware/openaiHelper'); // Assuming you have an AI helper function
const { MongoClient, GridFSBucket, ObjectId } = require('mongodb');
const mongoose = require('mongoose');
const path = require('path');

// MongoDB URI
const uri = process.env.MONGODB_URI;

// Helper function to detect the type of a field value
function detectType(value) {
    if (typeof value === 'string') {
        value = value.trim();
    }

    if (value === '' || value === null || value === undefined) {
        return { type: 'null', value: null };
    }

    if (!isNaN(value) && value !== '') {
        return { type: 'number', value: parseFloat(value) };
    }

    if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') {
        return { type: 'boolean', value: value.toLowerCase() === 'true' };
    }

    const dateValue = new Date(value);
    if (!isNaN(dateValue) && value.length > 5) {
        return { type: 'date', value: dateValue };
    }

    return { type: 'string', value: value };
}

// Process crew data
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

// Upload CSV file
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
        
        const readStream = fs.createReadStream(path);
        readStream.on('error', (error) => {
            console.error('Error reading file:', error);
            res.status(500).send('Error reading uploaded file.');
        });

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

        fs.unlinkSync(path);
        console.log('Temporary file cleaned up');

        res.status(200).json({
            message: `File uploaded successfully: ${filename}`,
            fileId: uploadStream.id.toString(),
            filename: filename
        });

    } catch (error) {
        console.error('Error in upload process:', error);
        if (fs.existsSync(path)) {
            fs.unlinkSync(path);
            console.log('Temporary file cleaned up after error');
        }

        res.status(500).json({
            message: 'Error uploading file',
            error: error.message
        });
    }
};

// Parse CSV, save to DB, generate AI insights
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

        await DataModel.deleteMany({ fileId });

        const downloadStream = bucket.openDownloadStream(new ObjectId(fileId));
        const results = [];
        const BATCH_SIZE = 1000;
        let batch = [];
        let headers = null;

        await new Promise((resolve, reject) => {
            downloadStream
                .pipe(csv({
                    strict: false,
                    skipLines: 0,
                    maxRows: Infinity,
                    headers: true,
                    skipEmptyLines: true,
                    ignoreEmpty: true,
                    trim: true
                }))
                .on('headers', (headerList) => {
                    // headers = headerList;
                    console.log('CSV Headers:', headerList);
                })
                .on('data', async (row) => {
                    try {
                        console.log('Row data received:', row);

                        if (!row || Object.keys(row).length === 0) {
                            console.warn('Skipping empty row');
                            return;
                        }

                        const dynamicFields = {};
                        
                        headers?.forEach(header => {
                            const value = row[header];
                            if (value !== '' && value !== undefined && value !== null) {
                                const { type, value: processedValue } = detectType(value);
                                dynamicFields[header] = { type, value: processedValue };
                            }
                        });

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
                            console.log('Inserting final batch of records...');
                            await DataModel.insertMany(batch);
                            results.push(...batch);
                        }
                        console.log('CSV parsing complete. Total records:', results.length);
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

        let aiInsights = null;
        if (results.length > 0) {
            console.log('Generating AI insights...');
            const prompt = `Analyze the following data and generate insights, trends, or notable patterns:`;
            aiInsights = await generateAIInsights(results, prompt);
        }

        res.status(200).json({
            success: true,
            message: 'CSV parsed, saved, and AI insights generated successfully',
            recordCount: results.length,
            aiInsights,
            sampleData: results.slice(0, 5)
        });

    } catch (error) {
        console.error('Error parsing CSV:', error);
        res.status(500).json({
            message: 'Error parsing and saving CSV data',
            error: error.message
        });
    } finally {
        client.close();
    }
};

// Read data by ID
exports.readDataById = async (req, res) => {
    const { id } = req.params;

    try {
        const data = await DataModel.findById(id);
        if (!data) {
            return res.status(404).json({ message: 'Data not found' });
        }
        res.status(200).json(data);
    } catch (error) {
        console.error('Error reading data:', error);
        res.status(500).json({ message: 'Error retrieving data', error: error.message });
    }
};

// List all uploaded files
exports.listAllFiles = async (req, res) => {
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db('final');
        const bucket = new GridFSBucket(db);
        const files = [];

        const cursor = bucket.find();
        await cursor.forEach((file) => {
            files.push(file);
        });

        res.status(200).json(files);
    } catch (error) {
        console.error('Error listing files:', error);
        res.status(500).json({ message: 'Error listing files', error: error.message });
    } finally {
        client.close();
    }
};
