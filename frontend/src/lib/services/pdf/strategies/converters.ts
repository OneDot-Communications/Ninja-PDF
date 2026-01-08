
import { PDFDocument } from '../../../external/pdf-lib.esm.js';
import { getPdfJs, StrategyResult } from '../utils';

export async function convertFromPdf(file: File, options: { format: 'jpeg' | 'png', dpi: number, pageRange?: string, mergeOutput?: boolean }): Promise<StrategyResult> {
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

export async function pdfToExcel(files: File[], options: any): Promise<StrategyResult> {
    const file = files[0];
    const arrayBuffer = await file.arrayBuffer();
    const pdfjsLib = await getPdfJs();
    const pdf = await (pdfjsLib as any).getDocument({
        data: new Uint8Array(arrayBuffer),
        verbosity: 0
    }).promise;

    const XLSX = await import("xlsx");
    const workbook = XLSX.utils.book_new();
    const mergeSheets = options.mergeSheets;

    let allRows: any[][] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const viewport = page.getViewport({ scale: 1.0 });

        // Group text items by Y coordinate (row)
        // PDF coordinates: Y increases from bottom to top usually, but pdf.js viewport can vary. 
        // We utilize transform[5] for Y (inverted) and transform[4] for X.
        const rows: { [key: number]: { x: number, text: string }[] } = {};

        for (const item of textContent.items as any[]) {
            // Round Y to group roughly aligned items
            const y = Math.round(item.transform[5]);
            if (!rows[y]) rows[y] = [];
            rows[y].push({ x: item.transform[4], text: item.str });
        }

        // Sort rows by Y (Top to Bottom -> Descending Y for PDF coordinates)
        const sortedY = Object.keys(rows).map(Number).sort((a, b) => b - a);

        const pageRows: any[][] = [];
        for (const y of sortedY) {
            // Sort items in row by X (Left to Right -> Ascending)
            const rowItems = rows[y].sort((a, b) => a.x - b.x);
            pageRows.push(rowItems.map(item => item.text));
        }

        if (mergeSheets) {
            allRows = allRows.concat(pageRows);
            // Add an empty row between pages
            allRows.push([]);
        } else {
            const worksheet = XLSX.utils.aoa_to_sheet(pageRows);
            XLSX.utils.book_append_sheet(workbook, worksheet, `Page ${i}`);
        }
    }

    if (mergeSheets) {
        const worksheet = XLSX.utils.aoa_to_sheet(allRows);
        XLSX.utils.book_append_sheet(workbook, worksheet, "Merged Data");
    }

    const outputFormat = options.outputFormat || 'xlsx';

    if (outputFormat === 'csv') {
        // For CSV, we typically just want the first sheet or the merged data
        const firstSheetName = workbook.SheetNames[0];
        const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[firstSheetName]);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        return {
            blob,
            fileName: `${file.name.replace(/\.[^/.]+$/, "")}.csv`,
            extension: 'csv'
        };
    } else {
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        return {
            blob,
            fileName: `${file.name.replace(/\.[^/.]+$/, "")}.xlsx`,
            extension: 'xlsx'
        };
    }
}

export async function pdfToPowerpoint(file: File, options: any): Promise<StrategyResult> {
    const pdfjsLib = await getPdfJs();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await (pdfjsLib as any).getDocument({
        data: new Uint8Array(arrayBuffer),
        verbosity: 0
    }).promise;

    const PptxGenJS = (await import("pptxgenjs")).default;
    const pres = new PptxGenJS();

    // 1. Setup Layout based on the first page of the PDF
    // PDF page sizes are in points (1/72 inch). PPTX uses inches.
    if (pdf.numPages > 0) {
        const page1 = await pdf.getPage(1);
        const viewport1 = page1.getViewport({ scale: 1.0 });
        const wInches = viewport1.width / 72;
        const hInches = viewport1.height / 72;
        
        pres.defineLayout({ name: 'PDF_LAYOUT', width: wInches, height: hInches });
        pres.layout = 'PDF_LAYOUT';
    } else {
        pres.layout = 'LAYOUT_16x9'; 
    }

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const slide = pres.addSlide();

        if (options?.mode === 'maintain') {
            // High-quality image mode (Full Page Image)
            await renderPageAsImage(page, slide);
        } else {
            // Edit Mode: Text extraction with layout preservation
            await extractFormattedContent(page, slide);
        }
    }

    const blob = await pres.write({ outputType: "blob" }) as Blob;

    return {
        blob,
        fileName: file.name.replace(/\.[^/.]+$/, "") + ".pptx",
        extension: 'pptx'
    };
}

