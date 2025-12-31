const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class AuthAuditLog extends Model {
        static associate(models) {
            AuthAuditLog.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
        }
    }

    AuthAuditLog.init({
        user_id: {
            type: DataTypes.BIGINT,
            allowNull: true
        },
        event_type: {
            type: DataTypes.STRING,
            allowNull: false
        },
        ip_address: DataTypes.STRING, // GenericIPAddressField in Django
        user_agent: DataTypes.TEXT, // TextField in Django
        metadata: DataTypes.JSONB,
        created_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        }
    }, {
        sequelize,
        modelName: 'AuthAuditLog',
        tableName: 'auth_audit_logs',
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false // Disable updatedAt as it doesn't exist log tables
    });

    return AuthAuditLog;
};
