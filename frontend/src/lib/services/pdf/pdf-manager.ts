
import * as converters from './strategies/converters';
import * as security from './strategies/security';
import * as modifiers from './strategies/modifiers';
import * as metadata from './strategies/metadata';
import * as repair from './strategies/repair';
import { StrategyResult } from './utils';

export const pdfStrategyManager = {
    async execute(strategy: string, files: File[], options: any = {}): Promise<StrategyResult> {
        switch (strategy) {
            case 'compress':
                return await modifiers.compressPdf(files[0], options);
            case 'convert-from-pdf':
                return await converters.convertFromPdf(files[0], options);
            case 'unlock':
                return await security.unlockPdf(files[0], options);
            case 'merge':
                return await modifiers.mergePdf(files, options);
            case 'split':
                return await modifiers.splitPdf(files[0], options);
            case 'watermark':
                return await security.watermarkPdf(files[0], options);
            case 'sign':
                return await security.signPdf(files[0], options);
            case 'rotate':
                return await modifiers.rotatePdf(files[0], options);
            case 'repair':
                return await repair.repairPdf(files[0], options);
            case 'redact':
                return await security.redactPdf(files[0], options);
            case 'protect':
                return await security.protectPdf(files[0], options);
            case 'pdf-to-pdfa':
                return await converters.pdfToPdfa(files[0], options);
            case 'pdf-to-excel':
                return await converters.pdfToExcel(files, options);
            case 'page-numbers':
                return await modifiers.addPageNumbers(files[0], options);
            case 'organize':
                return await modifiers.organizePdf(files, options);
            case 'ocr':
                return await converters.ocrPdf(files, options);
            case 'convert-to-pdf':
                return await converters.convertToPdf(files, options);
            case 'edit':
                return await modifiers.editPdf(files[0], options);
            case 'crop':
                return await modifiers.cropPdf(files[0], options);
            case 'pdf-to-word':
                return await converters.pdfToWord(files[0], options);
            case 'pdf-to-powerpoint':
                return await converters.pdfToPowerpoint(files[0], options);
            case 'clean-metadata':
                return await metadata.cleanMetadata(files[0], options);
            case 'word-to-pdf':
                return await converters.wordToPdf(files, options);
            default:
                throw new Error(`Strategy ${strategy} not implemented`);
        }
    }
};
