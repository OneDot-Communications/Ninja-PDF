
const { Model } = require('sequelize');
const { verifyPassword, hashPassword } = require('../utils/password');

module.exports = (sequelize, DataTypes) => {
    class User extends Model {
        static associate(models) {
            // define association here
        }

        async validatePassword(password) {
            // Use our custom utility that supports both Django and Bcrypt
            return verifyPassword(password, this.password);
        }
    }

    User.init({
        id: {
            type: DataTypes.BIGINT,
            autoIncrement: true,
            primaryKey: true
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true
            }
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false
        },
        first_name: {
            type: DataTypes.STRING,
            allowNull: true
        },
        last_name: {
            type: DataTypes.STRING,
            allowNull: true
        },
        role: {
            type: DataTypes.ENUM('SUPER_ADMIN', 'ADMIN', 'USER'),
            defaultValue: 'USER'
        },
        subscription_tier: {
            type: DataTypes.ENUM('FREE', 'PRO', 'PREMIUM', 'ENTERPRISE'),
            defaultValue: 'FREE'
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        is_staff: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        is_superuser: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        date_joined: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
        last_login: {
            type: DataTypes.DATE,
            allowNull: true
        },
        is_verified: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        avatar: {
            type: DataTypes.STRING, // ImageField usually stores path string
            allowNull: true
        },
        // New fields to match Django
        phone_number: DataTypes.STRING,
        country: DataTypes.STRING,
        timezone: {
            type: DataTypes.STRING,
            defaultValue: 'UTC'
        },
        is_banned: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        banned_until: DataTypes.DATE,
        ban_reason: DataTypes.TEXT,
        is_2fa_enabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        }
    }, {
        sequelize,
        modelName: 'User',
        tableName: 'users', // Matches Django Meta db_table
        underscored: true, // Use snake_case for fields (created_at, updated_at) to match Django default
        timestamps: true,
        createdAt: 'date_joined', // Django uses date_joined
        updatedAt: false // Boolean | String. false = disable timestamp handling.
        // WARNING: Django AbstractUser does NOT have updated_at by default. 
        // If table exists, we should check if updated_at works. 
        // Safe bet: Disable timestamps and map createdAt to date_joined manually or use standard.
        // Actually, let's keep it simple. If usage fails, we fix.
    });

    // Hooks
    User.beforeSave(async (user, options) => {
        if (user.changed('password')) {
            user.password = await hashPassword(user.password);
        }
    });

    return User;
};
