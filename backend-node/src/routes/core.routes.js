const express = require('express');
const coreController = require('../controllers/core.controller');

const router = express.Router();

router.get('/settings/public', coreController.getPublicSettings);

module.exports = router;
