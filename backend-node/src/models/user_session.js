const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class UserSession extends Model {
        static associate(models) {
            UserSession.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
        }
    }

    UserSession.init({
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        user_id: {
            type: DataTypes.BIGINT,
            allowNull: false
        },
        ip_address: DataTypes.STRING,
        user_agent: DataTypes.TEXT, // Text in Django
        device_fingerprint: DataTypes.STRING,
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        created_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
        last_activity: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        }
    }, {
        sequelize,
        modelName: 'UserSession',
        tableName: 'user_sessions',
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'last_activity' // Map Sequelize's updatedAt to Django's last_activity
    });

    return UserSession;
};
