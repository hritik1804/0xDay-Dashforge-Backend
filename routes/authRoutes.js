
const express = require('express');
const { signup, login, getCurrentUser } = require('../controllers/Auth');

const router = express.Router();

// POST /api/auth/signup
router.post('/signup', signup);

// POST /api/auth/login
router.post('/login', login);

//get /api/auth/current-user
router.get('/current-user', getCurrentUser);

module.exports = router;