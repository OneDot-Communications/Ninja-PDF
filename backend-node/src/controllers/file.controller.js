const uploadService = require('../services/upload.service');
const { FileAsset } = require('../models');

const uploadFile = async (req, res, next) => {
    try {
        if (!req.file) {
            throw new Error('No file uploaded');
        }

        const fileAsset = await uploadService.processedUpload(req.file, req.user);

        res.status(201).json({
            status: 'success',
            data: { file: fileAsset }
        });
    } catch (error) {
        next(error);
    }
};

const listFiles = async (req, res, next) => {
    try {
        const files = await FileAsset.findAll({
            where: { user_id: req.user.id, status: 'AVAILABLE' },
            order: [['createdAt', 'DESC']]
        });

        res.json({
            status: 'success',
            data: { files }
        });
    } catch (error) {
        next(error);
    }
};

const getFile = async (req, res, next) => {
    try {
        const file = await FileAsset.findOne({
            where: { uuid: req.params.uuid, user_id: req.user.id }
        });

        if (!file) {
            return res.status(404).json({ status: 'fail', message: 'File not found' });
        }

        res.json({
            status: 'success',
            data: { file }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    uploadFile,
    listFiles,
    getFile
};
