
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

export async function rotatePdf(file: File, options: any): Promise<StrategyResult> {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const pdfPages = pdfDoc.getPages();

    // Handle new format: options.pages is an array of PageItem objects
    if (options.pages && Array.isArray(options.pages)) {
        for (const pageItem of options.pages) {
            const pageIndex = pageItem.originalIndex;
            const rotation = pageItem.rotation || 0;

            if (pageIndex >= 0 && pageIndex < pdfPages.length && rotation !== 0) {
                const normalizedRotation = ((rotation % 360) + 360) % 360;
                // Add rotation to existing page rotation
                const currentRotation = pdfPages[pageIndex].getRotation().angle;
                pdfPages[pageIndex].setRotation(degrees(currentRotation + normalizedRotation));
            }
        }
    }
    // Handle legacy format: options.rotations is a Record<number, number>
    else if (options.rotations) {
        for (let i = 0; i < pdfPages.length; i++) {
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
                pdfPages[i].setRotation(degrees(targetRotation));
            }
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

    const totalPages = sourcePdf.getPageCount();

    // Iterate through all pages to preserve document structure
    for (let i = 0; i < totalPages; i++) {
        const shouldCrop = applyToAll || (i === pageIndex - 1);

        if (shouldCrop) {
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
        } else {
            // For uncropped pages, simply copy them over
            const [copiedPage] = await newPdf.copyPages(sourcePdf, [i]);
            newPdf.addPage(copiedPage);
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
    const sourcePdf = await PDFDocument.load(arrayBuffer);
    const newPdf = await PDFDocument.create();
    const pageItems = options.pages || [];

    for (const pageItem of pageItems) {
        // Handle blank pages
        if (pageItem.isBlank) {
            const blankPage = newPdf.addPage();
            continue;
        }

        // Get the original page index (0-based)
        const originalIndex = typeof pageItem === 'number'
            ? pageItem - 1  // Legacy: if it's just a number, treat as 1-based page number
            : pageItem.originalIndex;  // New format: use originalIndex from page object

        if (originalIndex < 0 || originalIndex >= sourcePdf.getPageCount()) {
            continue; // Skip invalid page indices
        }

        const [copiedPage] = await newPdf.copyPages(sourcePdf, [originalIndex]);

        // Apply rotation if specified
        if (pageItem.rotation && pageItem.rotation !== 0) {
            copiedPage.setRotation(degrees(copiedPage.getRotation().angle + pageItem.rotation));
        }

        newPdf.addPage(copiedPage);
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

    // Parse options with defaults
    const format = options.format || 'n-of-m';
    const fontSize = options.fontSize || 12;
    const margin = options.margin || 20;
    const position = options.position || 'bottom-center';

    // Parse hex color to RGB (e.g., "#ff0000" -> { r: 1, g: 0, b: 0 })
    let textColor = rgb(0, 0, 0);
    if (options.color && options.color.startsWith('#')) {
        const hex = options.color.slice(1);
        const r = parseInt(hex.substring(0, 2), 16) / 255;
        const g = parseInt(hex.substring(2, 4), 16) / 255;
        const b = parseInt(hex.substring(4, 6), 16) / 255;
        textColor = rgb(r, g, b);
    }

    // Determine font
    let fontEnum = StandardFonts.Helvetica;
    if (options.fontFamily === 'Times-Roman') {
        fontEnum = StandardFonts.TimesRoman;
    } else if (options.fontFamily === 'Courier') {
        fontEnum = StandardFonts.Courier;
    }
    const font = await pdfDoc.embedFont(fontEnum);

    // Parse page range (e.g., "1-5" means pages 1 to 5)
    let startPage = 1;
    let endPage = pages.length;
    if (options.pageRange) {
        const [start, end] = options.pageRange.split('-').map((n: string) => parseInt(n));
        if (!isNaN(start)) startPage = start;
        if (!isNaN(end)) endPage = end;
    }

    for (let i = 0; i < pages.length; i++) {
        const pageNum = i + 1;
        // Only add numbers to pages in range
        if (pageNum < startPage || pageNum > endPage) continue;

        const page = pages[i];
        const { width, height } = page.getSize();

        // Generate text based on format
        const displayNum = pageNum - startPage + 1;
        const totalInRange = endPage - startPage + 1;
        let text = '';
        switch (format) {
            case 'n':
                text = `${displayNum}`;
                break;
            case 'page-n':
                text = `Page ${displayNum}`;
                break;
            case 'n-of-m':
                text = `${displayNum} of ${totalInRange}`;
                break;
            case 'page-n-of-m':
                text = `Page ${displayNum} of ${totalInRange}`;
                break;
            default:
                text = `${displayNum}`;
        }

        // Calculate position
        const textWidth = font.widthOfTextAtSize(text, fontSize);
        let x = margin;
        let y = margin;

        if (position.includes('center')) {
            x = (width - textWidth) / 2;
        } else if (position.includes('right')) {
            x = width - textWidth - margin;
        } else {
            x = margin;
        }

        if (position.includes('top')) {
            y = height - margin - fontSize;
        } else {
            y = margin;
        }

        page.drawText(text, {
            x,
            y,
            size: fontSize,
            font,
            color: textColor
        });
    }

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
    return { blob, fileName: `numbered-${file.name}`, extension: 'pdf' };
}

export async function editPdf(file: File, options: any): Promise<StrategyResult> {
    throw new Error('Full PDF editing is not available in client-mode.');
}
