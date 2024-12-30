const mongoose = require('mongoose');

const dataEntrySchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  filteredData: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('DataEntry', dataEntrySchema);