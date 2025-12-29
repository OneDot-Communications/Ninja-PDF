const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Job extends Model {
        static associate(models) {
            Job.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
            // Job.belongsTo(models.FileAsset, { foreignKey: 'file_asset_id', as: 'fileAsset' });
        }
    }

    Job.init({
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        user_id: DataTypes.INTEGER,
        file_asset_id: DataTypes.UUID,
        tool_type: DataTypes.STRING,
        status: {
            type: DataTypes.ENUM('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED'),
            defaultValue: 'QUEUED'
        },
        priority: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        parameters: DataTypes.JSONB,
        result: DataTypes.JSONB,
        error: DataTypes.TEXT,
        celery_task_id: DataTypes.STRING // Keeping name for compatibility or reference
    }, {
        sequelize,
        modelName: 'Job',
        tableName: 'jobs',
        underscore: true
    });

    return Job;
};
