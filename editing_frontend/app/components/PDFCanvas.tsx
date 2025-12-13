
'use client';

import { useEffect } from 'react';
import { useFabricCanvas, addEditableText, clearCanvasObjects } from '@/app/hooks/useFabricCanvas';
import { PDFTextItem, PDFPageDimensions } from '@/app/types/pdf-editor';
import { pdfToCanvas } from '@/app/lib/coordinate-transform';
import { fabric } from 'fabric';

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

    // Add extracted text items as editable elements (no white background needed)
    useEffect(() => {
        if (!canvas || textItems.length === 0) return;

        // Clear existing objects
        clearCanvasObjects(canvas);

        // Convert PDF text items to canvas coordinates and add as editable text
        textItems.forEach((pdfItem) => {
            const canvasItem = pdfToCanvas(pdfItem, pageDimensions);
            // Only add if text has reasonable size
            if (canvasItem.fontSize > 4 && canvasItem.text.trim().length > 0) {
                addEditableText(canvas, canvasItem);
            }
        });

        canvas.renderAll();
    }, [canvas, textItems, pageDimensions]);

    // Allow adding new text on double-click on empty area
    useEffect(() => {
        if (!canvas) return;

        const handleDoubleClick = (e: fabric.IEvent) => {
            // Only add new text if clicking on empty area (not on existing object)
            if (e.target) return;

            const pointer = canvas.getPointer(e.e);
            const text = new fabric.Textbox('New text', {
                left: pointer.x,
                top: pointer.y,
                fontSize: 16,
                fontFamily: 'Arial',
                fill: '#000000',
                editable: true,
                selectable: true,
                hasControls: true,
                hasBorders: true,
            });
            canvas.add(text);
            canvas.setActiveObject(text);
            text.enterEditing();
            canvas.renderAll();
        };

        canvas.on('mouse:dblclick', handleDoubleClick);

        return () => {
            canvas.off('mouse:dblclick', handleDoubleClick);
        };
    }, [canvas]);

    return (
        <div className="relative rounded-lg overflow-hidden shadow-xl border border-gray-200">
            <canvas id="pdf-canvas" />

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-full text-xs flex items-center gap-3">
                <span className="flex items-center gap-1">
                    <kbd className="bg-gray-700 px-1.5 py-0.5 rounded text-[10px]">Click</kbd>
                    Select
                </span>
                <span className="w-px h-3 bg-gray-500" />
                <span className="flex items-center gap-1">
                    <kbd className="bg-gray-700 px-1.5 py-0.5 rounded text-[10px]">Dbl-click</kbd>
                    Edit
                </span>
                <span className="w-px h-3 bg-gray-500" />
                <span className="flex items-center gap-1">
                    <kbd className="bg-gray-700 px-1.5 py-0.5 rounded text-[10px]">Drag</kbd>
                    Move
                </span>
            </div>
        </div>
    );
}
