
import { PDFDocument, degrees, rgb } from '../../../external/pdf-lib.esm.js';
import { StrategyResult } from '../utils';

export async function mergePdf(files: File[], options: { ranges: string[], flatten: boolean }): Promise<StrategyResult> {
    const mergedPdf = await PDFDocument.create();
    const skippedFiles: string[] = [];

    for (let i = 0; i < files.length; i++) {
        try {
            const arrayBuffer = await files[i].arrayBuffer();
            const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
            const totalPages = pdfDoc.getPageCount();
            const rangeStr = options.ranges[i] || 'all';
            const pageIndices = parsePageRange(rangeStr, totalPages);

            for (const pageIndex of pageIndices) {
                const [copiedPage] = await mergedPdf.copyPages(pdfDoc, [pageIndex]);
                mergedPdf.addPage(copiedPage);
            }
        } catch (error: any) {
            if (error.message && error.message.includes('encrypted')) {
                skippedFiles.push(files[i].name);
                console.warn(`Skipping encrypted PDF: ${files[i].name}`);
            } else {
                throw error;
            }
        }
    }

    if (mergedPdf.getPageCount() === 0) {
        if (skippedFiles.length > 0) {
            throw new Error(`All PDFs are encrypted and cannot be processed. Please unlock them first using the Unlock PDF tool. Skipped files: ${skippedFiles.join(', ')}`);
        } else {
            throw new Error('No valid PDF pages found to merge');
        }
    }

    if (skippedFiles.length > 0) {
        console.warn(`Merged PDF but skipped encrypted files: ${skippedFiles.join(', ')}`);
    }

    const pdfBytes = await mergedPdf.save();
    const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
    return {
        blob,
        fileName: 'merged-document.pdf',
        extension: 'pdf'
    };
}

function parsePageRange(rangeStr: string, totalPages: number): number[] {
    if (!rangeStr || rangeStr.trim().toLowerCase() === 'all') {
        return Array.from({ length: totalPages }, (_, i) => i);
    }

    const pages = new Set<number>();
    const parts = rangeStr.split(',');

    for (const part of parts) {
        const trimmed = part.trim();
        if (trimmed.includes('-')) {
            const [start, end] = trimmed.split('-').map(Number);
            if (!isNaN(start) && !isNaN(end)) {
                for (let i = start; i <= end; i++) {
                    if (i >= 1 && i <= totalPages) pages.add(i - 1);
                }
            }
        } else {
            const page = Number(trimmed);
            if (!isNaN(page) && page >= 1 && page <= totalPages) {
                pages.add(page - 1);
            }
        }
    }

    return Array.from(pages).sort((a, b) => a - b);
}

export async function splitPdf(file: File, options: { selectedPages: number[], splitMode: 'merge' | 'separate' }): Promise<StrategyResult> {
    const JSZip = await import("jszip");
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const totalPages = pdfDoc.getPageCount();
    const selectedIndices = options.selectedPages.map(p => p - 1).filter(i => i >= 0 && i < totalPages);

    if (options.splitMode === 'separate') {
        const zip = new (JSZip as any).default();
        for (let i = 0; i < selectedIndices.length; i++) {
            const index = selectedIndices[i];
            const newPdf = await PDFDocument.create();
            const [copiedPage] = await newPdf.copyPages(pdfDoc, [index]);
            newPdf.addPage(copiedPage);
            const pdfBytes = await newPdf.save();
            zip.file(`page-${index + 1}.pdf`, pdfBytes);
        }
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        return {
            blob: zipBlob,
            fileName: `split-pages.zip`,
            extension: 'zip'
        };
    }

    const newPdf = await PDFDocument.create();
    for (const index of selectedIndices) {
        const [copiedPage] = await newPdf.copyPages(pdfDoc, [index]);
        newPdf.addPage(copiedPage);
    }

    const pdfBytes = await newPdf.save();
    const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
    return {
        blob,
        fileName: `split-${file.name}`,
        extension: 'pdf'
    };
}

