const fs = require('fs');
const path = require('path');
const { FileAsset } = require('../models');
const { v4: uuidv4 } = require('uuid');

const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

const validateFile = (file) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        throw new Error(`File type '${file.mimetype}' is not supported.`);
    }
    // TODO: Add magic number check for stricter validation
};

const processedUpload = async (file, user) => {
    validateFile(file);

    // In a real scenario, we would check user quota here using UserService logic

    const fileAsset = await FileAsset.create({
        user_id: user ? user.id : null,
        name: file.filename,
        original_name: file.originalname,
        size_bytes: file.size,
        mime_type: file.mimetype,
        status: 'AVAILABLE',
        storage_path: file.path,
        expires_at: user ? null : new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours for guests
    });

    return fileAsset;
};

module.exports = {
    processedUpload
};
