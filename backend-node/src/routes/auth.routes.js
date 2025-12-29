const express = require('express');
const router = express.Router();
const { register, login, getProfile } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth');

router.post('/signup', register);
router.post('/login', login);
router.get('/user', protect, getProfile);
router.get('/users/me', protect, getProfile); // Alias

module.exports = router;
