
import * as pdfjsLib from 'pdfjs-dist';
import { PDFTextItem } from '@/app/types/pdf-editor';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
    // Use local worker file from public folder instead of CDN
    // This avoids "Failed to fetch dynamically imported module" errors
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

export async function loadPDF(file: File) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    return pdf;
}

export async function extractTextItems(
    page: pdfjsLib.PDFPageProxy
): Promise<PDFTextItem[]> {
    const textContent = await page.getTextContent();
    const items: PDFTextItem[] = [];

    for (const item of textContent.items) {
        // PDF.js returns different item types, we need the ones with text
        if ('str' in item && item.str.trim()) {
            const transform = item.transform; // [scaleX, skewY, skewX, scaleY, translateX, translateY]

            // Extract position and dimensions from transform matrix
            const x = transform[4];
            const y = transform[5];
            const height = item.height || Math.abs(transform[3]); // Use scaleY if height not available
            const width = item.width || 0;

            // Extract font info
            const fontSize = Math.abs(transform[3]); // scaleY represents font size
            const fontName = item.fontName || 'sans-serif';

            items.push({
                text: item.str,
                x,
                y,
                width,
                height,
                fontName,
                fontSize,
                transform,
            });
        }
    }

    return items;
}

/**
 * Render PDF page WITHOUT text - only graphics, images, shapes
 * This is achieved by temporarily overriding fillText and strokeText
 */
export async function renderPDFPageWithoutText(
    page: pdfjsLib.PDFPageProxy,
    canvas: HTMLCanvasElement,
    scale: number
) {
    const viewport = page.getViewport({ scale });
    const context = canvas.getContext('2d');

    if (!context) throw new Error('Canvas context not available');

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // Store original methods
    const originalFillText = context.fillText.bind(context);
    const originalStrokeText = context.strokeText.bind(context);

    // Override text rendering methods to do nothing
    context.fillText = () => { };
    context.strokeText = () => { };

    const renderContext: any = {
        canvasContext: context,
        viewport,
    };

    await page.render(renderContext).promise;

    // Restore original methods
    context.fillText = originalFillText;
    context.strokeText = originalStrokeText;

    return { width: viewport.width, height: viewport.height };
}

/**
 * Original render with text (for reference/fallback)
 */
export async function renderPDFPage(
    page: pdfjsLib.PDFPageProxy,
    canvas: HTMLCanvasElement,
    scale: number
) {
    const viewport = page.getViewport({ scale });
    const context = canvas.getContext('2d');

    if (!context) throw new Error('Canvas context not available');

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const renderContext: any = {
        canvasContext: context,
        viewport,
    };

    await page.render(renderContext).promise;

    return { width: viewport.width, height: viewport.height };
}
