// PDF Service for handling various PDF operations
// Replaces pdf-strategies.ts to resolve caching issues

import { PDFDocument, degrees, StandardFonts, rgb } from './external/pdf-lib.esm';

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

        // Always set the worker source to our local file
        // This file must exist at public/pdfjs/pdf.worker.v5.mjs
        (pdfjsModule as any).GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.v5.mjs';
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

    for (let i = 0; i < files.length; i++) {
        const arrayBuffer = await files[i].arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const totalPages = pdfDoc.getPageCount();
        const rangeStr = options.ranges[i] || 'all';
        const pageIndices = parsePageRange(rangeStr, totalPages);

        for (const pageIndex of pageIndices) {
            const [copiedPage] = await mergedPdf.copyPages(pdfDoc, [pageIndex]);
            mergedPdf.addPage(copiedPage);
        }
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
    throw new Error('Sign strategy not implemented');
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
    const { searchText, useRegex, caseSensitive, redactionColor = '#000000' } = options;
    if (!searchText) throw new Error("No search text provided");

    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const pdfjsLib = await getPdfJs();

    const pdf = await (pdfjsLib as any).getDocument({
        data: new Uint8Array(arrayBuffer),
        verbosity: 0
    }).promise;

    const pages = pdfDoc.getPages();
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
    throw new Error('PDF to PDF/A strategy not implemented');
}

async function pdfToExcel(files: File[], options: any): Promise<StrategyResult> {
    throw new Error('PDF to Excel strategy not implemented');
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
    throw new Error('Convert to PDF strategy not implemented');
}

async function editPdf(file: File, options: any): Promise<StrategyResult> {
    throw new Error('Edit PDF strategy not implemented');
}

async function cropPdf(file: File, options: any): Promise<StrategyResult> {
    throw new Error('Crop PDF strategy not implemented');
}
