const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  companyName: {
    type: String,
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  typeOrganisation: {
    type: String,
    required: true,
  },
  teamSize: {
    type: String,
    required: true,
  },
  website: {
    type: String,
    required: true,
  },
  csvFileName: {
    type: String,
    required: false,
  },
});

const Organization = mongoose.model('Organization', organizationSchema);
module.exports = Organization;
