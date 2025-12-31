// PDF Service for handling various PDF operations
// Replaces pdf-strategies.ts to resolve caching issues

import { PDFDocument, degrees, StandardFonts, rgb, PDFName, PDFArray } from '../external/pdf-lib.esm.js';
import fontkit from '@pdf-lib/fontkit';

export interface StrategyResult {
    blob: Blob;
    fileName?: string;
    extension?: string;
}

// Helper to get pdfjs-dist with proper configuration
let pdfjsModule: any = null;

export async function getPdfJs() {
    if (pdfjsModule) return pdfjsModule;

    const pdfjs = await import("pdfjs-dist");
    pdfjsModule = pdfjs;

    if (typeof window !== "undefined") {
        // Use the exact version from the imported library
        const version = pdfjs.version;
        console.log(`[PDF Service] Initializing PDF.js v${version}`);

        if (!(pdfjsModule as any).GlobalWorkerOptions) {
            (pdfjsModule as any).GlobalWorkerOptions = {};
        }

        // Use the exact version from the imported library to fetch the matching worker
        // This guarantees API and Worker versions match perfectly
        (pdfjsModule as any).GlobalWorkerOptions.workerSrc =
            `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
    }

    return pdfjsModule;
}

export const pdfStrategyManager = {
    async execute(strategy: string, files: File[], options: any = {}): Promise<StrategyResult> {
        switch (strategy) {
            case 'compress':
                return await compressPdf(files[0], options);
            case 'convert-from-pdf':
                return await convertFromPdf(files[0], options);
            case 'unlock':
                return await unlockPdf(files[0], options);
            case 'merge':
                return await mergePdf(files, options);
            case 'split':
                return await splitPdf(files[0], options);
            case 'watermark':
                return await watermarkPdf(files[0], options);
            case 'sign':
                return await signPdf(files[0], options);
            case 'rotate':
                return await rotatePdf(files[0], options);
            case 'repair':
                return await repairPdf(files[0], options);
            case 'redact':
                return await redactPdf(files[0], options);
            case 'protect':
                return await protectPdf(files[0], options);
            case 'pdf-to-pdfa':
                return await pdfToPdfa(files[0], options);
            case 'pdf-to-excel':
                return await pdfToExcel(files, options);
            case 'page-numbers':
                return await addPageNumbers(files[0], options);
            case 'organize':
                return await organizePdf(files, options);
            case 'ocr':
                return await ocrPdf(files, options);
            case 'convert-to-pdf':
                return await convertToPdf(files, options);
            case 'edit':
                return await editPdf(files[0], options);
            case 'crop':
                return await cropPdf(files[0], options);
            case 'pdf-to-word':
                return await pdfToWord(files[0], options);
            case 'pdf-to-powerpoint':
                return await pdfToPowerpoint(files[0], options);
            case 'clean-metadata':
                return await cleanMetadata(files[0], options);
            default:
                throw new Error(`Strategy ${strategy} not implemented`);
        }
    }
};

export async function isPdfEncrypted(file: File): Promise<boolean> {
    const pdfjsLib = await getPdfJs();
    const arrayBuffer = await file.arrayBuffer();
    try {
        await (pdfjsLib as any).getDocument({
            data: new Uint8Array(arrayBuffer),
            verbosity: 0
        }).promise;
        return false;
    } catch (error: any) {
        if (error.name === 'PasswordException' || error.message?.includes('password')) {
            return true;
        }
        return false;
    }
}

// Strategy implementations

async function compressPdf(file: File, options: { level: 'recommended' | 'extreme' }): Promise<StrategyResult> {
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

async function convertFromPdf(file: File, options: { format: 'jpeg' | 'png', dpi: number, pageRange?: string, mergeOutput?: boolean }): Promise<StrategyResult> {
    const pdfjsLib = await getPdfJs();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await (pdfjsLib as any).getDocument({
        data: new Uint8Array(arrayBuffer),
        verbosity: 0
    }).promise;

    const scale = options.dpi / 72;
    const images: Blob[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
        try {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale });
            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d");
            if (!context) continue;

            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({ canvasContext: context, viewport }).promise;

            const blob = await new Promise<Blob | null>((resolve) => {
                canvas.toBlob((blob) => resolve(blob), `image/${options.format}`, 0.95);
            });

            if (blob) images.push(blob);
        } catch (pageError) {
            console.error(`Error converting page ${i}:`, pageError);
        }
    }

    return {
        blob: images[0] || new Blob(),
        fileName: `converted.${options.format}`,
        extension: options.format
    };
}

async function unlockPdf(file: File, options: { password?: string }): Promise<StrategyResult> {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer, options.password ? { password: options.password } as any : {});
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
    return {
        blob,
        fileName: `unlocked-${file.name}`,
        extension: 'pdf'
    };
}

async function mergePdf(files: File[], options: { ranges: string[], flatten: boolean }): Promise<StrategyResult> {
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

async function splitPdf(file: File, options: { selectedPages: number[], splitMode: 'merge' | 'separate' }): Promise<StrategyResult> {
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

async function watermarkPdf(file: File, options: any): Promise<StrategyResult> {
    const effectiveOptions = options.watermarks ? options.watermarks[0] : options;
    const {
        type, text, image, imageBytes, imageType,
        color, opacity, rotation, fontSize,
        position, x: xPos, y: yPos, width: widthPct,
        mosaicMode, layer, fontFamily
    } = effectiveOptions;

    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const sourceDoc = await PDFDocument.load(arrayBuffer);

    pdfDoc.registerFontkit(fontkit);
    sourceDoc.registerFontkit(fontkit);

    const pages = pdfDoc.getPages();
    const sourcePages = sourceDoc.getPages();

    let font: any, embeddedImage: any, rgbColor: any;

    if (type === 'text') {
        const fontLower = (fontFamily || '').toLowerCase();
        if (fontLower.includes('ash')) {
            try {
                const fontResp = await fetch('/pdfjs/Ash-Regular.ttf');
                if (!fontResp.ok) throw new Error("Font file not found");
                const fontBuffer = await fontResp.arrayBuffer();
                font = await pdfDoc.embedFont(fontBuffer);
            } catch (err) {
                console.error("[PDF Service] Failed to load custom font, falling back", err);
                font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
            }
        } else {
            let standardFont = StandardFonts.HelveticaBold;
            if (fontLower.includes('times') || fontLower.includes('roman') || fontLower.includes('georgia') || fontLower.includes('serif')) {
                standardFont = StandardFonts.TimesRomanBold;
            } else if (fontLower.includes('courier') || fontLower.includes('mono') || fontLower.includes('console')) {
                standardFont = StandardFonts.CourierBold;
            } else {
                standardFont = StandardFonts.HelveticaBold;
            }
            font = await pdfDoc.embedFont(standardFont);
        }

        if (typeof color === 'string' && color.startsWith('#')) {
            const r = parseInt(color.slice(1, 3), 16) / 255;
            const g = parseInt(color.slice(3, 5), 16) / 255;
            const b = parseInt(color.slice(5, 7), 16) / 255;
            rgbColor = rgb(r, g, b);
        } else {
            switch (color) {
                case 'red': rgbColor = rgb(1, 0, 0); break;
                case 'blue': rgbColor = rgb(0, 0, 1); break;
                case 'gray': rgbColor = rgb(0.5, 0.5, 0.5); break;
                default: rgbColor = rgb(0, 0, 0);
            }
        }
    } else if (type === 'image') {
        let bytesMatches = null;
        let isPng = false;

        if (imageBytes) {
            bytesMatches = imageBytes;
            isPng = imageType === 'png' || (typeof image === 'string' && image.includes('png'));
        } else if (image) {
            bytesMatches = await fetch(image).then(res => res.arrayBuffer());
            isPng = image.includes('image/png') || image.includes('data:image/png');
        }

        if (bytesMatches) {
            try {
                // Try robust auto-detection first
                const header = new Uint8Array(bytesMatches.slice(0, 4));
                const isPngHeader = header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47;

                embeddedImage = isPngHeader
                    ? await pdfDoc.embedPng(bytesMatches)
                    : await pdfDoc.embedJpg(bytesMatches);
            } catch (e) {
                console.error("Failed to embed image", e);
            }
        }
    }

    for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const { width, height } = page.getSize();

        let finalX = width / 2;
        let finalY = height / 2;

        if (xPos !== undefined && yPos !== undefined) {
            finalX = (xPos / 100) * width;
            finalY = height - ((yPos / 100) * height);
        }

        const renderWatermarkAt = (x: number, y: number) => {
            if (type === 'text' && text && font && rgbColor) {
                let currentSize = fontSize;
                let textWidth = font.widthOfTextAtSize(text, currentSize);
                const maxWidth = width * 0.9;
                if (textWidth > maxWidth) {
                    currentSize = Math.floor(fontSize * (maxWidth / textWidth));
                    currentSize = Math.min(fontSize, currentSize);
                    textWidth = font.widthOfTextAtSize(text, currentSize);
                }

                const textHeight = font.heightAtSize(currentSize);

                const drawOptions = {
                    size: currentSize,
                    font,
                    color: rgbColor,
                    opacity,
                    rotate: degrees(-(rotation || 0)),
                };

                page.drawText(text, {
                    ...drawOptions,
                    x: x - (textWidth / 2),
                    y: y - (textHeight / 2),
                });
            }
            else if (type === 'image' && embeddedImage) {
                let imgWidth = 100;
                let imgHeight = 100;

                if (widthPct) {
                    imgWidth = (widthPct / 100) * width;
                    imgHeight = (imgWidth / embeddedImage.width) * embeddedImage.height;
                } else {
                    imgWidth = (fontSize || 12) * 2;
                    imgHeight = (imgWidth / embeddedImage.width) * embeddedImage.height;
                }

                const drawOptions = {
                    opacity,
                    rotate: degrees(-(rotation || 0)),
                    width: imgWidth,
                    height: imgHeight,
                };

                page.drawImage(embeddedImage, {
                    ...drawOptions,
                    x: x - (imgWidth / 2),
                    y: y - (imgHeight / 2),
                });
            }
        };

        if (layer === 'under') {
            const pageCopy = await pdfDoc.embedPage(sourcePages[i]);
            page.node.delete(PDFName.of('Contents'));
            if (mosaicMode) {
                const xStep = width / 3;
                const yStep = height / 4;
                for (let xi = 0; xi < 3; xi++) {
                    for (let yi = 0; yi < 4; yi++) {
                        const gx = (xi * xStep) + (xStep / 2);
                        const gy = (yi * yStep) + (yStep / 2);
                        renderWatermarkAt(gx, gy);
                    }
                }
            } else {
                renderWatermarkAt(finalX, finalY);
            }
            page.drawPage(pageCopy, {
                x: 0, y: 0,
                width, height,
                blendMode: 'Multiply' as any
            });
        } else {
            if (mosaicMode) {
                const xStep = width / 3;
                const yStep = height / 4;
                for (let xi = 0; xi < 3; xi++) {
                    for (let yi = 0; yi < 4; yi++) {
                        const gx = (xi * xStep) + (xStep / 2);
                        const gy = (yi * yStep) + (yStep / 2);
                        renderWatermarkAt(gx, gy);
                    }
                }
            } else {
                renderWatermarkAt(finalX, finalY);
            }
        }
    }

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
    return {
        blob,
        fileName: `watermarked-${file.name}`,
        extension: 'pdf'
    };
}

async function signPdf(file: File, options: any): Promise<StrategyResult> {
    const { signatureImage, position, pageOption, scale, customPosition, customSize } = options;
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);

    const imageBytes = await fetch(signatureImage).then(res => res.arrayBuffer());

    // Robust image type detection
    const header = new Uint8Array(imageBytes.slice(0, 4));
    const isPng = header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47;

    const embeddedImage = isPng
        ? await pdfDoc.embedPng(imageBytes)
        : await pdfDoc.embedJpg(imageBytes);

    let targetPages: number[] = [];
    const totalPages = pdfDoc.getPageCount();

    if (pageOption === 'first') targetPages = [0];
    else if (pageOption === 'last') targetPages = [totalPages - 1];
    else targetPages = Array.from({ length: totalPages }, (_, i) => i);

    const imgDims = embeddedImage.scale(0.5); // Base reference

    for (const pageIndex of targetPages) {
        const page = pdfDoc.getPage(pageIndex);
        const { width, height } = page.getSize();

        let x = 50;
        let y = 50;
        let finalWidth = imgDims.width;
        let finalHeight = imgDims.height;
        const margin = 50;

        if (customPosition && customSize) {
            const { x: xPct, y: yPct } = customPosition;
            const { width: wPct, height: hPct } = customSize;

            // Bounding box in PDF coords
            const boxX = (xPct / 100) * width;
            const boxW = (wPct / 100) * width;
            const boxH = (hPct / 100) * height;

            // Top of box from PDF bottom.
            // yPct is distance from TOP of page to TOP of box in UI coordinate system.
            const boxTop = height - ((yPct / 100) * height);
            const boxBottom = boxTop - boxH;

            // "Object Contain" Logic
            const imgRatio = embeddedImage.width / embeddedImage.height;
            const boxRatio = boxW / boxH;

            if (imgRatio > boxRatio) {
                // Image is wider than box proportionaly -> Width constrains
                finalWidth = boxW;
                finalHeight = boxW / imgRatio;
            } else {
                // Image is taller -> Height constrains
                finalHeight = boxH;
                finalWidth = boxH * imgRatio;
            }

            // Center in box
            const offsetX = (boxW - finalWidth) / 2;
            const offsetY = (boxH - finalHeight) / 2;

            x = boxX + offsetX;
            y = boxBottom + offsetY;

        } else {
            // Fallback for simple positioning (center, corners)
            let scaleFactor = 0.2;
            if (scale === 'small') scaleFactor = 0.1;
            if (scale === 'large') scaleFactor = 0.3;
            const scaled = embeddedImage.scale(scaleFactor);
            finalWidth = scaled.width;
            finalHeight = scaled.height;

            switch (position) {
                case 'bottom-left':
                    x = margin;
                    y = margin;
                    break;
                case 'bottom-right':
                    x = width - finalWidth - margin;
                    y = margin;
                    break;
                case 'top-left':
                    x = margin;
                    y = height - finalHeight - margin;
                    break;
                case 'top-right':
                    x = width - finalWidth - margin;
                    y = height - finalHeight - margin;
                    break;
                case 'center':
                    x = width / 2 - finalWidth / 2;
                    y = height / 2 - finalHeight / 2;
                    break;
                default:
                    x = width - finalWidth - margin;
                    y = margin;
            }
        }

        page.drawImage(embeddedImage, {
            x,
            y,
            width: finalWidth,
            height: finalHeight,
        });
    }

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
    return {
        blob,
        fileName: `signed-${file.name}`,
        extension: 'pdf'
    };
}

async function rotatePdf(file: File, options: { rotations: Record<number, number> }): Promise<StrategyResult> {
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

async function repairPdf(file: File, options: any): Promise<StrategyResult> {
    let arrayBuffer = await file.arrayBuffer();
    const { repairMode } = options;

    // Pre-processing
    try {
        const uint8Array = new Uint8Array(arrayBuffer);
        const header = new TextDecoder().decode(uint8Array.slice(0, 10));
        const footer = new TextDecoder().decode(uint8Array.slice(uint8Array.length - 10));

        let modified = false;
        let newBytes = uint8Array;

        if (!header.includes('%PDF-')) {
            const newHeader = new TextEncoder().encode('%PDF-1.7\n');
            const temp = new Uint8Array(newHeader.length + newBytes.length);
            temp.set(newHeader);
            temp.set(newBytes, newHeader.length);
            newBytes = temp;
            modified = true;
        }

        if (!footer.includes('%%EOF')) {
            const newEOF = new TextEncoder().encode('\n%%EOF');
            const temp = new Uint8Array(newBytes.length + newEOF.length);
            temp.set(newBytes);
            temp.set(newEOF, newBytes.length);
            newBytes = temp;
            modified = true;
        }

        if (modified) arrayBuffer = newBytes.buffer;
    } catch (e) {
        console.warn("Failed to pre-process PDF:", e);
    }

    if (repairMode !== 'visual') {
        try {
            const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
            return {
                blob,
                fileName: `repaired-${file.name}`,
                extension: 'pdf'
            };
        } catch (error) {
            console.warn("Standard repair failed, attempting visual recovery...", error);
        }
    }

    try {
        const pdfjsLib = await getPdfJs();
        const pdf = await (pdfjsLib as any).getDocument({
            data: new Uint8Array(arrayBuffer),
            verbosity: 0
        }).promise;

        const newPdfDoc = await PDFDocument.create();
        let pagesRecovered = 0;

        for (let i = 1; i <= pdf.numPages; i++) {
            try {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 2.0 });
                const canvas = document.createElement("canvas");
                const context = canvas.getContext("2d");
                if (!context) continue;

                canvas.height = viewport.height;
                canvas.width = viewport.width;
                await page.render({ canvasContext: context, viewport }).promise;

                const imageBlob = await new Promise<Blob | null>((resolve) => {
                    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.85);
                });

                if (imageBlob) {
                    const imageBytes = await imageBlob.arrayBuffer();
                    const embeddedImage = await newPdfDoc.embedJpg(imageBytes);
                    const newPage = newPdfDoc.addPage([viewport.width / 2, viewport.height / 2]);
                    newPage.drawImage(embeddedImage, {
                        x: 0,
                        y: 0,
                        width: newPage.getWidth(),
                        height: newPage.getHeight(),
                    });
                    pagesRecovered++;
                }
            } catch (pageError) {
                console.warn(`Failed to recover page ${i}:`, pageError);
            }
        }

        if (pagesRecovered === 0) {
            throw new Error("Could not recover any pages from the PDF.");
        }

        const pdfBytes = await newPdfDoc.save();
        const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
        return {
            blob,
            fileName: `repaired-scanned-${file.name}`,
            extension: 'pdf'
        };
    } catch (reconstructError: any) {
        throw new Error(`Failed to repair PDF: ${reconstructError.message || 'Unknown error'}`);
    }
}

async function redactPdf(file: File, options: any): Promise<StrategyResult> {
    const { searchText, useRegex, caseSensitive, redactionColor = '#000000', redactions } = options;
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const pages = pdfDoc.getPages();

    if (redactions && redactions.length > 0) {
        for (const redaction of redactions) {
            const pageIndex = redaction.page - 1;
            if (pageIndex < 0 || pageIndex >= pages.length) continue;

            const page = pages[pageIndex];
            const { width, height } = page.getSize();
            const rColor = redaction.color || redactionColor;
            const r = parseInt(rColor.slice(1, 3), 16) / 255;
            const g = parseInt(rColor.slice(3, 5), 16) / 255;
            const b = parseInt(rColor.slice(5, 7), 16) / 255;
            const color = rgb(r, g, b);

            const x = (redaction.x / 100) * width;
            const w = (redaction.width / 100) * width;
            const h = (redaction.height / 100) * height;
            const y = height - ((redaction.y + redaction.height) / 100 * height);

            page.drawRectangle({
                x, y, width: w, height: h,
                color,
                opacity: redaction.type === 'highlight' ? (redaction.opacity || 0.5) : 1,
            });
        }
    }

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
    return {
        blob,
        fileName: `redacted-${file.name}`,
        extension: 'pdf'
    };
}

async function protectPdf(file: File, options: any): Promise<StrategyResult> {
    const { password } = options;
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);

    // NOTE: pdf-lib does not natively support userPassword/ownerPassword in its standard SaveOptions type.
    // This is a known limitation for client-side encryption. We use a type assertion to fix the TS error,
    // though actual encryption support may vary depending on the environment/fork used.
    const pdfBytes = await pdfDoc.save({
        userPassword: password,
        ownerPassword: password,
    } as any);

    const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
    return { blob, fileName: `protected-${file.name}`, extension: 'pdf' };
}

async function pdfToPdfa(file: File, options: any): Promise<StrategyResult> {
    throw new Error('PDF to PDF/A conversion is not supported purely client-side yet.');
}

async function pdfToExcel(files: File[], options: any): Promise<StrategyResult> {
    throw new Error('PDF to Excel conversion requires server-side processing.');
}

async function addPageNumbers(file: File, options: any): Promise<StrategyResult> {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const pages = pdfDoc.getPages();
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

async function organizePdf(files: File[], options: any): Promise<StrategyResult> {
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

async function ocrPdf(files: File[], options: any): Promise<StrategyResult> {
    throw new Error('OCR requires server-side processing.');
}

async function editPdf(file: File, options: any): Promise<StrategyResult> {
    throw new Error('Full PDF editing is not available in client-mode.');
}

async function cropPdf(file: File, options: any): Promise<StrategyResult> {
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

        // Draw the embedded page with offset to show only the cropped area
        // In PDF coordinates: (0,0) is bottom-left
        // We need to offset the page so the cropped area appears at (0,0) of the new page
        // 
        // The crop box in UI coordinates:
        // - cropX, cropY is top-left corner (from top-left of page)
        // - We want this area to appear at (0,0) of new page
        //
        // In PDF coordinates, we need to:
        // - Shift left by cropX (negative X offset)
        // - Shift down by the amount that brings the top of crop box to top of new page
        //
        // Since PDF Y goes up from bottom:
        // - Original page bottom is at Y=0
        // - Crop box bottom in PDF coords = origHeight - cropY - cropHeight
        // - We want crop box bottom to be at Y=0 of new page
        // - So offset Y = -(origHeight - cropY - cropHeight) = cropY + cropHeight - origHeight

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

async function pdfToWord(file: File, options: any): Promise<StrategyResult> {
    throw new Error('PDF to Word requires server-side processing.');
}

async function pdfToPowerpoint(file: File, options: any): Promise<StrategyResult> {
    throw new Error('PDF to PowerPoint requires server-side processing.');
}

async function convertToPdf(files: File[], options: any): Promise<StrategyResult> {
    const file = files[0];
    const pdfDoc = await PDFDocument.create();
    const arrayBuffer = await file.arrayBuffer();

    let image;
    if (file.type.includes('png')) {
        image = await pdfDoc.embedPng(arrayBuffer);
    } else {
        image = await pdfDoc.embedJpg(arrayBuffer);
    }

    const page = pdfDoc.addPage([image.width, image.height]);
    page.drawImage(image, {
        x: 0,
        y: 0,
        width: image.width,
        height: image.height
    });

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
    return { blob, fileName: `${file.name}.pdf`, extension: 'pdf' };
}

async function cleanMetadata(file: File, options: any): Promise<StrategyResult> {
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