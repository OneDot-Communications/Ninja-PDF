// PDF Service for handling various PDF operations
// Replaces pdf-strategies.ts to resolve caching issues

import { PDFDocument, degrees, StandardFonts, rgb } from '../external/pdf-lib.esm.js';

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

        // Use worker from the installed package
        // This ensures the worker version matches the API version exactly
        (pdfjsModule as any).GlobalWorkerOptions.workerSrc = 
            new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).toString();
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
                return await organizePdf(files[0], options);
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
        const zip = new JSZip.default();
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
    const { type, text, image, color, opacity, rotation, fontSize, position } = options;
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const pages = pdfDoc.getPages();

    let font, embeddedImage, rgbColor;

    if (type === 'text') {
        font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        switch (color) {
            case 'red': rgbColor = rgb(1, 0, 0); break;
            case 'blue': rgbColor = rgb(0, 0, 1); break;
            case 'gray': rgbColor = rgb(0.5, 0.5, 0.5); break;
            default: rgbColor = rgb(0, 0, 0);
        }
    } else if (type === 'image' && image) {
        const imageBytes = await fetch(image).then(res => res.arrayBuffer());
        embeddedImage = image.includes('image/png')
            ? await pdfDoc.embedPng(imageBytes)
            : await pdfDoc.embedJpg(imageBytes);
    }

    for (const page of pages) {
        const { width, height } = page.getSize();

        if (type === 'text' && text && font && rgbColor) {
            const textWidth = font.widthOfTextAtSize(text, fontSize);
            const textHeight = font.heightAtSize(fontSize);
            const drawOptions = {
                size: fontSize,
                font,
                color: rgbColor,
                opacity,
                rotate: degrees(rotation),
            };

            if (position === 'tiled') {
                const xStep = width / 3;
                const yStep = height / 4;
                for (let x = xStep / 2; x < width; x += xStep) {
                    for (let y = yStep / 2; y < height; y += yStep) {
                        page.drawText(text, {
                            ...drawOptions,
                            x: x - textWidth / 2,
                            y: y - textHeight / 2,
                        });
                    }
                }
            } else {
                let x = width / 2 - textWidth / 2;
                let y = height / 2 - textHeight / 2;
                if (position === 'top') y = height - 150;
                if (position === 'bottom') y = 150;
                page.drawText(text, { ...drawOptions, x, y });
            }
        } else if (type === 'image' && embeddedImage) {
            let imgWidth = fontSize * 2;
            let imgHeight = (imgWidth / embeddedImage.width) * embeddedImage.height;

            if (position === 'tiled') {
                imgWidth = fontSize;
                imgHeight = (imgWidth / embeddedImage.width) * embeddedImage.height;
            }

            const drawOptions = {
                opacity,
                rotate: degrees(rotation),
                width: imgWidth,
                height: imgHeight,
            };

            if (position === 'tiled') {
                const xStep = width / 3;
                const yStep = height / 4;
                for (let x = xStep / 2; x < width; x += xStep) {
                    for (let y = yStep / 2; y < height; y += yStep) {
                        page.drawImage(embeddedImage, {
                            ...drawOptions,
                            x: x - imgWidth / 2,
                            y: y - imgHeight / 2,
                        });
                    }
                }
            } else {
                let x = width / 2 - imgWidth / 2;
                let y = height / 2 - imgHeight / 2;
                if (position === 'top') y = height - 150;
                if (position === 'bottom') y = 150;
                page.drawImage(embeddedImage, { ...drawOptions, x, y });
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
    const { signatureImage, position, pageOption, scale } = options;
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);

    const imageBytes = await fetch(signatureImage).then(res => res.arrayBuffer());
    const embeddedImage = await pdfDoc.embedPng(imageBytes);

    let targetPages: number[] = [];
    const totalPages = pdfDoc.getPageCount();

    if (pageOption === 'first') targetPages = [0];
    else if (pageOption === 'last') targetPages = [totalPages - 1];
    else targetPages = Array.from({ length: totalPages }, (_, i) => i);

    // Scale factor
    let scaleFactor = 0.2;
    if (scale === 'small') scaleFactor = 0.1;
    if (scale === 'large') scaleFactor = 0.3;

    const imgDims = embeddedImage.scale(scaleFactor);

    for (const pageIndex of targetPages) {
        const page = pdfDoc.getPage(pageIndex);
        const { width, height } = page.getSize();

        let x = 50;
        let y = 50;
        const margin = 50;

        switch (position) {
            case 'bottom-left':
                x = margin;
                y = margin;
                break;
            case 'bottom-right':
                x = width - imgDims.width - margin;
                y = margin;
                break;
            case 'top-left':
                x = margin;
                y = height - imgDims.height - margin;
                break;
            case 'top-right':
                x = width - imgDims.width - margin;
                y = height - imgDims.height - margin;
                break;
            case 'center':
                x = width / 2 - imgDims.width / 2;
                y = height / 2 - imgDims.height / 2;
                break;
        }

        page.drawImage(embeddedImage, {
            x,
            y,
            width: imgDims.width,
            height: imgDims.height,
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

    // Try standard repair first
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

    // Visual recovery
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
        console.error("Reconstruction failed:", reconstructError);
        if (reconstructError.name === 'InvalidPDFException' || reconstructError.message?.includes('Invalid PDF structure')) {
            throw new Error("This file is too severely corrupted to repair.");
        }
        throw new Error(`Failed to repair PDF: ${reconstructError.message || 'Unknown error'}`);
    }
}

async function redactPdf(file: File, options: any): Promise<StrategyResult> {
    const { searchText, useRegex, caseSensitive, redactionColor = '#000000', redactions } = options;

    if (!searchText && (!redactions || redactions.length === 0)) {
        throw new Error("No search text or redaction areas provided");
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const pages = pdfDoc.getPages();

    // Handle Manual Redactions
    if (redactions && redactions.length > 0) {
        for (const redaction of redactions) {
            const pageIndex = redaction.page - 1;
            if (pageIndex < 0 || pageIndex >= pages.length) continue;

            const page = pages[pageIndex];
            const { width, height } = page.getSize();

            // Parse color
            const rColor = redaction.color || redactionColor;
            const r = parseInt(rColor.slice(1, 3), 16) / 255;
            const g = parseInt(rColor.slice(3, 5), 16) / 255;
            const b = parseInt(rColor.slice(5, 7), 16) / 255;
            const color = rgb(r, g, b);

            if (redaction.type === 'area' || redaction.type === 'text' || redaction.type === 'highlight') {
                const x = (redaction.x / 100) * width;
                const w = (redaction.width / 100) * width;
                const h = (redaction.height / 100) * height;

                // Convert web coordinates (top-left) to PDF coordinates (bottom-left)
                const y = height - ((redaction.y + redaction.height) / 100 * height);

                page.drawRectangle({
                    x,
                    y,
                    width: w,
                    height: h,
                    color,
                    opacity: redaction.type === 'highlight' ? (redaction.opacity || 0.5) : 1,
                });
            }
        }
    }

    // Handle Search Text Redaction
    if (searchText) {
        const pdfjsLib = await getPdfJs();
        const pdf = await (pdfjsLib as any).getDocument({
            data: new Uint8Array(arrayBuffer),
            verbosity: 0
        }).promise;

        const r = parseInt(redactionColor.slice(1, 3), 16) / 255;
        const g = parseInt(redactionColor.slice(3, 5), 16) / 255;
        const b = parseInt(redactionColor.slice(5, 7), 16) / 255;
        const color = rgb(r, g, b);

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pdfLibPage = pages[i - 1];

            for (const item of textContent.items) {
                if (!('str' in item)) continue;

                const text = item.str;
                let match = false;

                if (useRegex) {
                    try {
                        const regex = new RegExp(searchText, caseSensitive ? 'g' : 'gi');
                        match = regex.test(text);
                    } catch (e) {
                        console.warn("Invalid regex:", searchText);
                    }
                } else {
                    match = caseSensitive
                        ? text.includes(searchText)
                        : text.toLowerCase().includes(searchText.toLowerCase());
                }

                if (match) {
                    const tx = item.transform;
                    const x = tx[4];
                    const y = tx[5];
                    const width = item.width;
                    const height = item.height || Math.abs(tx[3]);

                    pdfLibPage.drawRectangle({
                        x,
                        y: y - (height * 0.2),
                        width,
                        height: height * 1.2,
                        color,
                    });
                }
            }
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
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);

    (pdfDoc as any).encrypt({
        userPassword: options.userPassword || '',
        ownerPassword: options.ownerPassword || options.userPassword || '',
        permissions: {
            printing: options.permissions?.printing ? 'highResolution' : undefined,
            modifying: options.permissions?.modifying,
            copying: options.permissions?.copying,
            annotating: options.permissions?.annotating,
            fillingForms: options.permissions?.fillingForms,
            contentAccessibility: options.permissions?.contentAccessibility,
            documentAssembly: options.permissions?.documentAssembly,
        }
    });

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
    return {
        blob,
        fileName: `protected-${file.name}`,
        extension: 'pdf'
    };
}

async function pdfToPdfa(file: File, options: any): Promise<StrategyResult> {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);

    pdfDoc.setTitle(file.name);
    pdfDoc.setProducer('Ninja Reader');
    pdfDoc.setCreator('Ninja Reader');

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
    return {
        blob,
        fileName: `pdfa-${file.name}`,
        extension: 'pdf'
    };
}

async function pdfToExcel(files: File[], options: any): Promise<StrategyResult> {
    const { mergePages, rowTolerance, onProgress } = options;
    const ExcelJS = await import('exceljs');
    const pdfjsLib = await getPdfJs();
    const workbook = new ExcelJS.Workbook();
    let allData: any[][] = [];

    for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
        const file = files[fileIndex];
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await (pdfjsLib as any).getDocument({
            data: new Uint8Array(arrayBuffer),
            verbosity: 0
        }).promise;

        for (let i = 1; i <= pdf.numPages; i++) {
            if (onProgress) {
                onProgress({
                    status: 'processing',
                    progress: (i / pdf.numPages),
                    message: `Processing page ${i}`
                });
            }

            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();

            // Group items by Y coordinate (rows)
            const items = textContent.items.filter((item: any) => 'str' in item && item.str.trim());
            const rows: Record<number, any[]> = {};

            items.forEach((item: any) => {
                const y = Math.round(item.transform[5] / (rowTolerance || 5)) * (rowTolerance || 5);
                if (!rows[y]) rows[y] = [];
                rows[y].push({
                    x: item.transform[4],
                    text: item.str
                });
            });

            // Sort rows by Y (descending for PDF coordinates)
            const sortedY = Object.keys(rows).map(Number).sort((a, b) => b - a);
            const sheetData: any[][] = [];

            sortedY.forEach(y => {
                // Sort items in row by X
                const rowItems = rows[y].sort((a, b) => a.x - b.x);
                sheetData.push(rowItems.map(item => item.text));
            });

            if (mergePages) {
                allData = [...allData, ...sheetData, []]; // Add empty row between pages
            } else {
                const ws = workbook.addWorksheet(`Page ${i}`);
                sheetData.forEach(row => ws.addRow(row));
            }
        }
    }

    if (mergePages) {
        const ws = workbook.addWorksheet('Merged Data');
        allData.forEach(row => ws.addRow(row));
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    return {
        blob,
        fileName: `converted.xlsx`,
        extension: 'xlsx'
    };
}

async function addPageNumbers(file: File, options: {
    format: 'n' | 'page-n' | 'n-of-m' | 'page-n-of-m',
    startFrom: number,
    pageRange?: string,
    fontFamily: 'Helvetica' | 'TimesRoman' | 'Courier',
    fontSize: number,
    color: string,
    margin: number,
    position: 'bottom-center' | 'bottom-right' | 'top-right' | 'top-left' | 'bottom-left' | 'top-center'
}): Promise<StrategyResult> {
    const arrayBuffer = await file.arrayBuffer();

    try {
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const pages = pdfDoc.getPages();
        const totalPages = pages.length;

        let pagesToNumber: number[] = [];
        if (options.pageRange && options.pageRange.trim()) {
            const ranges = options.pageRange.split(',').map(r => r.trim());
            for (const range of ranges) {
                if (range.includes('-')) {
                    const [start, end] = range.split('-').map(n => parseInt(n.trim()));
                    if (!isNaN(start) && !isNaN(end)) {
                        for (let i = start; i <= end; i++) {
                            if (i >= 1 && i <= totalPages) {
                                pagesToNumber.push(i - 1);
                            }
                        }
                    }
                } else {
                    const page = parseInt(range);
                    if (!isNaN(page) && page >= 1 && page <= totalPages) {
                        pagesToNumber.push(page - 1);
                    }
                }
            }
        } else {
            pagesToNumber = Array.from({ length: totalPages }, (_, i) => i);
        }

        pagesToNumber = [...new Set(pagesToNumber)].sort((a, b) => a - b);
        let currentNumber = options.startFrom;

        for (const pageIndex of pagesToNumber) {
            const page = pages[pageIndex];
            const { width, height } = page.getSize();

            let x: number, y: number;
            const margin = options.margin;

            switch (options.position) {
                case 'bottom-left':
                    x = margin;
                    y = margin;
                    break;
                case 'bottom-center':
                    x = width / 2;
                    y = margin;
                    break;
                case 'bottom-right':
                    x = width - margin;
                    y = margin;
                    break;
                case 'top-left':
                    x = margin;
                    y = height - margin;
                    break;
                case 'top-center':
                    x = width / 2;
                    y = height - margin;
                    break;
                case 'top-right':
                    x = width - margin;
                    y = height - margin;
                    break;
                default:
                    x = width / 2;
                    y = margin;
            }

            let pageText: string;
            switch (options.format) {
                case 'n':
                    pageText = currentNumber.toString();
                    break;
                case 'page-n':
                    pageText = `Page ${currentNumber}`;
                    break;
                case 'n-of-m':
                    pageText = `${currentNumber} of ${totalPages}`;
                    break;
                case 'page-n-of-m':
                    pageText = `Page ${currentNumber} of ${totalPages}`;
                    break;
                default:
                    pageText = currentNumber.toString();
            }

            let font;
            switch (options.fontFamily) {
                case 'TimesRoman':
                    font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
                    break;
                case 'Courier':
                    font = await pdfDoc.embedFont(StandardFonts.Courier);
                    break;
                default:
                    font = await pdfDoc.embedFont(StandardFonts.Helvetica);
            }

            const colorMatch = options.color.match(/^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
            const r = colorMatch ? parseInt(colorMatch[1], 16) / 255 : 0;
            const g = colorMatch ? parseInt(colorMatch[2], 16) / 255 : 0;
            const b = colorMatch ? parseInt(colorMatch[3], 16) / 255 : 0;

            const textWidth = font.widthOfTextAtSize(pageText, options.fontSize);
            if (options.position.includes('center')) {
                x = x - textWidth / 2;
            } else if (options.position.includes('right')) {
                x = x - textWidth;
            }

            page.drawText(pageText, {
                x,
                y,
                size: options.fontSize,
                font,
                color: rgb(r, g, b)
            });

            currentNumber++;
        }

        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
        return {
            blob,
            fileName: `numbered-${file.name}`,
            extension: 'pdf'
        };
    } catch (error: any) {
        if (error.message?.includes('Invalid PDF structure') || error.name === 'InvalidPDFException') {
            throw new Error("The PDF file appears to be corrupted. Try using the Repair PDF tool first.");
        } else if (error.message?.includes('encrypted') || error.message?.includes('password')) {
            throw new Error("The PDF is encrypted. Please use the Unlock PDF tool first.");
        }
        throw error;
    }
}

async function organizePdf(file: File, options: { pages: Array<{ id: string, originalIndex: number, rotation: number, isBlank?: boolean }> }): Promise<StrategyResult> {
    const arrayBuffer = await file.arrayBuffer();
    const originalPdf = await PDFDocument.load(arrayBuffer);
    const newPdf = await PDFDocument.create();

    for (const pageItem of options.pages) {
        if (pageItem.isBlank) {
            const blankPage = newPdf.addPage();
            blankPage.setSize(595.28, 841.89);
        } else {
            const [copiedPage] = await newPdf.copyPages(originalPdf, [pageItem.originalIndex]);

            if (pageItem.rotation !== 0) {
                const normalizedRotation = ((pageItem.rotation % 360) + 360) % 360;
                let targetRotation: number;
                switch (normalizedRotation) {
                    case 90: targetRotation = 90; break;
                    case 180: targetRotation = 180; break;
                    case 270: targetRotation = 270; break;
                    default: targetRotation = 0;
                }
                copiedPage.setRotation(degrees(targetRotation));
            }

            newPdf.addPage(copiedPage);
        }
    }

    const pdfBytes = await newPdf.save();
    const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
    return {
        blob,
        fileName: `organized-${file.name}`,
        extension: 'pdf'
    };
}

// OCR using pdfjs-dist text extraction
async function ocrPdf(files: File[], options: any): Promise<StrategyResult> {
    const { onProgress } = options;
    const allText: string[] = [];

    for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
        const file = files[fileIndex];

        if (file.type === 'application/pdf') {
            try {
                const pdfjsLib = await getPdfJs();
                const arrayBuffer = await file.arrayBuffer();

                const pdf = await (pdfjsLib as any).getDocument({
                    data: new Uint8Array(arrayBuffer),
                    verbosity: 0
                }).promise;

                for (let i = 1; i <= pdf.numPages; i++) {
                    try {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();

                        const textItems = textContent.items
                            .filter((item: any) => 'str' in item && item.str.trim())
                            .map((item: any) => item.str);

                        const pageText = textItems.join(' ');

                        if (pageText.trim()) {
                            allText.push(`\n--- Page ${i} ---\n${pageText}\n`);
                        } else {
                            allText.push(`\n--- Page ${i} ---\n[No text found]\n`);
                        }

                        if (onProgress) {
                            onProgress({
                                currentPage: i,
                                totalPages: pdf.numPages,
                                pageProgress: 100,
                                message: `Extracted text from page ${i} of ${pdf.numPages}`
                            });
                        }
                    } catch (pageError) {
                        console.error(`Error extracting text from page ${i}:`, pageError);
                        allText.push(`\n--- Page ${i} ---\n[Error extracting text]\n`);
                    }
                }
            } catch (pdfError) {
                console.error(`Error processing PDF:`, pdfError);
                allText.push(`[Error processing PDF: ${file.name}]`);
            }
        } else {
            allText.push(`[Image file: ${file.name} - Text extraction only works for PDFs with embedded text]`);
        }
    }

    const textContent = allText.join('\n');
    const blob = new Blob([textContent], { type: 'text/plain' });
    return {
        blob,
        fileName: `extracted-text.txt`,
        extension: 'txt'
    };
}

async function convertToPdf(files: File[], options: any): Promise<StrategyResult> {
    const { pageSize, orientation, margin } = options;
    const pdfDoc = await PDFDocument.create();

    for (const file of files) {
        const imageBytes = await file.arrayBuffer();
        let embeddedImage;

        if (file.type.includes('png')) {
            embeddedImage = await pdfDoc.embedPng(imageBytes);
        } else {
            embeddedImage = await pdfDoc.embedJpg(imageBytes);
        }

        let pageWidth = 595.28; // A4
        let pageHeight = 841.89;

        if (pageSize === 'letter') {
            pageWidth = 612;
            pageHeight = 792;
        }

        if (orientation === 'landscape') {
            [pageWidth, pageHeight] = [pageHeight, pageWidth];
        }

        const page = pdfDoc.addPage([pageWidth, pageHeight]);

        let marginSize = 20;
        if (margin === 'none') marginSize = 0;
        if (margin === 'large') marginSize = 50;

        const availableWidth = pageWidth - (marginSize * 2);
        const availableHeight = pageHeight - (marginSize * 2);

        const imgDims = embeddedImage.scaleToFit(availableWidth, availableHeight);

        page.drawImage(embeddedImage, {
            x: pageWidth / 2 - imgDims.width / 2,
            y: pageHeight / 2 - imgDims.height / 2,
            width: imgDims.width,
            height: imgDims.height,
        });
    }

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
    return {
        blob,
        fileName: `converted-images.pdf`,
        extension: 'pdf'
    };
}

async function editPdf(file: File, options: any): Promise<StrategyResult> {
    const { elements } = options;
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const pages = pdfDoc.getPages();

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    for (const el of elements) {
        const page = pages[el.page - 1];
        if (!page) continue;

        const { width, height } = page.getSize();

        if (el.type === 'text') {
            const fontSize = el.fontSize || 12;
            const colorMatch = (el.color || '#000000').match(/^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
            const r = colorMatch ? parseInt(colorMatch[1], 16) / 255 : 0;
            const g = colorMatch ? parseInt(colorMatch[2], 16) / 255 : 0;
            const b = colorMatch ? parseInt(colorMatch[3], 16) / 255 : 0;

            // Convert percentage to points
            // UI origin is top-left, PDF is bottom-left
            const x = (el.x / 100) * width;
            const y = height - ((el.y / 100) * height) - fontSize; // Adjust for baseline

            page.drawText(el.content || '', {
                x,
                y,
                size: fontSize,
                font,
                color: rgb(r, g, b),
            });
        } else if (el.type === 'image' && el.imageBytes) {
            let embeddedImage;
            if (el.imageType === 'png') {
                embeddedImage = await pdfDoc.embedPng(el.imageBytes);
            } else {
                embeddedImage = await pdfDoc.embedJpg(el.imageBytes);
            }

            const targetWidth = (el.width / 100) * width;
            const dims = embeddedImage.scaleToFit(targetWidth, height);

            const x = (el.x / 100) * width;
            const y = height - ((el.y / 100) * height);

            page.drawImage(embeddedImage, {
                x,
                y: y - dims.height,
                width: dims.width,
                height: dims.height,
            });
        } else if (el.type === 'path' && el.pathData) {
            // Freehand drawing (SVG path)
            const colorMatch = (el.color || '#000000').match(/^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
            const r = colorMatch ? parseInt(colorMatch[1], 16) / 255 : 0;
            const g = colorMatch ? parseInt(colorMatch[2], 16) / 255 : 0;
            const b = colorMatch ? parseInt(colorMatch[3], 16) / 255 : 0;

            // pathData is a series of points {x, y} in percentage
            // We need to construct an SVG path string or draw lines
            // pdf-lib supports drawSvgPath, but constructing it from points is easier with drawLine for now
            // OR we can construct a path string "M x y L x y ..."

            // Let's use drawSvgPath if we can construct the string, but coordinates need scaling
            // Actually, drawing individual lines might be safer for coordinate transformation

            if (el.pathData.length > 1) {
                const pathColor = rgb(r, g, b);
                const thickness = el.strokeWidth || 2;

                for (let i = 0; i < el.pathData.length - 1; i++) {
                    const p1 = el.pathData[i];
                    const p2 = el.pathData[i + 1];

                    const x1 = (p1.x / 100) * width;
                    const y1 = height - (p1.y / 100) * height;
                    const x2 = (p2.x / 100) * width;
                    const y2 = height - (p2.y / 100) * height;

                    page.drawLine({
                        start: { x: x1, y: y1 },
                        end: { x: x2, y: y2 },
                        thickness,
                        color: pathColor,
                        opacity: el.opacity || 1,
                    });
                }
            }
        } else if (el.type === 'shape') {
            const colorMatch = (el.color || '#000000').match(/^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
            const r = colorMatch ? parseInt(colorMatch[1], 16) / 255 : 0;
            const g = colorMatch ? parseInt(colorMatch[2], 16) / 255 : 0;
            const b = colorMatch ? parseInt(colorMatch[3], 16) / 255 : 0;
            const shapeColor = rgb(r, g, b);

            const x = (el.x / 100) * width;
            const w = (el.width / 100) * width;
            const h = (el.height / 100) * height;
            const y = height - ((el.y / 100) * height) - h; // Bottom-left y

            if (el.shapeType === 'rectangle') {
                page.drawRectangle({
                    x,
                    y,
                    width: w,
                    height: h,
                    borderColor: shapeColor,
                    borderWidth: el.strokeWidth || 2,
                    color: undefined, // Transparent fill for now, or add fill support
                });
            } else if (el.shapeType === 'circle') {
                // pdf-lib drawCircle takes center x,y
                const cx = x + w / 2;
                const cy = y + h / 2;
                const radius = Math.min(w, h) / 2;

                page.drawCircle({
                    x: cx,
                    y: cy,
                    size: radius,
                    borderColor: shapeColor,
                    borderWidth: el.strokeWidth || 2,
                    color: undefined,
                });
            }
        }
    }

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
    return {
        blob,
        fileName: `edited-${file.name}`,
        extension: 'pdf'
    };
}

async function cropPdf(file: File, options: any): Promise<StrategyResult> {
    const { cropBox, applyToAll, pageIndex } = options;
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const pages = pdfDoc.getPages();

    const targetPages = applyToAll ? pages : [pages[pageIndex - 1]];

    for (const page of targetPages) {
        if (!page) continue;
        const { width, height } = page.getSize();

        // cropBox is in percentages (x, y, width, height)
        // UI origin is top-left
        const x = (cropBox.x / 100) * width;
        const w = (cropBox.width / 100) * width;
        const h = (cropBox.height / 100) * height;

        // PDF origin is bottom-left
        // y_ui is distance from top
        // y_pdf is distance from bottom
        // y_pdf = height - y_ui - h
        const y = height - ((cropBox.y / 100) * height) - h;

        page.setCropBox(x, y, w, h);
        page.setMediaBox(x, y, w, h);
    }

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
    return {
        blob,
        fileName: `cropped-${file.name}`,
        extension: 'pdf'
    };
}

async function pdfToWord(file: File, options: any): Promise<StrategyResult> {
    const { format, pageRange, preserveLineBreaks } = options;
    const pdfjsLib = await getPdfJs();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await (pdfjsLib as any).getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
    const totalPages = pdf.numPages;

    let pagesToConvert = new Set<number>();
    if (pageRange) {
        const parts = pageRange.split(",");
        parts.forEach((part: string) => {
            const range = part.trim().split("-");
            if (range.length === 2) {
                const start = parseInt(range[0]);
                const end = parseInt(range[1]);
                if (!isNaN(start) && !isNaN(end)) {
                    for (let i = start; i <= end; i++) {
                        if (i >= 1 && i <= totalPages) pagesToConvert.add(i);
                    }
                }
            } else if (range.length === 1) {
                const page = parseInt(range[0]);
                if (!isNaN(page) && page >= 1 && page <= totalPages) {
                    pagesToConvert.add(page);
                }
            }
        });
    } else {
        pagesToConvert = new Set(Array.from({ length: totalPages }, (_, i) => i + 1));
    }

    let fullText = "";

    for (let i = 1; i <= totalPages; i++) {
        if (!pagesToConvert.has(i)) continue;

        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();

        let pageText = "";
        if (preserveLineBreaks) {
            let lastY = -1;
            textContent.items.forEach((item: any) => {
                if (lastY !== -1 && Math.abs(item.transform[5] - lastY) > 10) {
                    pageText += "\n";
                }
                pageText += item.str + " ";
                lastY = item.transform[5];
            });
        } else {
            pageText = textContent.items.map((item: any) => item.str).join(" ");
        }

        fullText += pageText + "\n\n";
    }

    if (format === "txt") {
        const blob = new Blob([fullText], { type: "text/plain;charset=utf-8" });
        return {
            blob,
            fileName: `${file.name.replace(".pdf", "")}.txt`,
            extension: 'txt'
        };
    } else {
        const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' " +
            "xmlns:w='urn:schemas-microsoft-com:office:word' " +
            "xmlns='http://www.w3.org/TR/REC-html40'>" +
            "<head><meta charset='utf-8'><title>Export HTML to Word Document with JavaScript</title></head><body>";
        const footer = "</body></html>";

        const htmlContent = fullText.split("\n").map(line => `<p>${line}</p>`).join("");
        const sourceHTML = header + `<div>${htmlContent}</div>` + footer;

        const blob = new Blob(['\ufeff', sourceHTML], {
            type: 'application/msword'
        });

        return {
            blob,
            fileName: `${file.name.replace(".pdf", "")}.doc`,
            extension: 'doc'
        };
    }
}

async function pdfToPowerpoint(file: File, options: any): Promise<StrategyResult> {
    const { aspectRatio, quality, onProgress } = options;
    const pptxgen = (await import("pptxgenjs")).default;
    const pdfjsLib = await getPdfJs();

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await (pdfjsLib as any).getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
    const numPages = pdf.numPages;

    const pres = new pptxgen();
    pres.layout = aspectRatio === "16:9" ? "LAYOUT_16x9" : "LAYOUT_4x3";

    const scale = quality === "low" ? 1 : quality === "medium" ? 2 : 3;

    for (let i = 1; i <= numPages; i++) {
        if (onProgress) {
            onProgress({
                status: 'processing',
                progress: i / numPages,
                message: `Converting page ${i} of ${numPages}...`
            });
        }

        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: scale });

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        if (context) {
            await page.render({ canvasContext: context, viewport } as any).promise;
            const imageData = canvas.toDataURL("image/png");

            const slide = pres.addSlide();
            slide.addImage({
                data: imageData,
                x: 0,
                y: 0,
                w: "100%",
                h: "100%"
            });
        }
    }

    const pptxBlob = await pres.write({ outputType: 'blob' });
    return {
        blob: pptxBlob as Blob,
        fileName: file.name.replace(".pdf", ".pptx"),
        extension: 'pptx'
    };
}

async function cleanMetadata(file: File, options: any): Promise<StrategyResult> {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);

    // Clear standard metadata
    pdfDoc.setTitle('');
    pdfDoc.setAuthor('');
    pdfDoc.setSubject('');
    pdfDoc.setKeywords([]);
    pdfDoc.setProducer('');
    pdfDoc.setCreator('');
    pdfDoc.setCreationDate(new Date());
    pdfDoc.setModificationDate(new Date());

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
    return {
        blob,
        fileName: `clean-${file.name}`,
        extension: 'pdf'
    };
}

