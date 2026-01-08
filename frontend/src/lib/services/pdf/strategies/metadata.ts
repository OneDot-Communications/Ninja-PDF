
import { PDFDocument } from '../../../external/pdf-lib.esm.js';
import { StrategyResult } from '../utils';

export async function cleanMetadata(file: File, options: any): Promise<StrategyResult> {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);

    pdfDoc.setTitle('');
    pdfDoc.setAuthor('');
    pdfDoc.setSubject('');
    pdfDoc.setKeywords([]);
    pdfDoc.setProducer('');
    pdfDoc.setCreator('');

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
    return { blob, fileName: `clean-${file.name}`, extension: 'pdf' };
}