export async function rotatePdf(file: File, options: { rotations: Record<number, number> }): Promise<StrategyResult> {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const pages = pdfDoc.getPages();

    for (let i = 0; i < pages.length; i++) {
        const rotation = options.rotations[i + 1] || 0;
        if (rotation !== 0) {
            const normalizedRotation = ((rotation % 360) + 360) % 360;
            let targetRotation: number;
            switch (normalizedRotation) {
                case 90: targetRotation = 90; break;
                case 180: targetRotation = 180; break;
                case 270: targetRotation = 270; break;
                default: targetRotation = 0;
            }
            pages[i].setRotation(degrees(targetRotation));
        }
    }

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
    return {
        blob,
        fileName: `rotated-${file.name}`,
        extension: 'pdf'
    };
}

export async function cropPdf(file: File, options: any): Promise<StrategyResult> {
    const { cropBox, rotation, applyToAll, pageIndex } = options;
    const arrayBuffer = await file.arrayBuffer();
    const sourcePdf = await PDFDocument.load(arrayBuffer);
    const newPdf = await PDFDocument.create();

    // Determine which pages to crop
    const pagesToCrop = applyToAll
        ? Array.from({ length: sourcePdf.getPageCount() }, (_, i) => i)
        : [pageIndex - 1];

    for (const i of pagesToCrop) {
        if (i < 0 || i >= sourcePdf.getPageCount()) continue;

        const sourcePage = sourcePdf.getPage(i);
        const { width: origWidth, height: origHeight } = sourcePage.getSize();

        // Calculate crop dimensions from percentages
        const cropX = (cropBox.x / 100) * origWidth;
        const cropY = (cropBox.y / 100) * origHeight;
        const cropWidth = (cropBox.width / 100) * origWidth;
        const cropHeight = (cropBox.height / 100) * origHeight;

        // Create a new page with the cropped dimensions
        const newPage = newPdf.addPage([cropWidth, cropHeight]);

        // Embed the source page
        const embeddedPage = await newPdf.embedPage(sourcePage);

        newPage.drawPage(embeddedPage, {
            x: -cropX,
            y: -(origHeight - cropY - cropHeight),
            width: origWidth,
            height: origHeight,
        });

        // Apply rotation if needed
        if (rotation && rotation !== 0) {
            const normalizedRotation = ((rotation % 360) + 360) % 360;
            let targetRotation: number;
            switch (normalizedRotation) {
                case 90: targetRotation = 90; break;
                case 180: targetRotation = 180; break;
                case 270: targetRotation = 270; break;
                default: targetRotation = 0;
            }
            if (targetRotation !== 0) {
                newPage.setRotation(degrees(targetRotation));
            }
        }
    }

    const pdfBytes = await newPdf.save();
    const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
    return {
        blob,
        fileName: `cropped-${file.name}`,
        extension: 'pdf'
    };
}

export async function organizePdf(files: File[], options: any): Promise<StrategyResult> {
    const file = files[0];
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const newPdf = await PDFDocument.create();
    const pageOrder = options.pages || [];

    for (const pNum of pageOrder) {
        const [page] = await newPdf.copyPages(pdfDoc, [pNum - 1]);
        newPdf.addPage(page);
    }

    const pdfBytes = await newPdf.save();
    const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
    return { blob, fileName: `organized-${file.name}`, extension: 'pdf' };
}

export async function compressPdf(file: File, options: { level: 'recommended' | 'extreme' }): Promise<StrategyResult> {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
    return {
        blob,
        fileName: `compressed-${file.name}`,
        extension: 'pdf'
    };
}

export async function addPageNumbers(file: File, options: any): Promise<StrategyResult> {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const pages = pdfDoc.getPages();
    const { StandardFonts } = await import('../../../external/pdf-lib.esm.js');
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const { width } = page.getSize();
        page.drawText(`${i + 1} / ${pages.length}`, {
            x: width / 2 - 10,
            y: 20,
            size: 10,
            font,
            color: rgb(0, 0, 0)
        });
    }

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
    return { blob, fileName: `numbered-${file.name}`, extension: 'pdf' };
}

export async function editPdf(file: File, options: any): Promise<StrategyResult> {
    throw new Error('Full PDF editing is not available in client-mode.');
}
