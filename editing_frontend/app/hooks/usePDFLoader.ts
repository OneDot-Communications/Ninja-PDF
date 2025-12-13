
'use client';

import { useState } from 'react';
import { loadPDF, extractTextItems, renderPDFPageWithoutText } from '@/app/lib/pdf-extractor';
import { PDFTextItem, PDFPageDimensions } from '@/app/types/pdf-editor';
import { calculateScale } from '@/app/lib/coordinate-transform';

interface UsePDFLoaderReturn {
    loadFile: (file: File) => Promise<void>;
    textItems: PDFTextItem[];
    pageDimensions: PDFPageDimensions | null;
    backgroundImageUrl: string | null;
    isLoading: boolean;
    error: string | null;
}

export function usePDFLoader(): UsePDFLoaderReturn {
    const [textItems, setTextItems] = useState<PDFTextItem[]>([]);
    const [pageDimensions, setPageDimensions] = useState<PDFPageDimensions | null>(null);
    const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadFile = async (file: File) => {
        try {
            setIsLoading(true);
            setError(null);

            // Load PDF
            const pdf = await loadPDF(file);

            // Load first page only for now
            const page = await pdf.getPage(1);

            // Calculate scale
            const viewport = page.getViewport({ scale: 1 });
            const scale = calculateScale(viewport.width, viewport.height);

            // Render PDF to canvas WITHOUT text (only graphics/images)
            const tempCanvas = document.createElement('canvas');
            const dimensions = await renderPDFPageWithoutText(page, tempCanvas, scale);

            // Convert to image URL with high quality PNG
            const imageUrl = tempCanvas.toDataURL('image/png');
            setBackgroundImageUrl(imageUrl);

            // Extract text items (we'll overlay these as editable elements)
            const items = await extractTextItems(page);
            setTextItems(items);

            // Store dimensions
            setPageDimensions({
                width: dimensions.width,
                height: dimensions.height,
                scale,
            });

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load PDF');
            console.error('PDF loading error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    return {
        loadFile,
        textItems,
        pageDimensions,
        backgroundImageUrl,
        isLoading,
        error,
    };
}
