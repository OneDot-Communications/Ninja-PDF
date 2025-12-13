
import { PDFTextItem, CanvasTextItem, PDFPageDimensions } from '@/app/types/pdf-editor';

/**
 * Transform PDF coordinates to Canvas coordinates
 * 
 * PDF coordinate system:
 * - Origin: bottom-left
 * - Y-axis: increases upward
 * 
 * Canvas coordinate system:
 * - Origin: top-left
 * - Y-axis: increases downward
 * 
 * Transformation: canvasY = pageHeight - pdfY
 */
export function pdfToCanvas(
    pdfItem: PDFTextItem,
    pageDimensions: PDFPageDimensions
): CanvasTextItem {
    const { width: pageWidth, height: pageHeight, scale } = pageDimensions;

    // PDF.js returns coordinates in PDF units, we scale them
    const scaledX = pdfItem.x * scale;
    const scaledY = pdfItem.y * scale;
    const scaledHeight = pdfItem.height * scale;
    const scaledWidth = pdfItem.width * scale;

    // Flip Y-axis: PDF origin is bottom-left, Canvas is top-left
    const canvasTop = pageHeight - scaledY - scaledHeight;

    return {
        text: pdfItem.text,
        left: scaledX,
        top: canvasTop,
        width: scaledWidth,
        height: scaledHeight,
        fontSize: pdfItem.fontSize * scale,
        fontFamily: pdfItem.fontName || 'Arial',
    };
}

/**
 * Get optimal scale to fit PDF page in viewport
 */
export function calculateScale(
    pdfWidth: number,
    pdfHeight: number,
    maxWidth: number = 800,
    maxHeight: number = 1000
): number {
    const scaleX = maxWidth / pdfWidth;
    const scaleY = maxHeight / pdfHeight;
    return Math.min(scaleX, scaleY, 2); // Max 2x scale
}
