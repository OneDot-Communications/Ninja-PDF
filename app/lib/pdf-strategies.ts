// PDF Strategy Manager for handling various PDF operations

export interface StrategyResult {
    blob: Blob;
    fileName?: string;
    extension?: string;
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
            // Add other strategies as needed
            default:
                throw new Error(`Strategy ${strategy} not implemented`);
        }
    }
};

export async function isPdfEncrypted(file: File): Promise<boolean> {
    const pdfjsLib = await import("pdfjs-dist");

    if (typeof window !== "undefined" && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
    }

    const arrayBuffer = await file.arrayBuffer();
    try {
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        return false; // If it loads without password, not encrypted
    } catch (error: any) {
        if (error.name === 'PasswordException' || error.message.includes('password')) {
            return true;
        }
        return false;
    }
}

// Strategy implementations

async function compressPdf(file: File, options: { level: 'recommended' | 'extreme' }): Promise<StrategyResult> {
    const { PDFDocument } = await import("pdf-lib");

    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);

    // Basic compression - in a real implementation, this would optimize images, etc.
    const pdfBytes = await pdfDoc.save();

    const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
    return {
        blob,
        fileName: `compressed-${file.name}`,
        extension: 'pdf'
    };
}

async function convertFromPdf(file: File, options: { format: 'jpeg' | 'png', dpi: number, pageRange?: string, mergeOutput?: boolean }): Promise<StrategyResult> {
    const pdfjsLib = await import("pdfjs-dist");

    if (typeof window !== "undefined" && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;

    const scale = options.dpi / 72; // Assuming base DPI is 72

    const images: Blob[] = [];
    for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        if (!context) continue;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
            canvasContext: context,
            viewport: viewport,
        } as any).promise;

        const blob = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob((blob) => resolve(blob), `image/${options.format}`, 0.95);
        });

        if (blob) images.push(blob);
    }

    if (options.mergeOutput) {
        // Merge into one image - simplified, just return first
        return {
            blob: images[0] || new Blob(),
            fileName: `converted.${options.format}`,
            extension: options.format
        };
    } else {
        // Return zip or something, but for simplicity, return first
        return {
            blob: images[0] || new Blob(),
            fileName: `page1.${options.format}`,
            extension: options.format
        };
    }
}

async function unlockPdf(file: File, options: { password?: string }): Promise<StrategyResult> {
    const { PDFDocument } = await import("pdf-lib");

    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer, options.password ? { password: options.password } as any : {});

    // Remove password by saving without encryption
    const pdfBytes = await pdfDoc.save();

    const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
    return {
        blob,
        fileName: `unlocked-${file.name}`,
        extension: 'pdf'
    };
}