async function renderPageAsImage(page: any, slide: any): Promise<void> {
    const viewport = page.getViewport({ scale: 2.0 }); // Good balance of quality/perf
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) return;

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({ 
        canvasContext: context, 
        viewport: viewport,
        intent: 'print'
    }).promise;
    
    const dataUrl = canvas.toDataURL('image/png', 1.0);
    
    slide.addImage({ 
        data: dataUrl, 
        x: 0, 
        y: 0, 
        w: "100%", 
        h: "100%",
        sizing: { type: 'contain', w: "100%", h: "100%" }
    });
}

async function extractFormattedContent(page: any, slide: any): Promise<void> {
    // Use scale 1.0 for coordinate mapping (Points -> Inches)
    const viewport = page.getViewport({ scale: 1.0 });
    const textContent = await page.getTextContent();
    
    // Group text items into blocks, aiming for fidelity (avoiding merging across columns)
    const textBlocks = groupTextItems(textContent.items, viewport);
    
    for (const block of textBlocks) {
        addTextBlock(slide, block);
    }
    
    // Extract and add images
    try {
        const operatorList = await page.getOperatorList();
        await extractImages(page, slide, operatorList, viewport);
    } catch (e) {
        console.warn("Image extraction failed", e);
    }
}

interface TextItem {
    str: string;
    transform: number[];
    width: number;
    height: number;
    fontName?: string;
}

interface TextBlock {
    text: string;
    x: number;      // Inches
    y: number;      // Inches
    width: number;  // Inches
    height: number; // Inches
    fontSize: number; // Points
    fontName: string;
    isBold: boolean;
    isItalic: boolean;
    color: string;
    align: 'left' | 'center' | 'right';
}

function groupTextItems(items: TextItem[], viewport: any): TextBlock[] {
    const blocks: TextBlock[] = [];
    
    // Sort items: Top-to-bottom, then Left-to-right
    // Note: PDF Y coordinates start at bottom.
    const sortedItems = [...items].sort((a, b) => {
        const yA = a.transform[5];
        const yB = b.transform[5];
        if (Math.abs(yA - yB) > 4) {
            return yB - yA; // Descending Y (Top of page first)
        }
        return a.transform[4] - b.transform[4]; // Ascending X
    });

    let currentBlock: any = null;
    
    // Helper to finalize a block
    const finalizeBlock = (blk: any) => {
        if (!blk) return;
        // Convert collected data to TextBlock
        blocks.push({
            text: blk.text,
            x: blk.minX / 72,
            y: (viewport.height - blk.maxY) / 72, 
            width: (blk.maxX - blk.minX) / 72,
            height: blk.fontSize / 72 * 1.2, // Approximate line height
            fontSize: blk.fontSize,
            fontName: blk.fontName,
            isBold: blk.isBold,
            isItalic: blk.isItalic,
            color: '000000',
            align: 'left'
        });
    };

    for (const item of sortedItems) {
        if (!item.str || item.str.trim().length === 0) continue;

        const tx = item.transform;
        // transform: [scaleX, skewY, skewX, scaleY, x, y]
        const x = tx[4];
        const y = tx[5]; 
        // Font size approx from transformation matrix (handles scaling)
        const fontSize = Math.sqrt(tx[0] * tx[0] + tx[1] * tx[1]);
        
        const fontName = item.fontName || 'Arial';
        const isBold = fontName.toLowerCase().includes('bold');
        const isItalic = fontName.toLowerCase().includes('italic');
        
        const itemWidth = item.width || (fontSize * 0.5 * item.str.length); // Fallback width

        // Decision: Should we append to current block?
        // Criteria: 
        // 1. Same Line (Y is very close)
        // 2. Proximity (X is close to projected end of previous item)
        // 3. Same Style (Font, Size)
        
        let shouldAppend = false;
        let spacing = "";

        if (currentBlock) {
             const yDiff = Math.abs(currentBlock.y - y);
             const sameLine = yDiff < (fontSize * 0.5); // Tolerance based on font size
             
             if (sameLine) {
                 const xGap = x - currentBlock.maxX;
                 // If gap is small (like a space), append. 
                 // If gap is large (like a tab or table column), do NOT append -> separate text box.
                 // Threshold: 2 spaces approx.
                 const gapThreshold = fontSize * 2; 

                 if (xGap < gapThreshold && xGap > -5) { // -5 allows slight overlap
                    if (Math.abs(currentBlock.fontSize - fontSize) < 2) {
                        shouldAppend = true;
                        if (xGap > (fontSize * 0.25)) {
                            spacing = " ";
                        }
                    }
                 }
             }
        }

        if (shouldAppend && currentBlock) {
            currentBlock.text += spacing + item.str;
            currentBlock.maxX = x + itemWidth;
            // Update min/max Y to capture line variations
            currentBlock.maxY = Math.max(currentBlock.maxY, y + fontSize); // Top of line approx
        } else {
            finalizeBlock(currentBlock);
            currentBlock = {
                text: item.str,
                minX: x,
                maxX: x + itemWidth,
                y: y, // Base Y for sort comparison
                maxY: y + fontSize, // Top Y
                fontSize: fontSize,
                fontName: fontName,
                isBold: isBold,
                isItalic: isItalic
            };
        }
    }
    
    finalizeBlock(currentBlock);
    
    return blocks;
}

