
import { PDFDocument } from '../../../external/pdf-lib.esm.js';
import { getPdfJs, StrategyResult } from '../utils';

export async function repairPdf(file: File, options: any): Promise<StrategyResult> {
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
