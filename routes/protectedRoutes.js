// /routes/protectedRoutes.js

const express = require('express');
const clerkAuth = require('../middleware/clerkAuth');

const router = express.Router();

// Protected route
router.get('/dashboard', clerkAuth, (req, res) => {
  res.json({
    message: 'Welcome to the protected dashboard route!',
    user: req.auth.session.userId,
  });
});

module.exports = router;