function addTextBlock(slide: any, block: TextBlock): void {
    // Avoid "smart" alignment detection for invoices/tables - it causes shifts.
    // Default to strict left alignment at exact coordinates for best fidelity.
    
    // Check for title-like characteristics just for bolding/sizing limits
    const isBig = block.fontSize > 20;

    // Safety checks
    const safeW = Math.max(block.width + 0.1, 0.5); // add buffer, min 0.5 inch
    const safeH = Math.max(block.height, 0.2); 
    const safeFontSize = Math.max(Math.min(block.fontSize, 100), 6);

    slide.addText(block.text, {
        x: block.x,
        y: block.y,
        w: safeW, 
        h: safeH,
        fontSize: safeFontSize,
        fontFace: mapFontName(block.fontName),
        bold: block.isBold,
        italic: block.isItalic,
        color: block.color,
        align: 'left', // Strict left for accuracy
        valign: 'top',
        autoFit: false, // Important: Don't shrink text
        wrap: false     // Important: Don't wrap lines if we want strict line mapping
    });
}

function mapFontName(pdfFont: string): string {
    const fontMap: { [key: string]: string } = {
        'times': 'Times New Roman',
        'helvetica': 'Arial',
        'courier': 'Courier New',
        'arial': 'Arial',
        'calibri': 'Calibri',
        'verdana': 'Verdana'
    };
    
    const lowerFont = (pdfFont || '').toLowerCase();
    for (const [key, value] of Object.entries(fontMap)) {
        if (lowerFont.includes(key)) {
            return value;
        }
    }
    
    return 'Arial'; // Default fallback
}

async function extractImages(page: any, slide: any, operatorList: any, viewport: any): Promise<void> {
    const pdfjsLib = await getPdfJs();
    try {
        for (let i = 0; i < operatorList.fnArray.length; i++) {
            const fn = operatorList.fnArray[i];
            const args = operatorList.argsArray[i];
            
            // OPS.paintImageXObject or OPS.paintInlineImageXObject
            if (fn === (pdfjsLib as any).OPS.paintImageXObject || 
                fn === (pdfjsLib as any).OPS.paintInlineImageXObject) {
                
                const imgName = args[0];
                try {
                    const img = await page.objs.get(imgName);
                    // Sometimes images are extracted with width/height/data
                    if (img && (img.data || img.bitmap)) {
                        const imgWidth = img.width;
                        const imgHeight = img.height;
                        
                        const canvas = document.createElement('canvas');
                        canvas.width = imgWidth;
                        canvas.height = imgHeight;
                        const ctx = canvas.getContext('2d');
                        
                        if (ctx && img.data) {
                            // Raw image data extraction can be tricky depending on color space (RGB/CMYK/Gray)
                            // This simple path works for RGBA/RGB 8bit commonly found
                            const imageData = ctx.createImageData(imgWidth, imgHeight);
                            if (img.data.length === imgWidth * imgHeight * 4) {
                                imageData.data.set(img.data);
                            } else if (img.data.length === imgWidth * imgHeight * 3) {
                                // Convert RGB to RGBA
                                for (let p = 0, d = 0; p < img.data.length; p += 3, d += 4) {
                                    imageData.data[d] = img.data[p];
                                    imageData.data[d+1] = img.data[p+1];
                                    imageData.data[d+2] = img.data[p+2];
                                    imageData.data[d+3] = 255;
                                }
                            }
                            ctx.putImageData(imageData, 0, 0);
                            const dataUrl = canvas.toDataURL('image/png');
                            
                            // To place the image correctly, we need the transform state at the time of drawing.
                            // This is complex in `getOperatorList` without tracking state.
                            // Simplified strategy: For now, we skip precise image placement in Edit Mode
                            // as it requires full PDF state machine emulation.
                            // Or we basically place it if we knew where. 
                            
                            // If we truly want images + edit text, we might better off overlaying text over the page image?
                            // But for "Edit" mode, users want to edit text. 
                        }
                    }
                } catch (err) {
                    // console.warn('Failed to extract image object:', err);
                }
            }
        }
    } catch (err) {
        // console.warn('Image extraction loop failed:', err);
    }
}

