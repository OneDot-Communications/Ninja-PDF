const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const tools = require('../controllers/tool.controller');

// Conversion TO PDF
router.post('/word-to-pdf', protect, tools.wordToPdf);
router.post('/excel-to-pdf', protect, tools.excelToPdf);
router.post('/powerpoint-to-pdf', protect, tools.powerpointToPdf);
router.post('/jpg-to-pdf', protect, tools.jpgToPdf);

// Conversion FROM PDF
router.post('/pdf-to-word', protect, tools.pdfToWord);
router.post('/pdf-to-excel', protect, tools.pdfToExcel);
router.post('/pdf-to-jpg', protect, tools.pdfToJpg);

// Optimization
router.post('/merge', protect, tools.mergePdf);
router.post('/split', protect, tools.splitPdf);
router.post('/compress-pdf', protect, tools.compressPdf);

// Security
router.post('/protect-pdf', protect, tools.protectPdf);
router.post('/unlock-pdf', protect, tools.unlockPdf);

module.exports = router;
