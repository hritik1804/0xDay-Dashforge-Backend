const express = require('express');
const router = express.Router();
const authController = require('../controllers/Auth');

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/me', authController.getCurrentUser);

module.exports = router;
