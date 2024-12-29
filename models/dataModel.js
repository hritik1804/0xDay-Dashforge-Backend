const mongoose = require('mongoose');

const dataSchema = new mongoose.Schema({
    fileId: {
        type: String,
        required: true
    },
    filename: {
        type: String,
        required: true
    },
    dynamicFields: {
        type: Map,
        of: new mongoose.Schema({
            type: String,
            value: mongoose.Schema.Types.Mixed
        }, { _id: false })
    },
    uploadDate: {
        type: Date,
        default: Date.now
    }
}, { strict: false });

module.exports = mongoose.model('Data', dataSchema); 