const mongoose = require('mongoose');

const dataEntrySchema = new mongoose.Schema({
  filteredData: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('DataEntry', dataEntrySchema);
