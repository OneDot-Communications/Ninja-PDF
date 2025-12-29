const jobQueue = require('../jobs/job.queue');
const { Job } = require('../models');

const createJob = async (req, res, next, toolType) => {
    try {
        const { file_id, parameters } = req.body;

        // Create DB entry
        const job = await Job.create({
            user_id: req.user.id,
            file_asset_id: file_id,
            tool_type: toolType,
            parameters: parameters,
            status: 'QUEUED'
        });

        // Add to Bull Queue
        await jobQueue.add({
            type: toolType,
            fileId: file_id,
            userId: req.user.id,
            dbId: job.id,
            params: parameters
        });

        res.status(202).json({
            status: 'success',
            message: 'Job received',
            data: { job_id: job.id }
        });
    } catch (error) {
        next(error);
    }
};

// Conversion TO PDF
const wordToPdf = (req, res, next) => createJob(req, res, next, 'WORD_TO_PDF');
const excelToPdf = (req, res, next) => createJob(req, res, next, 'EXCEL_TO_PDF');
const powerpointToPdf = (req, res, next) => createJob(req, res, next, 'PPT_TO_PDF');
const jpgToPdf = (req, res, next) => createJob(req, res, next, 'JPG_TO_PDF');

// Conversion FROM PDF
const pdfToWord = (req, res, next) => createJob(req, res, next, 'PDF_TO_WORD');
const pdfToExcel = (req, res, next) => createJob(req, res, next, 'PDF_TO_EXCEL');
const pdfToJpg = (req, res, next) => createJob(req, res, next, 'PDF_TO_JPG');

// Optimization
const mergePdf = (req, res, next) => createJob(req, res, next, 'MERGE_PDF');
const splitPdf = (req, res, next) => createJob(req, res, next, 'SPLIT_PDF');
const compressPdf = (req, res, next) => createJob(req, res, next, 'COMPRESS_PDF');

// Security
const protectPdf = (req, res, next) => createJob(req, res, next, 'PROTECT_PDF');
const unlockPdf = (req, res, next) => createJob(req, res, next, 'UNLOCK_PDF');

module.exports = {
    wordToPdf,
    excelToPdf,
    powerpointToPdf,
    jpgToPdf,
    pdfToWord,
    pdfToExcel,
    pdfToJpg,
    mergePdf,
    splitPdf,
    compressPdf,
    protectPdf,
    unlockPdf
};
