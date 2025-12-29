const stripeService = require('../services/stripe.service');

const createSubscription = async (req, res, next) => {
    try {
        const { planId, paymentMethodId } = req.body;
        // Basic mock implementation if stripeService isn't fully ready
        // const subscription = await stripeService.createSubscription(req.user.id, planId, paymentMethodId);

        // Return a mock success for now to unblock frontend
        res.status(201).json({
            status: 'success',
            data: {
                id: 'sub_mock_123',
                status: 'active',
                plan: { id: planId }
            }
        });
    } catch (error) {
        next(error);
    }
};

const getSubscriptions = async (req, res) => {
    // Return empty list or mock data
    res.json({
        status: 'success',
        data: []
    });
};

const getFeatures = async (req, res) => {
    // Return features based on user tier
    // Map Django features if possible
    const tier = req.user.tier || 'FREE';
    const isPaid = tier !== 'FREE';

    res.json({
        status: 'success',
        data: [
            { code: 'unlimited_pdf', enabled: true },
            { code: 'ocr', enabled: isPaid },
            { code: 'no_ads', enabled: isPaid },
            { code: 'priority_support', enabled: tier === 'PREMIUM' || tier === 'ENTERPRISE' }
        ]
    });
};

module.exports = {
    createSubscription,
    getSubscriptions,
    getFeatures
};
