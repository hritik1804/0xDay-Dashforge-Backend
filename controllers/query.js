require('dotenv').config(); // Add this line to load the .env file

const { MongoClient } = require('mongodb');  // Add this line
const DataModel = require('../models/dataModel');


exports.queryCSVData = async (req, res) => {
    try {
        const { 
            fileId,
            searchTerm,
            field,
            sortBy,
            sortOrder = 'asc',
            page = 1,
            limit = 10
        } = req.query;

        console.log('Query parameters:', { fileId, searchTerm, field, sortBy, sortOrder, page, limit });

        // Build the query
        let query = {};
        
        // If fileId is provided, filter by specific file
        if (fileId) {
            query.fileId = fileId;
        }

        // If search term and field are provided
        if (searchTerm && field) {
            query[`dynamicFields.${field}.value`] = { 
                $regex: new RegExp(searchTerm, 'i')
            };
        }

        console.log('MongoDB query:', JSON.stringify(query, null, 2));

        // First, let's check what data exists in the collection
        const sampleData = await DataModel.findOne();
        console.log('Sample document from database:', JSON.stringify(sampleData, null, 2));

        // Calculate skip value for pagination
        const skip = (page - 1) * parseInt(limit);

        // Build sort object
        const sort = {};
        if (sortBy) {
            sort[`dynamicFields.${sortBy}.value`] = sortOrder === 'desc' ? -1 : 1;
        }

        // Execute query with pagination
        const results = await DataModel
            .find(query)
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        console.log(`Found ${results.length} results`);

        // Get total count for pagination
        const total = await DataModel.countDocuments(query);

        // Format the results to make them more readable
        const formattedResults = results.map(result => {
            const formattedFields = {};
            
            // Convert dynamicFields map to a more readable format
            if (result.dynamicFields) {
                Object.entries(result.dynamicFields).forEach(([key, fieldData]) => {
                    formattedFields[key] = fieldData.value;
                });
            }

            return {
                _id: result._id,
                fileId: result.fileId,
                filename: result.filename,
                uploadDate: result.uploadDate,
                fields: formattedFields
            };
        });

        res.status(200).json({
            success: true,
            data: formattedResults,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalRecords: total,
                limit: parseInt(limit)
            },
            debug: {
                query: query,
                sampleDocument: sampleData ? {
                    id: sampleData._id,
                    fields: Object.keys(sampleData.dynamicFields || {})
                } : null
            }
        });

    } catch (error) {
        console.error('Error querying data:', error);
        res.status(500).json({
            success: false,
            message: 'Error querying data',
            error: error.message,
            stack: error.stack
        });
    }
};
