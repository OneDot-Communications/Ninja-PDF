// Placeholder for Stripe logic
// const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Subscription, User } = require('../models');

const createCustomer = async (user) => {
    // const customer = await stripe.customers.create({ email: user.email });
    // return customer;
    return { id: 'cus_placeholder_' + user.id };
};

const createSubscription = async (userId, planId) => {
    // const subscription = await stripe.subscriptions.create({ ... });
    // Update DB
    await Subscription.create({
        user_id: userId,
        status: 'active',
        plan: 'PREMIUM'
    });
    return { id: 'sub_placeholder_123', status: 'active' };
};

module.exports = {
    createCustomer,
    createSubscription
};
