
import { PDFDocument, StandardFonts, rgb, PDFName, degrees } from '../../../external/pdf-lib.esm.js';
import fontkit from '@pdf-lib/fontkit';
import { StrategyResult } from '../utils';

export async function unlockPdf(file: File, options: { password?: string }): Promise<StrategyResult> {
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

export async function protectPdf(file: File, options: any): Promise<StrategyResult> {
    const { password } = options;
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);

    // NOTE: pdf-lib does not natively support userPassword/ownerPassword in its standard SaveOptions type.
    // This is a known limitation for client-side encryption. We use a type assertion to fix the TS error.
    const pdfBytes = await pdfDoc.save({
        userPassword: password,
        ownerPassword: password,
    } as any);

    const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
    return { blob, fileName: `protected-${file.name}`, extension: 'pdf' };
}

export async function signPdf(file: File, options: any): Promise<StrategyResult> {
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

export async function redactPdf(file: File, options: any): Promise<StrategyResult> {
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

export async function watermarkPdf(file: File, options: any): Promise<StrategyResult> {
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
