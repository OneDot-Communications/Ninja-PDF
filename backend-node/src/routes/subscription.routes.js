const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const subController = require('../controllers/subscription.controller');

router.post('/subscribe', protect, subController.createSubscription);
router.get('/subscriptions', protect, subController.getSubscriptions);
router.get('/features', protect, subController.getFeatures);

module.exports = router;
