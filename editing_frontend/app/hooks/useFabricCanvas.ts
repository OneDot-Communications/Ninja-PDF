
'use client';

import { useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';
import { CanvasTextItem } from '@/app/types/pdf-editor';

export function useFabricCanvas(
    canvasId: string,
    backgroundImage?: string
) {
    const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
    const canvasRef = useRef<fabric.Canvas | null>(null);

    useEffect(() => {
        if (canvasRef.current || typeof window === 'undefined') return;

        const fabricCanvas = new fabric.Canvas(canvasId, {
            backgroundColor: '#ffffff',
            selection: true,
            preserveObjectStacking: true,
        });

        canvasRef.current = fabricCanvas;
        setCanvas(fabricCanvas);

        return () => {
            fabricCanvas.dispose();
            canvasRef.current = null;
        };
    }, [canvasId]);

    // Set background image (PDF render without text)
    useEffect(() => {
        if (!canvas || !backgroundImage) return;

        fabric.Image.fromURL(backgroundImage, (img) => {
            canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
                scaleX: canvas.width! / img.width!,
                scaleY: canvas.height! / img.height!,
            });
        });
    }, [canvas, backgroundImage]);

    return canvas;
}

/**
 * Add editable text (no white background needed since original text is not rendered)
 */
export function addEditableText(
    canvas: fabric.Canvas,
    textItem: CanvasTextItem
) {
    const text = new fabric.Textbox(textItem.text, {
        left: textItem.left,
        top: textItem.top,
        fontSize: textItem.fontSize,
        fontFamily: textItem.fontFamily,
        fill: '#000000',
        editable: true,
        selectable: true,
        hasControls: true,
        hasBorders: true,
        lockScalingFlip: true,
        splitByGrapheme: false,
        width: textItem.width > 50 ? textItem.width : undefined,
        // Transparent background - no need to hide original
        backgroundColor: 'transparent',
    });

    canvas.add(text);
    return text;
}

export function clearCanvasObjects(canvas: fabric.Canvas) {
    const objects = canvas.getObjects();
    objects.forEach(obj => canvas.remove(obj));
    canvas.renderAll();
}
