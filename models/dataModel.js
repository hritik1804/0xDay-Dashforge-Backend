const mongoose = require('mongoose');

const dataSchema = new mongoose.Schema({
    // Add your schema fields here, for example:
    filename: {
        type: String,
        required: true
    },
    uploadDate: {
        type: Date,
        default: Date.now
    },
    data: {
        type: Array,
        required: true
    }
    // Add any other fields you need for your CSV data
});

module.exports = mongoose.model('Data', dataSchema); 