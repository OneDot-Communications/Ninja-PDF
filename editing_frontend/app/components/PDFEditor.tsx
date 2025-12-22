'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePDFLoader } from '@/app/hooks/usePDFLoader';
import PDFUploader from './PDFUploader';
import PDFCanvas from './PDFCanvas';
import { fabric } from 'fabric';
import { TextProperties, defaultTextProps } from '@/app/types/pdf-editor';

// Icons
const CloseIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const AddTextIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
);

const AddImageIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

const OrganizeIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
);

const CombineIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
    </svg>
);

const CropIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

const NumberIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
    </svg>
);

const PageIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
);

const ViewGridIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
);

const RotateIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
);

const SelectCursorIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
    </svg>
);

const PencilIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
);

const CommentIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
);

const HighlightIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
);

const DeleteIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

export default function PDFEditor() {
    const { loadFile, textItems, lineItems, pageDimensions, backgroundImageUrl, originalFile, isDigitallySigned, isLoading, error } = usePDFLoader();
    const [zoom, setZoom] = useState(100);
    const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(null);
    const [textProps, setTextProps] = useState<TextProperties>(defaultTextProps);
    const [fabricCanvas, setFabricCanvas] = useState<fabric.Canvas | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [showSignatureWarning, setShowSignatureWarning] = useState(true);
    const [activeTool, setActiveTool] = useState<'select' | 'text' | 'draw' | 'erase' | 'comment' | 'highlight'>('select');
    const [backendUrl] = useState(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080');

    // Undo/Redo history
    const historyRef = useRef<string[]>([]);
    const historyIndexRef = useRef(-1);
    const isUndoRedoRef = useRef(false);
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);

    // Drawing state
    const [isDrawing, setIsDrawing] = useState(false);
    const [drawingPath, setDrawingPath] = useState<fabric.Path | null>(null);

    // Text selection state for highlight and comment tools
    const [isSelectingText, setIsSelectingText] = useState(false);
    const [textSelection, setTextSelection] = useState<{ start: { x: number, y: number }, end: { x: number, y: number } } | null>(null);
    const [showCommentDialog, setShowCommentDialog] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [commentPosition, setCommentPosition] = useState<{ x: number, y: number } | null>(null);

    // Save state ref
    const saveStateRef = useRef<() => void>(() => { });

    // Save current canvas state to history (objects only)
    const saveState = useCallback(() => {
        if (!fabricCanvas || isUndoRedoRef.current) return;

        const objects = fabricCanvas.getObjects();
        const objectsJson = JSON.stringify(objects.map(obj => obj.toJSON()));

        // Fix bounds checking
        if (historyRef.current.length > 0 &&
            historyIndexRef.current >= 0 &&
            historyIndexRef.current < historyRef.current.length &&
            objectsJson === historyRef.current[historyIndexRef.current]) {
            return;
        }

        historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
        historyRef.current.push(objectsJson);
        historyIndexRef.current = historyRef.current.length - 1;

        if (historyRef.current.length > 50) {
            historyRef.current.shift();
            historyIndexRef.current--;
        }

        setCanUndo(historyIndexRef.current > 0);
        setCanRedo(false);
    }, [fabricCanvas]);

    useEffect(() => {
        saveStateRef.current = saveState;
    }, [saveState]);

    // Save initial state
    useEffect(() => {
        if (fabricCanvas && textItems.length > 0 && historyRef.current.length === 0) {
            setTimeout(() => {
                const objects = fabricCanvas.getObjects();
                const objectsJson = JSON.stringify(objects.map(obj => obj.toJSON()));
                historyRef.current = [objectsJson];
                historyIndexRef.current = 0;
                setCanUndo(false);
                setCanRedo(false);
            }, 500);
        }
    }, [fabricCanvas, textItems]);

    const restoreObjects = useCallback((stateIndex: number) => {
        if (!fabricCanvas) return;

        const objectsJson = historyRef.current[stateIndex];
        const objectsData = JSON.parse(objectsJson) as object[];

        const currentObjects = fabricCanvas.getObjects();
        currentObjects.forEach(obj => fabricCanvas.remove(obj));

        // Fix enlivenObjects call - use correct signature
        fabric.util.enlivenObjects(objectsData, (objects: fabric.Object[]) => {
            objects.forEach(obj => fabricCanvas.add(obj));
            fabricCanvas.renderAll();
            isUndoRedoRef.current = false;
            setCanUndo(historyIndexRef.current > 0);
            setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
        }, 'fabric');
    }, [fabricCanvas]);

    const handleUndo = useCallback(() => {
        if (!fabricCanvas || historyIndexRef.current <= 0) return;
        isUndoRedoRef.current = true;
        historyIndexRef.current--;
        restoreObjects(historyIndexRef.current);
    }, [fabricCanvas, restoreObjects]);

    const handleRedo = useCallback(() => {
        if (!fabricCanvas || historyIndexRef.current >= historyRef.current.length - 1) return;
        isUndoRedoRef.current = true;
        historyIndexRef.current++;
        restoreObjects(historyIndexRef.current);
    }, [fabricCanvas, restoreObjects]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const modifier = isMac ? e.metaKey : e.ctrlKey;

            if (modifier && e.key === 'z') {
                e.preventDefault();
                if (e.shiftKey) handleRedo(); else handleUndo();
            }
            if (!isMac && e.ctrlKey && e.key === 'y') {
                e.preventDefault();
                handleRedo();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleUndo, handleRedo]);

    const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 200));
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50));

    // Export logic (Quick/Frontend)
    const handleQuickExport = async () => {
        if (!fabricCanvas || !pageDimensions) return;
        setIsExporting(true);
        setShowExportMenu(false);
        try {
            // Reduced multiplier to prevent memory issues
            const imageDataUrl = fabricCanvas.toDataURL({ format: 'png', quality: 1, multiplier: 2 });
            const { PDFDocument } = await import('pdf-lib');
            const pdfDoc = await PDFDocument.create();
            const page = pdfDoc.addPage([pageDimensions.width, pageDimensions.height]);
            const pngImage = await pdfDoc.embedPng(imageDataUrl);
            page.drawImage(pngImage, { x: 0, y: 0, width: pageDimensions.width, height: pageDimensions.height });
            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'edited_document.pdf';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Export failed:', err);
            alert('Failed to export PDF.');
        } finally {
            setIsExporting(false);
        }
    };

    // Export logic (Backend/High Quality)
    const handleBackendExport = async () => {
        if (!fabricCanvas || !pageDimensions) return;
        setIsExporting(true);
        setShowExportMenu(false);
        try {
            const originalTextRef = new Map<string, { x: number, y: number, text: string }>();
            textItems.forEach(item => {
                const key = `${Math.round(item.x)},${Math.round(item.y)}`;
                originalTextRef.set(key, { x: item.x, y: item.y, text: item.text });
            });

            const textModifications: {
                originalText?: string;
                newText: string;
                x: number;
                y: number;
                width: number;
                height: number;
                fontSize: number;
                fontFamily: string;
                isNew: boolean;
            }[] = [];

            const objects = fabricCanvas.getObjects();
            objects.forEach((obj: any) => {
                if (obj.type === 'textbox' || obj.type === 'text' || obj.type === 'i-text') {
                    const textObj = obj as fabric.Textbox;
                    const pdfY = pageDimensions.height - (textObj.top || 0) - (textObj.height || 0) * (textObj.scaleY || 1);
                    const pdfX = (textObj.left || 0);

                    if (obj.originalText) {
                        if (obj.originalText !== textObj.text) {
                            textModifications.push({
                                originalText: obj.originalText,
                                newText: textObj.text || '',
                                x: (obj.originalLeft || 0) / pageDimensions.scale,
                                y: (pageDimensions.height - (obj.originalTop || 0) - obj.height!) / pageDimensions.scale,
                                width: (textObj.width || 0) / pageDimensions.scale,
                                height: (textObj.height || 0) / pageDimensions.scale,
                                fontSize: (textObj.fontSize || 12) / pageDimensions.scale,
                                fontFamily: textObj.fontFamily || 'Arial',
                                isNew: false
                            });
                        }
                    } else {
                        textModifications.push({
                            newText: textObj.text || '',
                            x: pdfX / pageDimensions.scale,
                            y: pdfY / pageDimensions.scale,
                            width: (textObj.width || 0) / pageDimensions.scale,
                            height: (textObj.height || 0) / pageDimensions.scale,
                            fontSize: (textObj.fontSize || 12) / pageDimensions.scale,
                            fontFamily: textObj.fontFamily || 'Arial',
                            isNew: true
                        });
                    }
                }
            });

            if (textModifications.length === 0) {
                alert('No changes detected to export.');
                return;
            }

            const formData = new FormData();
            if (originalFile) formData.append('pdf', originalFile);
            formData.append('edits', JSON.stringify({
                pageIndex: 0,
                textModifications
            }));

            // Use configurable backend URL
            const response = await fetch(`${backendUrl}/api/pdf/apply-edits`, { method: 'POST', body: formData });
            if (!response.ok) throw new Error('Backend processing failed');
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'edited_document_hq.pdf';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Export failed:', err);
            alert('Failed to export. Backend server running?');
        } finally {
            setIsExporting(false);
        }
    };

    const handleCanvasReady = useCallback((canvas: fabric.Canvas) => {
        setFabricCanvas(canvas);

        canvas.on('selection:created', (e) => {
            if (e.selected && e.selected[0]) {
                setSelectedObject(e.selected[0]);
                updateTextPropsFromObject(e.selected[0]);
            }
        });
        canvas.on('selection:updated', (e) => {
            if (e.selected && e.selected[0]) {
                setSelectedObject(e.selected[0]);
                updateTextPropsFromObject(e.selected[0]);
            }
        });
        canvas.on('selection:cleared', () => {
            setSelectedObject(null);
            setTextProps(defaultTextProps);
        });
        canvas.on('object:modified', () => saveStateRef.current());

        // Fix object:added event listener to avoid potential memory leaks
        const handleObjectAdded = () => {
            if (!isUndoRedoRef.current && historyRef.current.length > 0) {
                saveStateRef.current();
            }
        };
        canvas.on('object:added', handleObjectAdded);
    }, []);

    const updateTextPropsFromObject = (obj: fabric.Object) => {
        if (obj.type === 'textbox' || obj.type === 'text' || obj.type === 'i-text') {
            const textObj = obj as fabric.Textbox;
            setTextProps({
                x: Math.round(obj.left || 0),
                y: Math.round(obj.top || 0),
                width: Math.round((obj.width || 100) * (obj.scaleX || 1)),
                height: Math.round((obj.height || 20) * (obj.scaleY || 1)),
                angle: Math.round(obj.angle || 0),
                fontSize: textObj.fontSize || 16,
                fontFamily: textObj.fontFamily || 'Arial',
                fill: (textObj.fill as string) || '#000000',
                fontWeight: textObj.fontWeight as string || 'normal',
                fontStyle: textObj.fontStyle || 'normal',
                underline: textObj.underline || false,
                linethrough: textObj.linethrough || false,
                textAlign: textObj.textAlign || 'left',
                lineHeight: textObj.lineHeight || 1.2,
                charSpacing: textObj.charSpacing || 0,
            });
        }
    };

    // Update selected text object with new properties
    const updateSelectedText = (props: Partial<TextProperties>) => {
        if (!fabricCanvas || !selectedObject) return;
        if (selectedObject.type !== 'textbox' && selectedObject.type !== 'text') return;

        const textObj = selectedObject as fabric.Textbox;

        // Apply properties to the fabric object
        if (props.fontSize !== undefined) textObj.set('fontSize', props.fontSize);
        if (props.fontFamily !== undefined) textObj.set('fontFamily', props.fontFamily);
        if (props.fill !== undefined) textObj.set('fill', props.fill);
        if (props.fontWeight !== undefined) textObj.set('fontWeight', props.fontWeight);
        if (props.fontStyle !== undefined) textObj.set('fontStyle', props.fontStyle);
        if (props.underline !== undefined) textObj.set('underline', props.underline);
        if (props.linethrough !== undefined) textObj.set('linethrough', props.linethrough);
        if (props.textAlign !== undefined) textObj.set('textAlign', props.textAlign);
        if (props.lineHeight !== undefined) textObj.set('lineHeight', props.lineHeight);
        if (props.charSpacing !== undefined) textObj.set('charSpacing', props.charSpacing);

        fabricCanvas.renderAll();

        // Update local state
        setTextProps(prev => ({ ...prev, ...props }));

        // Save state for undo/redo
        saveStateRef.current();
    };

    const addTextAt = (x: number, y: number) => {
        if (!fabricCanvas) return;
        const text = new fabric.Textbox('New Text', {
            left: x, top: y, fontSize: 16, fontFamily: 'Arial', fill: '#000000', editable: true
        });
        fabricCanvas.add(text);
        fabricCanvas.setActiveObject(text);
        fabricCanvas.renderAll();
        saveStateRef.current();
        setActiveTool('select');
    };

    const addCommentAt = (x: number, y: number) => {
        if (!fabricCanvas) return;

        // Create a comment marker (circle with icon appearance)
        const commentMarker = new fabric.Circle({
            radius: 12,
            fill: '#fbbf24',
            stroke: '#d97706',
            strokeWidth: 2,
            left: x,
            top: y,
            originX: 'center',
            originY: 'center',
            selectable: true,
            hasControls: false,
        });

        // Create comment text box
        const commentText = new fabric.Textbox('Add comment...', {
            left: x + 20,
            top: y - 10,
            width: 150,
            fontSize: 12,
            fontFamily: 'Arial',
            fill: '#1f2937',
            backgroundColor: '#fef3c7',
            padding: 8,
            editable: true,
        });

        fabricCanvas.add(commentMarker);
        fabricCanvas.add(commentText);
        fabricCanvas.setActiveObject(commentText);
        fabricCanvas.renderAll();
        saveStateRef.current();
        setActiveTool('select');
    };

    const addHighlightAt = (x: number, y: number) => {
        if (!fabricCanvas) return;

        const highlight = new fabric.Rect({
            left: x,
            top: y,
            width: 150,
            height: 20,
            fill: 'rgba(251, 191, 36, 0.4)',
            stroke: 'transparent',
            strokeWidth: 0,
            selectable: true,
            rx: 2,
            ry: 2,
        });

        fabricCanvas.add(highlight);
        fabricCanvas.sendToBack(highlight);
        fabricCanvas.setActiveObject(highlight);
        fabricCanvas.renderAll();
        saveStateRef.current();
        setActiveTool('select');
    };

    // Improved highlight function that highlights actual text intersected by selection
    const highlightSelectedText = () => {
        if (!fabricCanvas || !textSelection) return;

        // Calculate selection bounds
        const startX = Math.min(textSelection.start.x, textSelection.end.x);
        const startY = Math.min(textSelection.start.y, textSelection.end.y);
        const endX = Math.max(textSelection.start.x, textSelection.end.x);
        const endY = Math.max(textSelection.start.y, textSelection.end.y);

        // Create selection rect for intersection checking
        // We add some buffer (e.g. 5px) to make selection easier
        const selectionRect = {
            left: startX,
            top: startY,
            width: endX - startX,
            height: endY - startY
        };

        // Find text objects within the selection range
        const objects = fabricCanvas.getObjects();
        const textObjects = objects.filter(obj => obj.type === 'text' || obj.type === 'textbox');

        if (textObjects.length === 0) return;

        // Create a highlight group that covers the selected text
        const highlights: fabric.Object[] = [];

        textObjects.forEach(textObj => {
            const obj = textObj as fabric.Textbox;
            if (!obj.text) return;

            // Get the bounding box of the text
            const boundingRect = obj.getBoundingRect();

            // Check for intersection
            const isIntersecting = !(
                selectionRect.left > boundingRect.left + boundingRect.width ||
                selectionRect.left + selectionRect.width < boundingRect.left ||
                selectionRect.top > boundingRect.top + boundingRect.height ||
                selectionRect.top + selectionRect.height < boundingRect.top
            );

            if (isIntersecting) {
                // Create a highlight rectangle with transparency
                const highlight = new fabric.Rect({
                    left: boundingRect.left,
                    top: boundingRect.top,
                    width: boundingRect.width,
                    height: boundingRect.height,
                    fill: 'rgba(251, 191, 36, 0.3)', // Yellow highlight with transparency
                    stroke: 'transparent',
                    strokeWidth: 0,
                    selectable: false,
                    evented: false,
                    objectCaching: false,
                });

                highlights.push(highlight);
            }
        });

        // Group all highlights together
        if (highlights.length > 0) {
            const highlightGroup = new fabric.Group(highlights, {
                selectable: false,
                evented: false,
            });

            fabricCanvas.add(highlightGroup);
            fabricCanvas.sendToBack(highlightGroup);
            fabricCanvas.renderAll();
            saveStateRef.current();
        }

        // Reset selection
        setTextSelection(null);
        setActiveTool('select');
    };

    // Improved comment function that attaches to selected text
    const addCommentToSelectedText = () => {
        if (!fabricCanvas || !textSelection || !commentPosition) return;

        // Create a comment marker
        const commentMarker = new fabric.Circle({
            radius: 8,
            fill: '#3b82f6',
            stroke: '#1d4ed8',
            strokeWidth: 1,
            left: commentPosition.x,
            top: commentPosition.y,
            originX: 'center',
            originY: 'center',
            selectable: true,
            hasControls: false,
        });

        // Create a comment icon inside the circle
        const commentIcon = new fabric.Text('i', {
            left: commentPosition.x,
            top: commentPosition.y,
            fontSize: 10,
            fill: 'white',
            fontFamily: 'Arial',
            originX: 'center',
            originY: 'center',
            selectable: false,
            evented: false,
        });

        // Group the marker and icon
        const commentGroup = new fabric.Group([commentMarker, commentIcon], {
            left: commentPosition.x,
            top: commentPosition.y,
            originX: 'center',
            originY: 'center',
            selectable: true,
            hasControls: false,
        });

        // Create a comment text box
        const commentTextBox = new fabric.Textbox(commentText || 'Add comment...', {
            left: commentPosition.x + 20,
            top: commentPosition.y - 10,
            width: 200,
            fontSize: 12,
            fontFamily: 'Arial',
            fill: '#1f2937',
            backgroundColor: '#f3f4f6',
            padding: 8,
            editable: true,
            cornerColor: '#3b82f6',
            borderColor: '#3b82f6',
            cornerSize: 8,
            transparentCorners: false,
        });

        // Add a connection line between the marker and text box
        const line = new fabric.Line([
            commentPosition.x, commentPosition.y,
            commentPosition.x + 20, commentPosition.y
        ], {
            stroke: '#3b82f6',
            strokeWidth: 1,
            selectable: false,
            evented: false,
        });

        // Group all comment elements
        const fullCommentGroup = new fabric.Group([commentGroup, line, commentTextBox], {
            selectable: true,
        });

        fabricCanvas.add(fullCommentGroup);
        fabricCanvas.setActiveObject(fullCommentGroup);
        fabricCanvas.renderAll();
        saveStateRef.current();

        // Reset state
        setShowCommentDialog(false);
        setCommentText('');
        setTextSelection(null);
        setActiveTool('select');
    };

    // Add image at position
    const addImageAt = (x: number, y: number) => {
        if (!fabricCanvas) return;

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                fabric.Image.fromURL(event.target?.result as string, (img) => {
                    img.set({
                        left: x,
                        top: y,
                        scaleX: 0.5,
                        scaleY: 0.5
                    });
                    fabricCanvas.add(img);
                    fabricCanvas.setActiveObject(img);
                    fabricCanvas.renderAll();
                    saveStateRef.current();
                });
            };
            reader.readAsDataURL(file);
        };
        input.click();
    };

    // Handle delete key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Delete' || e.key === 'Backspace') {
                // Check if an input element (like a comment box) is active
                const activeElement = document.activeElement;
                const isInputElement = activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement;

                // Only delete if no input element is focused AND we have a selected object
                if (!isInputElement && selectedObject && !commentText) {
                    deleteSelected();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedObject, commentText, fabricCanvas]);

    // Canvas mouse handlers
    useEffect(() => {
        if (!fabricCanvas) return;

        // Track mouse down position for click vs drag detection
        let mouseDownPos = { x: 0, y: 0 };

        const handleMouseDown = (e: fabric.IEvent) => {
            const pointer = fabricCanvas.getPointer(e.e);
            mouseDownPos = { x: pointer.x, y: pointer.y };

            if (activeTool === 'draw') {
                setIsDrawing(true);
                // Create minimal valid path data: "M x y L x.5 y.5"
                const pathData = `M ${pointer.x} ${pointer.y} L ${pointer.x + 0.5} ${pointer.y + 0.5}`;
                const path = new fabric.Path(pathData, {
                    strokeWidth: 2,
                    fill: '',
                    stroke: 'red',
                    selectable: false,
                    evented: false // Important: drawing path shouldn't be interactive while drawing
                });
                setDrawingPath(path);
                fabricCanvas.add(path);
            } else if (activeTool === 'erase') {
                setIsDrawing(true);
            } else if (activeTool === 'highlight' || activeTool === 'comment') {
                setIsSelectingText(true);
                setTextSelection({
                    start: { x: pointer.x, y: pointer.y },
                    end: { x: pointer.x, y: pointer.y }
                });
                if (activeTool === 'comment') {
                    setCommentPosition({ x: pointer.x, y: pointer.y });
                }
            } else if (activeTool === 'text') {
                // Determine if we clicked on an existing object
                if (e.target) return;
                addTextAt(pointer.x, pointer.y);
            }
        };

        const handleMouseMove = (e: fabric.IEvent) => {
            const pointer = fabricCanvas.getPointer(e.e);

            if (isDrawing && activeTool === 'draw' && drawingPath) {
                fabricCanvas.renderAll(); // Free drawing (in simpler implementation)
            } else if (isDrawing && activeTool === 'erase') {
                const target = fabricCanvas.findTarget(e.e as MouseEvent, false);
                if (target) {
                    fabricCanvas.remove(target);
                    fabricCanvas.renderAll();
                }
            } else if (isSelectingText && textSelection) {
                setTextSelection({ ...textSelection, end: { x: pointer.x, y: pointer.y } });
            }
        };

        const handleMouseUp = (e: fabric.IEvent) => {
            if (isDrawing) {
                setIsDrawing(false);
                setDrawingPath(null);
                saveStateRef.current();
            } else if (isSelectingText) {
                setIsSelectingText(false);

                // key logic: check if it was a CLICK or a DRAG
                const pointer = fabricCanvas.getPointer(e.e);
                const dist = Math.sqrt(
                    Math.pow(pointer.x - mouseDownPos.x, 2) +
                    Math.pow(pointer.y - mouseDownPos.y, 2)
                );

                if (dist < 5) {
                    // It's a CLICK - standard placement
                    if (activeTool === 'comment') {
                        addCommentAt(pointer.x, pointer.y);
                    } else if (activeTool === 'highlight') {
                        addHighlightAt(pointer.x, pointer.y);
                    }
                } else {
                    // It's a DRAG - try text selection
                    if (activeTool === 'highlight') {
                        highlightSelectedText();
                    } else if (activeTool === 'comment') {
                        setShowCommentDialog(true);
                    }
                }
            }
        };

        fabricCanvas.on('mouse:down', handleMouseDown);
        fabricCanvas.on('mouse:move', handleMouseMove);
        fabricCanvas.on('mouse:up', handleMouseUp);

        return () => {
            fabricCanvas.off('mouse:down', handleMouseDown);
            fabricCanvas.off('mouse:move', handleMouseMove);
            fabricCanvas.off('mouse:up', handleMouseUp);
        };
    }, [fabricCanvas, activeTool, isDrawing, drawingPath, isSelectingText, textSelection, commentPosition]);

    // Object manipulation helpers
    const duplicateObject = () => {
        if (!fabricCanvas || !selectedObject) return;
        selectedObject.clone((cloned: fabric.Object) => {
            cloned.set({ left: (cloned.left || 0) + 20, top: (cloned.top || 0) + 20 });
            fabricCanvas.add(cloned);
            fabricCanvas.setActiveObject(cloned);
            fabricCanvas.renderAll();
            saveStateRef.current();
        });
    };

    const bringForward = () => {
        if (!fabricCanvas || !selectedObject) return;
        fabricCanvas.bringForward(selectedObject);
        fabricCanvas.renderAll();
        saveStateRef.current();
    };

    const sendBackward = () => {
        if (!fabricCanvas || !selectedObject) return;
        fabricCanvas.sendBackwards(selectedObject);
        fabricCanvas.renderAll();
        saveStateRef.current();
    };

    const deleteSelected = () => {
        if (!fabricCanvas || !selectedObject) return;
        fabricCanvas.remove(selectedObject);
        fabricCanvas.renderAll();
        setSelectedObject(null);
        saveStateRef.current();
    };

    // Handle delete key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Delete' || e.key === 'Backspace') {
                // Check if an input element (like a comment box) is active
                const activeElement = document.activeElement;
                const isInputElement = activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement;

                // Only delete if no input element is focused AND we have a selected object
                if (!isInputElement && selectedObject && !commentText) {
                    deleteSelected();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedObject, commentText, fabricCanvas]);

    if (isLoading) return <div className="flex h-screen items-center justify-center text-gray-900 bg-gray-50">Loading PDF...</div>;
    if (error) return <div className="flex h-screen items-center justify-center text-red-500 bg-gray-50">{error}</div>;

    if (!backgroundImageUrl) return <PDFUploader onFileSelect={loadFile} isLoading={isLoading} />;

    return (
        <div className="flex flex-row h-screen w-full bg-gray-50 text-gray-700 overflow-hidden font-sans">
            {/* Left Sidebar */}
            <div className="w-72 bg-white flex flex-col border-r border-gray-200 z-20">
                <div className="h-14 flex items-center justify-between px-4 border-b border-gray-200">
                    <h1 className="text-gray-900 font-medium text-lg">Edit</h1>
                    <button className="text-gray-500 hover:text-gray-900 transition-colors">
                        <CloseIcon />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {/* FORMAT TEXT section - shown when text is selected */}
                    {selectedObject && (selectedObject.type === 'textbox' || selectedObject.type === 'text' || selectedObject.type === 'i-text') ? (
                        <div className="px-4 py-4 space-y-4">
                            <h2 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Format Text</h2>

                            {/* Font Family Dropdown */}
                            <div className="relative">
                                <select
                                    value={textProps.fontFamily}
                                    onChange={(e) => updateSelectedText({ fontFamily: e.target.value })}
                                    className="w-full appearance-none bg-gray-100 text-gray-900 px-3 py-2.5 rounded-md text-sm cursor-pointer focus:outline-none focus:ring-1 focus:ring-gray-500"
                                >
                                    <option value="Arial">Arial</option>
                                    <option value="Times New Roman">Times New Roman</option>
                                    <option value="Helvetica">Helvetica</option>
                                    <option value="Georgia">Georgia</option>
                                    <option value="Courier New">Courier New</option>
                                    <option value="Verdana">Verdana</option>
                                </select>
                                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>

                            {/* Font Weight Dropdown */}
                            <div className="relative">
                                <select
                                    value={textProps.fontWeight}
                                    onChange={(e) => updateSelectedText({ fontWeight: e.target.value })}
                                    className="w-full appearance-none bg-gray-100 text-gray-900 px-3 py-2.5 rounded-md text-sm cursor-pointer focus:outline-none focus:ring-1 focus:ring-gray-500"
                                >
                                    <option value="normal">Regular</option>
                                    <option value="bold">Bold</option>
                                    <option value="lighter">Light</option>
                                </select>
                                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>

                            {/* Font Size, Color, List Icons Row */}
                            <div className="flex items-center gap-2">
                                <div className="relative flex-shrink-0">
                                    <input
                                        type="number"
                                        value={textProps.fontSize}
                                        onChange={(e) => updateSelectedText({ fontSize: Number(e.target.value) })}
                                        min={6}
                                        max={200}
                                        className="w-14 bg-gray-100 text-gray-900 pl-2 pr-6 py-2 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-500"
                                    />
                                    <svg className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                                <div
                                    className="w-9 h-9 rounded-md cursor-pointer border border-gray-300 flex-shrink-0"
                                    style={{ backgroundColor: textProps.fill }}
                                    onClick={() => document.getElementById('colorPicker')?.click()}
                                >
                                    <input
                                        id="colorPicker"
                                        type="color"
                                        value={textProps.fill}
                                        onChange={(e) => updateSelectedText({ fill: e.target.value })}
                                        className="opacity-0 w-full h-full cursor-pointer"
                                    />
                                </div>
                                <div className="flex gap-1 ml-auto">
                                    {/* Bullet List */}
                                    <button
                                        onClick={() => {
                                            if (!fabricCanvas || !selectedObject) return;
                                            if (selectedObject.type === 'textbox' || selectedObject.type === 'text' || selectedObject.type === 'i-text') {
                                                const textObj = selectedObject as fabric.Textbox;
                                                const currentText = textObj.text || '';
                                                const lines = currentText.split('\n');
                                                const bulletedText = lines.map(line => {
                                                    if (line.startsWith('• ')) return line.replace('• ', '');
                                                    if (line.trim()) return '• ' + line;
                                                    return line;
                                                }).join('\n');
                                                textObj.set('text', bulletedText);
                                                fabricCanvas.renderAll();
                                                saveStateRef.current();
                                            }
                                        }}
                                        className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors"
                                        title="Bullet List"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <circle cx="4" cy="6" r="1.5" fill="currentColor" />
                                            <circle cx="4" cy="12" r="1.5" fill="currentColor" />
                                            <circle cx="4" cy="18" r="1.5" fill="currentColor" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 6h12M9 12h12M9 18h12" />
                                        </svg>
                                    </button>
                                    {/* Numbered List */}
                                    <button
                                        onClick={() => {
                                            if (!fabricCanvas || !selectedObject) return;
                                            if (selectedObject.type === 'textbox' || selectedObject.type === 'text' || selectedObject.type === 'i-text') {
                                                const textObj = selectedObject as fabric.Textbox;
                                                const currentText = textObj.text || '';
                                                const lines = currentText.split('\n');
                                                let num = 1;
                                                const numberedText = lines.map(line => {
                                                    // Remove existing numbers
                                                    const stripped = line.replace(/^\d+\.\s*/, '');
                                                    if (stripped.trim()) return `${num++}. ${stripped}`;
                                                    return line;
                                                }).join('\n');
                                                textObj.set('text', numberedText);
                                                fabricCanvas.renderAll();
                                                saveStateRef.current();
                                            }
                                        }}
                                        className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors"
                                        title="Numbered List"
                                    >
                                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                            <text x="2" y="8" fontSize="7" fill="currentColor" stroke="none" fontFamily="Arial">1</text>
                                            <text x="2" y="14" fontSize="7" fill="currentColor" stroke="none" fontFamily="Arial">2</text>
                                            <text x="2" y="20" fontSize="7" fill="currentColor" stroke="none" fontFamily="Arial">3</text>
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 6h12M9 12h12M9 18h12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {/* Bold, Italic, Underline */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => updateSelectedText({ fontWeight: textProps.fontWeight === 'bold' ? 'normal' : 'bold' })}
                                    className={`w-10 h-10 rounded-md flex items-center justify-center text-lg font-bold transition-colors ${textProps.fontWeight === 'bold' ? 'bg-white text-black' : 'text-gray-700 hover:bg-gray-200'}`}
                                >
                                    B
                                </button>
                                <button
                                    onClick={() => updateSelectedText({ fontStyle: textProps.fontStyle === 'italic' ? 'normal' : 'italic' })}
                                    className={`w-10 h-10 rounded-md flex items-center justify-center text-lg italic transition-colors ${textProps.fontStyle === 'italic' ? 'bg-white text-black' : 'text-gray-700 hover:bg-gray-200'}`}
                                >
                                    I
                                </button>
                                <button
                                    onClick={() => updateSelectedText({ underline: !textProps.underline })}
                                    className={`w-10 h-10 rounded-md flex items-center justify-center text-lg underline transition-colors ${textProps.underline ? 'bg-white text-black' : 'text-gray-700 hover:bg-gray-200'}`}
                                >
                                    U
                                </button>
                            </div>

                            {/* Line Height & Character Spacing */}
                            <div className="flex gap-2">
                                <div className="flex-1 relative">
                                    <div className="flex items-center gap-1 bg-gray-100 rounded-md px-2 py-1">
                                        <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                        </svg>
                                        <input
                                            type="number"
                                            value={textProps.lineHeight}
                                            onChange={(e) => updateSelectedText({ lineHeight: Number(e.target.value) })}
                                            step={0.1}
                                            min={0.5}
                                            max={5}
                                            className="w-full bg-transparent text-gray-900 text-sm focus:outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="flex-1 relative">
                                    <div className="flex items-center gap-1 bg-gray-100 rounded-md px-2 py-1">
                                        <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12M8 12h12M8 17h12" />
                                        </svg>
                                        <input
                                            type="number"
                                            value={textProps.charSpacing}
                                            onChange={(e) => updateSelectedText({ charSpacing: Number(e.target.value) })}
                                            step={10}
                                            min={-200}
                                            max={800}
                                            className="w-full bg-transparent text-gray-900 text-sm focus:outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Text Alignment */}
                            <div className="flex gap-1">
                                <button
                                    onClick={() => updateSelectedText({ textAlign: 'left' })}
                                    className={`flex-1 py-2 rounded-md flex items-center justify-center transition-colors ${textProps.textAlign === 'left' ? 'bg-white text-black' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h16" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => updateSelectedText({ textAlign: 'center' })}
                                    className={`flex-1 py-2 rounded-md flex items-center justify-center transition-colors ${textProps.textAlign === 'center' ? 'bg-white text-black' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M7 12h10M4 18h16" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => updateSelectedText({ textAlign: 'right' })}
                                    className={`flex-1 py-2 rounded-md flex items-center justify-center transition-colors ${textProps.textAlign === 'right' ? 'bg-white text-black' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M10 12h10M4 18h16" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => updateSelectedText({ textAlign: 'justify' })}
                                    className={`flex-1 py-2 rounded-md flex items-center justify-center transition-colors ${textProps.textAlign === 'justify' ? 'bg-white text-black' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                    </svg>
                                </button>
                            </div>

                            {/* Add Link */}
                            <button className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors py-1">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                </svg>
                                <span className="text-sm">Add link</span>
                            </button>

                            {/* Divider */}
                            <div className="h-px bg-gray-700"></div>

                            {/* ADJUST OBJECTS */}
                            <h2 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Adjust Objects</h2>
                            <div className="flex gap-2">
                                <button
                                    onClick={deleteSelected}
                                    className="p-2.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                                    title="Delete"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                                <button
                                    onClick={duplicateObject}
                                    className="p-2.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                                    title="Duplicate"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                </button>
                                <button
                                    onClick={bringForward}
                                    className="p-2.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                                    title="Bring Forward"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                    </svg>
                                </button>
                                <button
                                    onClick={sendBackward}
                                    className="p-2.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                                    title="Send Backward"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                            </div>

                            {/* Divider */}
                            <div className="h-px bg-gray-700"></div>

                            {/* ADD CONTENT */}
                            <h2 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Add Content</h2>
                            <div className="space-y-1">
                                <button
                                    onClick={() => setActiveTool('text')}
                                    className="w-full flex items-center gap-3 px-2 py-2 hover:bg-gray-100 rounded-md text-gray-700 transition-colors"
                                >
                                    <AddTextIcon />
                                    <span className="text-sm">Text</span>
                                </button>
                                <button
                                    onClick={() => addImageAt(100, 100)}
                                    className="w-full flex items-center gap-3 px-2 py-2 hover:bg-gray-100 rounded-md text-gray-700 transition-colors"
                                >
                                    <AddImageIcon />
                                    <span className="text-sm">Image</span>
                                </button>
                            </div>

                            {/* Divider */}
                            <div className="h-px bg-gray-700"></div>

                            {/* OTHER OPTIONS */}
                            <h2 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Other Options</h2>
                            <div className="space-y-1">
                                <button className="w-full flex items-center gap-3 px-2 py-2 hover:bg-gray-100 rounded-md text-gray-700 transition-colors">
                                    <OrganizeIcon />
                                    <span className="text-sm">Organize pages</span>
                                </button>
                                <button className="w-full flex items-center gap-3 px-2 py-2 hover:bg-gray-100 rounded-md text-gray-700 transition-colors">
                                    <CombineIcon />
                                    <span className="text-sm">Combine files</span>
                                </button>
                                <button className="w-full flex items-center gap-3 px-2 py-2 hover:bg-gray-100 rounded-md text-gray-700 transition-colors">
                                    <CropIcon />
                                    <span className="text-sm">Crop pages</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="px-4 py-4 space-y-4">
                            {/* ADD CONTENT */}
                            <h2 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Add Content</h2>
                            <div className="space-y-1">
                                <button
                                    onClick={() => setActiveTool('text')}
                                    className={`w-full flex items-center gap-3 px-2 py-2.5 rounded-md transition-colors ${activeTool === 'text' ? 'bg-gray-100 text-gray-900' : 'hover:bg-gray-100 text-gray-700'}`}
                                >
                                    <AddTextIcon />
                                    <span className="text-sm">Text</span>
                                </button>
                                <button
                                    onClick={() => addImageAt(100, 100)}
                                    className="w-full flex items-center gap-3 px-2 py-2.5 hover:bg-gray-100 rounded-md text-gray-700 transition-colors"
                                >
                                    <AddImageIcon />
                                    <span className="text-sm">Image</span>
                                </button>
                            </div>

                            {/* Divider */}
                            <div className="h-px bg-gray-700"></div>

                            {/* OTHER OPTIONS */}
                            <h2 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Other Options</h2>
                            <div className="space-y-1">
                                <button className="w-full flex items-center gap-3 px-2 py-2.5 hover:bg-gray-100 rounded-md text-gray-700 transition-colors">
                                    <OrganizeIcon />
                                    <span className="text-sm">Organize pages</span>
                                </button>
                                <button className="w-full flex items-center gap-3 px-2 py-2.5 hover:bg-gray-100 rounded-md text-gray-700 transition-colors">
                                    <CombineIcon />
                                    <span className="text-sm">Combine files</span>
                                </button>
                                <button className="w-full flex items-center gap-3 px-2 py-2.5 hover:bg-gray-100 rounded-md text-gray-700 transition-colors">
                                    <CropIcon />
                                    <span className="text-sm">Crop pages</span>
                                </button>
                                <button className="w-full flex items-center gap-3 px-2 py-2.5 hover:bg-gray-100 rounded-md text-gray-700 transition-colors">
                                    <NumberIcon />
                                    <span className="text-sm">Number pages</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-200">
                    <button
                        onClick={() => setShowExportMenu(!showExportMenu)}
                        className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-black rounded font-medium transition-colors"
                    >
                        {isExporting ? 'Exporting...' : 'Export PDF'}
                    </button>
                    {showExportMenu && (
                        <div className="absolute bottom-16 left-4 w-56 bg-gray-100 border border-gray-300 rounded-lg shadow-xl overflow-hidden z-50">
                            <button onClick={handleQuickExport} className="w-full px-4 py-3 text-left hover:bg-gray-200 text-gray-700">
                                <span className="block text-sm font-medium">Quick Export</span>
                                <span className="block text-xs text-gray-500">Fast, image-based</span>
                            </button>
                            <div className="border-t border-gray-300"></div>
                            <button onClick={handleBackendExport} className="w-full px-4 py-3 text-left hover:bg-gray-200 text-gray-700">
                                <span className="block text-sm font-medium">High Quality Export</span>
                                <span className="block text-xs text-gray-500">Vector text, selectable</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 relative bg-gray-50 flex flex-col items-center justify-center overflow-hidden">

                {/* Signature Warning */}
                {isDigitallySigned && showSignatureWarning && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-orange-600/90 backdrop-blur text-gray-900 px-6 py-3 rounded-lg shadow-lg flex items-center gap-4 max-w-lg">
                        <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div className="flex-1">
                            <p className="font-medium text-sm">Signed PDF Detected</p>
                            <p className="text-xs opacity-90">Editing will invalidate the digital signature.</p>
                        </div>
                        <button onClick={() => setShowSignatureWarning(false)} className="hover:bg-orange-700/50 p-1 rounded">
                            <CloseIcon />
                        </button>
                    </div>
                )}

                {/* Comment Dialog */}
                {showCommentDialog && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white border border-gray-300 rounded-lg shadow-xl p-4 w-96">
                        <h3 className="text-gray-900 font-medium mb-3">Add Comment</h3>
                        <textarea
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder="Enter your comment here..."
                            className="w-full h-32 bg-gray-100 text-gray-900 p-3 rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-[#1944F1]"
                        />
                        <div className="flex justify-end gap-2 mt-3">
                            <button
                                onClick={() => {
                                    setShowCommentDialog(false);
                                    setCommentText('');
                                    setTextSelection(null);
                                    setActiveTool('select');
                                }}
                                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-gray-900 rounded-md transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={addCommentToSelectedText}
                                className="px-4 py-2 bg-[#1944F1] hover:bg-[#1638CC] text-gray-900 rounded-md transition-colors"
                            >
                                Add Comment
                            </button>
                        </div>
                    </div>
                )}

                {/* Floating Toolbar */}
                <div className="absolute top-8 left-8 flex flex-col gap-2 bg-white p-1.5 rounded-lg shadow-xl border border-gray-200 z-40">
                    {/* Select */}
                    <button
                        onClick={() => setActiveTool('select')}
                        className={`p-2 rounded transition-colors ${activeTool === 'select' ? 'bg-[#1944F1] text-white' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
                        title="Select Tool"
                    >
                        <SelectCursorIcon />
                    </button>
                    {/* Comment */}
                    <button
                        onClick={() => setActiveTool('comment')}
                        className={`p-2 rounded transition-colors ${activeTool === 'comment' ? 'bg-[#1944F1] text-white' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
                        title="Add Comment"
                    >
                        <CommentIcon />
                    </button>
                    {/* Highlight */}
                    <button
                        onClick={() => setActiveTool('highlight')}
                        className={`p-2 rounded transition-colors ${activeTool === 'highlight' ? 'bg-[#1944F1] text-white' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
                        title="Highlight"
                    >
                        <HighlightIcon />
                    </button>
                    {/* Annotate/Draw */}
                    <button
                        onClick={() => setActiveTool('draw')}
                        className={`p-2 rounded transition-colors ${activeTool === 'draw' ? 'bg-[#1944F1] text-white' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
                        title="Annotate"
                    >
                        <PencilIcon />
                    </button>
                    {/* Add Text */}
                    <button
                        onClick={() => setActiveTool('text')}
                        className={`p-2 rounded transition-colors ${activeTool === 'text' ? 'bg-[#1944F1] text-white' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
                        title="Add Text"
                    >
                        <span className="font-serif font-bold text-lg leading-none">T</span>
                    </button>
                    {/* Delete Tool */}
                    <button
                        onClick={deleteSelected}
                        className="p-2 text-gray-500 hover:text-red-500 hover:bg-gray-100 rounded transition-colors"
                        title="Delete Selected"
                    >
                        <DeleteIcon />
                    </button>
                    <div className="h-px bg-gray-200 my-1 mx-2"></div>
                    <button
                        onClick={handleUndo}
                        disabled={!canUndo}
                        className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Undo (Ctrl+Z)"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                    </button>
                    <button
                        onClick={handleRedo}
                        disabled={!canRedo}
                        className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Redo"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
                        </svg>
                    </button>
                </div>

                {/* Canvas Container */}
                <div className="overflow-auto w-full h-full flex items-start justify-center p-8 custom-scrollbar">
                    {pageDimensions && backgroundImageUrl && (
                        <div
                            className="shadow-2xl"
                            style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
                        >
                            <PDFCanvas
                                textItems={textItems}
                                lineItems={lineItems}
                                pageDimensions={pageDimensions}
                                backgroundImageUrl={backgroundImageUrl}
                                activeTool={activeTool}
                                onCanvasReady={handleCanvasReady}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Right Sidebar - Tools/Nav */}
            <div className="w-16 bg-white border-l border-gray-200 flex flex-col items-center py-4 z-20">
                <div className="flex flex-col gap-4">
                    <button className="p-2 text-gray-500 hover:text-gray-900 transition-colors" title="Page Overview">
                        <PageIcon />
                    </button>
                    <button className="p-2 text-gray-500 hover:text-gray-900 transition-colors" title="Grid View">
                        <ViewGridIcon />
                    </button>
                    <div className="w-8 h-px bg-gray-200"></div>
                    <button onClick={handleZoomIn} className="p-2 text-gray-500 hover:text-gray-900 transition-colors" title="Zoom In">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                        </svg>
                    </button>
                    <button onClick={handleZoomOut} className="p-2 text-gray-500 hover:text-gray-900 transition-colors" title="Zoom Out">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                        </svg>
                    </button>
                    <div className="text-xs text-gray-500 font-medium text-center">{zoom}%</div>
                    <div className="w-8 h-px bg-gray-200"></div>
                    <button className="p-2 text-gray-500 hover:text-gray-900 transition-colors" title="Rotate">
                        <RotateIcon />
                    </button>
                </div>

                <div className="mt-auto flex flex-col gap-4">
                    <button className="p-2 text-gray-500 hover:text-gray-900 transition-colors" title="Help">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}