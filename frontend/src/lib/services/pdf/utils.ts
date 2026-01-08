
import { PDFDocument, degrees, StandardFonts, rgb, PDFName, PDFArray } from '../../external/pdf-lib.esm.js';

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
