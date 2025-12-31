const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Subscription extends Model {
        static associate(models) {
            Subscription.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
        }
    }

    Subscription.init({
        user_id: DataTypes.INTEGER,
        stripe_customer_id: DataTypes.STRING,
        stripe_subscription_id: DataTypes.STRING,
        plan: {
            type: DataTypes.ENUM('FREE', 'PREMIUM', 'TEAM'),
            defaultValue: 'FREE'
        },
        status: {
            type: DataTypes.ENUM('active', 'past_due', 'canceled', 'incomplete', 'trialing'),
            defaultValue: 'active'
        },
        current_period_start: DataTypes.DATE,
        current_period_end: DataTypes.DATE,
        cancel_at_period_end: DataTypes.BOOLEAN
    }, {
        sequelize,
        modelName: 'Subscription',
        tableName: 'subscriptions',
        underscore: true
    });

    return Subscription;
};
