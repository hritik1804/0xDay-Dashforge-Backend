const Organization = require('../models/organisationModel');

// Create a new organization
exports.createOrganization = async (req, res) => {
  try {
    const { companyName, location, typeOrganisation, teamSize, website, csvFileName } = req.body;

    const organization = new Organization({
      companyName,
      location,
      typeOrganisation,
      teamSize,
      website,
      csvFileName
    });

    await organization.save();
    res.status(201).json(organization);
  } catch (error) {
    console.error('Error creating organization:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete an organization by ID
exports.deleteOrganization = async (req, res) => {
  const { id } = req.params;

  try {
    const organization = await Organization.findByIdAndDelete(id);

    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    res.status(200).json({ message: 'Organization deleted successfully' });
  } catch (error) {
    console.error('Error deleting organization:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get organization details by ID
exports.getOrganization = async (req, res) => {
    const { id } = req.params;
  
    try {
      // Find organization by ID
      const organization = await Organization.findById(id);
  
      if (!organization) {
        return res.status(404).json({ message: 'Organization not found' });
      }
  
      res.status(200).json(organization);
    } catch (error) {
      console.error('Error fetching organization:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  };
  
  exports.getAllOrganisations = async (req, res) => {
    try {
        const organisations = await Organization.find({});
        res.json(organisations);
    } catch (error) {
        console.error('Error fetching organisations:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
  };