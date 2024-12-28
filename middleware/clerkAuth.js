const { requireSession } = require('@clerk/clerk-sdk-node');

// Middleware to protect routes
const clerkAuth = (req, res, next) => {
  try {
    requireSession(req, res, next);
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

module.exports = clerkAuth;
