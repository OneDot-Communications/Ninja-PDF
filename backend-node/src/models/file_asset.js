const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class FileAsset extends Model {
        static associate(models) {
            FileAsset.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
        }
    }

    FileAsset.init({
        uuid: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        name: DataTypes.STRING,
        original_name: DataTypes.STRING,
        size_bytes: DataTypes.BIGINT,
        mime_type: DataTypes.STRING,
        md5_hash: DataTypes.STRING,
        page_count: DataTypes.INTEGER,
        is_encrypted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        status: {
            type: DataTypes.ENUM('UPLOADING', 'AVAILABLE', 'FAILED', 'DELETED', 'EXPIRED'),
            defaultValue: 'UPLOADING'
        },
        storage_path: DataTypes.STRING,
        expires_at: DataTypes.DATE,
        metadata: DataTypes.JSONB
    }, {
        sequelize,
        modelName: 'FileAsset',
        tableName: 'file_assets',
        underscore: true
    });

    return FileAsset;
};