export async function convertToPdf(files: File[], options: any): Promise<StrategyResult> {
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

export async function wordToPdf(files: File[], options: any): Promise<StrategyResult> {
    const file = files[0];
    const arrayBuffer = await file.arrayBuffer();

    // 1. Convert DOCX to HTML using Mammoth
    const mammoth = await import("mammoth");
    const result = await mammoth.convertToHtml({ arrayBuffer: arrayBuffer });
    const htmlContent = result.value;

    if (!htmlContent) {
        throw new Error("Could not extract content from Word document.");
    }

    // 2. Create a temporary container for the HTML
    // IMPORTANT: precise styling is needed for html2canvas to capture it correctly.
    // It must be 'visible' in the DOM, even if obscured.
    const container = document.createElement('div');
    container.innerHTML = `
        <div style="font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.5; color: #000; background: white; padding: 40px; min-height: 842px;">
            <style>
                p { margin-bottom: 10pt; }
                h1, h2, h3 { margin-top: 20pt; margin-bottom: 10pt; font-weight: bold; }
                table { border-collapse: collapse; width: 100%; border: 1px solid #ccc; margin-bottom: 15px; }
                td, th { border: 1px solid #ccc; padding: 5px; }
            </style>
            ${htmlContent}
        </div>
    `;
    container.style.width = '595pt'; // A4 width in points
    container.style.position = 'fixed'; // Fixed to ensure it renders
    container.style.top = '0';
    container.style.left = '0';
    container.style.zIndex = '-1000'; // Behind everything
    container.style.backgroundColor = 'white'; // Ensure background is white
    document.body.appendChild(container);

    try {
        // 3. Convert HTML to PDF using jsPDF
        const { jsPDF } = await import("jspdf");
        const doc = new jsPDF({
            format: 'a4',
            unit: 'pt',
            orientation: 'portrait'
        });

        // Use a longer timeout or await proper rendering
        await new Promise<void>((resolve, reject) => {
            doc.html(container, {
                callback: (doc) => {
                    resolve();
                },
                x: 0,
                y: 0,
                autoPaging: 'text',
                width: 595, // Match container width
                windowWidth: 800, // Ensure window width is sufficient
                margin: [0, 0, 0, 0],
                html2canvas: {
                    scale: 0.75, // Adjust scale if needed (96dpi vs 72pt approx)
                    logging: false,
                    useCORS: true
                }
            });
        });

        const blob = doc.output('blob');
        return {
            blob,
            fileName: file.name.replace(/\.[^/.]+$/, "") + ".pdf",
            extension: 'pdf'
        };

    } catch (e) {
        console.error("Word to PDF generation failed:", e);
        throw e;
    } finally {
        // Clean up
        if (document.body.contains(container)) {
            document.body.removeChild(container);
        }
    }
}

export async function pdfToWord(file: File, options: any): Promise<StrategyResult> {
    throw new Error('PDF to Word requires server-side processing.');
}

export async function ocrPdf(files: File[], options: any): Promise<StrategyResult> {
    throw new Error('OCR requires server-side processing.');
}

export async function pdfToPdfa(file: File, options: any): Promise<StrategyResult> {
    throw new Error('PDF to PDF/A conversion is not supported purely client-side yet.');
}
