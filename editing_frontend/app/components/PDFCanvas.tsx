
'use client';

import { useEffect } from 'react';
import { useFabricCanvas, addTextToCanvas, clearCanvasObjects } from '@/app/hooks/useFabricCanvas';
import { PDFTextItem, PDFPageDimensions } from '@/app/types/pdf-editor';
import { pdfToCanvas } from '@/app/lib/coordinate-transform';

interface PDFCanvasProps {
    textItems: PDFTextItem[];
    pageDimensions: PDFPageDimensions;
    backgroundImageUrl: string;
}

export default function PDFCanvas({
    textItems,
    pageDimensions,
    backgroundImageUrl,
}: PDFCanvasProps) {
    const canvas = useFabricCanvas('pdf-canvas', backgroundImageUrl);

    // Set canvas dimensions
    useEffect(() => {
        if (!canvas) return;

        canvas.setDimensions({
            width: pageDimensions.width,
            height: pageDimensions.height,
        });
    }, [canvas, pageDimensions]);

    // Add text items to canvas
    useEffect(() => {
        if (!canvas || textItems.length === 0) return;

        // Clear existing objects
        clearCanvasObjects(canvas);

        // Convert PDF text items to canvas coordinates and add to canvas
        textItems.forEach((pdfItem) => {
            const canvasItem = pdfToCanvas(pdfItem, pageDimensions);
            addTextToCanvas(canvas, canvasItem);
        });

        canvas.renderAll();
    }, [canvas, textItems, pageDimensions]);

    return (
        <div className="relative border border-gray-300 rounded-lg shadow-lg overflow-hidden">
            <canvas id="pdf-canvas" />

            <div className="absolute bottom-4 right-4 bg-black/50 text-white px-3 py-1 rounded text-xs">
                Double-click text to edit • Drag to move • Corners to resize/rotate
            </div>
        </div>
    );
}
