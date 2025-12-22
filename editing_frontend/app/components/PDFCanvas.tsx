
'use client';

import { useEffect, useRef } from 'react';
import { useFabricCanvas, addEditableText, clearCanvasObjects } from '@/app/hooks/useFabricCanvas';
import { PDFTextItem, PDFPageDimensions, PDFLineItem } from '@/app/types/pdf-editor';
import { pdfToCanvas } from '@/app/lib/coordinate-transform';
import { fabric } from 'fabric';

interface PDFCanvasProps {
    textItems: PDFTextItem[];
    lineItems?: PDFLineItem[];
    pageDimensions: PDFPageDimensions;
    backgroundImageUrl: string;
    activeTool?: 'select' | 'text' | 'draw' | 'erase' | 'comment' | 'highlight';
    onCanvasReady?: (canvas: fabric.Canvas) => void;
}

export default function PDFCanvas({
    textItems,
    lineItems = [],
    pageDimensions,
    backgroundImageUrl,
    activeTool = 'select',
    onCanvasReady,
}: PDFCanvasProps) {
    const canvas = useFabricCanvas('pdf-canvas', backgroundImageUrl);
    const initializedRef = useRef(false);

    // Notify parent when canvas is ready
    useEffect(() => {
        if (canvas && onCanvasReady) {
            onCanvasReady(canvas);
        }
    }, [canvas, onCanvasReady]);

    // Set canvas dimensions
    useEffect(() => {
        if (!canvas) return;

        canvas.setDimensions({
            width: pageDimensions.width,
            height: pageDimensions.height,
        });
    }, [canvas, pageDimensions]);

    // Add extracted text items as editable elements (ONLY ONCE per file load)
    useEffect(() => {
        // Skip if already initialized to prevent clearing user edits
        if (!canvas || textItems.length === 0 || initializedRef.current) return;

        // Mark as initialized
        initializedRef.current = true;

        console.log('[PDFCanvas] Initializing with', textItems.length, 'text items');

        // Clear existing objects
        clearCanvasObjects(canvas);

        // Convert PDF text items to canvas coordinates and add as editable text
        let addedCount = 0;
        let skippedCount = 0;
        textItems.forEach((pdfItem, index) => {
            const canvasItem = pdfToCanvas(pdfItem, pageDimensions);
            // Only add if text has reasonable size
            if (canvasItem.fontSize > 4 && canvasItem.text.trim().length > 0) {
                addEditableText(canvas, canvasItem);
                addedCount++;
            } else {
                console.log('[PDFCanvas] Skipped item', index, ':', {
                    text: pdfItem.text,
                    fontSize: canvasItem.fontSize,
                    originalFontSize: pdfItem.fontSize,
                    left: canvasItem.left,
                    top: canvasItem.top
                });
                skippedCount++;
            }
        });

        console.log('[PDFCanvas] Added', addedCount, 'items, skipped', skippedCount);
        console.log('[PDFCanvas] Canvas objects count:', canvas.getObjects().length);

        // Log sample objects for comparison
        const objects = canvas.getObjects();
        if (objects.length > 0) {
            console.log('[PDFCanvas] Sample object 0:', {
                text: (objects[0] as any).text,
                left: objects[0].left,
                top: objects[0].top,
                width: objects[0].width,
                height: objects[0].height,
                visible: objects[0].visible,
                opacity: objects[0].opacity
            });
        }

        // Render existing lines if any
        if (lineItems && lineItems.length > 0) {
            // Implementation for rendering line items would go here
        }

        canvas.renderAll();

        // Force additional re-renders to ensure all objects are displayed correctly
        setTimeout(() => {
            canvas.requestRenderAll();
            console.log('[PDFCanvas] Delayed render executed');
        }, 100);

        setTimeout(() => {
            // Recalculate object coordinates and re-render
            canvas.getObjects().forEach(obj => {
                obj.setCoords();
            });
            canvas.requestRenderAll();
            console.log('[PDFCanvas] Second delayed render with setCoords');
        }, 300);

    }, [canvas, textItems, pageDimensions]);

    // Handle Active Tool (Drawing Mode)
    useEffect(() => {
        if (!canvas) return;

        canvas.isDrawingMode = activeTool === 'draw';

        if (activeTool === 'draw') {
            canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
            canvas.freeDrawingBrush.width = 3;
            canvas.freeDrawingBrush.color = 'black';
            canvas.selection = false;
        } else if (activeTool === 'erase') {
            canvas.selection = false;
            canvas.defaultCursor = 'not-allowed';
            canvas.hoverCursor = 'not-allowed';
            // Scoped eraser handler
            const eraserHandler = (e: fabric.IEvent) => {
                if (e.target) {
                    canvas.remove(e.target);
                    canvas.renderAll();
                }
            };
            canvas.on('mouse:down', eraserHandler);
            // Cleanup: remove ONLY this specific handler
            return () => {
                canvas.off('mouse:down', eraserHandler);
            };
        } else {
            canvas.selection = true;
            canvas.defaultCursor = 'default';
            canvas.hoverCursor = 'move';
            // DO NOT call canvas.off('mouse:down') here - it breaks other listeners!
        }

    }, [canvas, activeTool]);

    // Allow adding new text on double-click on empty area
    useEffect(() => {
        if (!canvas) return;

        const handleDoubleClick = (e: fabric.IEvent) => {
            // Only add new text if clicking on empty area
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
        <div className="relative rounded-lg overflow-hidden shadow-xl border border-gray-200 bg-white">
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
