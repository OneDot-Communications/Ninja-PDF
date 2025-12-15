
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePDFLoader } from '@/app/hooks/usePDFLoader';
import PDFUploader from './PDFUploader';
import PDFCanvas from './PDFCanvas';
import { fabric } from 'fabric';
import { PDFDocument } from 'pdf-lib';

// Tool icons
const TextIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
);

const DownloadIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);

const ZoomInIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
    </svg>
);

const ZoomOutIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
    </svg>
);

const UploadIcon = () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
);

// Formatting icons
const BoldIcon = () => <span className="font-bold text-sm">B</span>;
const ItalicIcon = () => <span className="italic text-sm">I</span>;
const UnderlineIcon = () => <span className="underline text-sm">U</span>;
const StrikethroughIcon = () => <span className="line-through text-sm">S</span>;

const AlignLeftIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h14" />
    </svg>
);

const AlignCenterIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M7 12h10M5 18h14" />
    </svg>
);

const AlignRightIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M10 12h10M6 18h14" />
    </svg>
);

interface TextProperties {
    x: number;
    y: number;
    width: number;
    height: number;
    angle: number;
    fontSize: number;
    fontFamily: string;
    fill: string;
    fontWeight: string;
    fontStyle: "" | "normal" | "italic" | "oblique";
    underline: boolean;
    linethrough: boolean;
    textAlign: string;
    lineHeight: number;
    charSpacing: number;
}

const defaultTextProps: TextProperties = {
    x: 0, y: 0, width: 100, height: 20, angle: 0,
    fontSize: 16, fontFamily: 'Arial', fill: '#000000',
    fontWeight: 'normal', fontStyle: 'normal',
    underline: false, linethrough: false,
    textAlign: 'left', lineHeight: 1.2, charSpacing: 0
};

const FONTS = ['Arial', 'Times New Roman', 'Helvetica', 'Georgia', 'Verdana', 'Courier New'];
const COLORS = ['#000000', '#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6B7280'];

export default function PDFEditor() {
    const { loadFile, textItems, pageDimensions, backgroundImageUrl, originalFile, isDigitallySigned, isLoading, error } = usePDFLoader();
    const [zoom, setZoom] = useState(100);
    const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(null);
    const [textProps, setTextProps] = useState<TextProperties>(defaultTextProps);
    const [fabricCanvas, setFabricCanvas] = useState<fabric.Canvas | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [showSignatureWarning, setShowSignatureWarning] = useState(true);

    // Undo/Redo history stacks
    const historyRef = useRef<string[]>([]);
    const historyIndexRef = useRef(-1);
    const isUndoRedoRef = useRef(false);
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);

    // Use ref to avoid stale closure in event handlers
    const saveStateRef = useRef<() => void>(() => { });

    // Save current canvas state to history
    const saveState = useCallback(() => {
        if (!fabricCanvas || isUndoRedoRef.current) return;

        const json = JSON.stringify(fabricCanvas.toJSON());

        // Don't save if it's the same as the last state
        if (historyRef.current.length > 0 && json === historyRef.current[historyIndexRef.current]) {
            return;
        }

        // Remove any states after current index (discard redo history on new action)
        historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
        historyRef.current.push(json);
        historyIndexRef.current = historyRef.current.length - 1;

        // Limit history to 50 states
        if (historyRef.current.length > 50) {
            historyRef.current.shift();
            historyIndexRef.current--;
        }

        setCanUndo(historyIndexRef.current > 0);
        setCanRedo(false);
        console.log(`History saved: ${historyRef.current.length} states, index: ${historyIndexRef.current}`);
    }, [fabricCanvas]);

    // Keep ref updated
    useEffect(() => {
        saveStateRef.current = saveState;
    }, [saveState]);

    // Save initial state when canvas and text items are ready
    useEffect(() => {
        if (fabricCanvas && textItems.length > 0 && historyRef.current.length === 0) {
            // Wait for canvas to fully load text items
            setTimeout(() => {
                const json = JSON.stringify(fabricCanvas.toJSON());
                historyRef.current = [json];
                historyIndexRef.current = 0;
                setCanUndo(false);
                setCanRedo(false);
                console.log('Initial state saved');
            }, 500);
        }
    }, [fabricCanvas, textItems]);

    // Undo function
    const handleUndo = useCallback(() => {
        if (!fabricCanvas || historyIndexRef.current <= 0) return;

        isUndoRedoRef.current = true;
        historyIndexRef.current--;

        fabricCanvas.loadFromJSON(historyRef.current[historyIndexRef.current], () => {
            fabricCanvas.renderAll();
            isUndoRedoRef.current = false;
            setCanUndo(historyIndexRef.current > 0);
            setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
        });
    }, [fabricCanvas]);

    // Redo function
    const handleRedo = useCallback(() => {
        if (!fabricCanvas || historyIndexRef.current >= historyRef.current.length - 1) return;

        isUndoRedoRef.current = true;
        historyIndexRef.current++;

        fabricCanvas.loadFromJSON(historyRef.current[historyIndexRef.current], () => {
            fabricCanvas.renderAll();
            isUndoRedoRef.current = false;
            setCanUndo(historyIndexRef.current > 0);
            setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
        });
    }, [fabricCanvas]);

    // Keyboard shortcuts for undo/redo
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const modifier = isMac ? e.metaKey : e.ctrlKey;

            if (modifier && e.key === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    handleRedo();
                } else {
                    handleUndo();
                }
            }
            // Also support Ctrl+Y for redo on Windows
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

    // Quick Export - Frontend only (uses pdf-lib, image-based)
    const handleQuickExport = async () => {
        if (!fabricCanvas || !pageDimensions) return;

        setIsExporting(true);
        setShowExportMenu(false);

        try {
            // Get canvas as PNG data URL (high quality)
            const imageDataUrl = fabricCanvas.toDataURL({
                format: 'png',
                quality: 1,
                multiplier: 4, // 4x resolution for better quality
            });

            // Create new PDF document
            const pdfDoc = await PDFDocument.create();
            const page = pdfDoc.addPage([pageDimensions.width, pageDimensions.height]);

            // Convert data URL to bytes
            const base64Data = imageDataUrl.split(',')[1];
            const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

            // Embed PNG image
            const pngImage = await pdfDoc.embedPng(imageBytes);

            // Draw the image on the page (full page)
            page.drawImage(pngImage, {
                x: 0,
                y: 0,
                width: pageDimensions.width,
                height: pageDimensions.height,
            });

            // Save and download
            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'edited-document.pdf';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
        } catch (err) {
            console.error('Export failed:', err);
            alert('Failed to export PDF. Please try again.');
        } finally {
            setIsExporting(false);
        }
    };

    // High Quality Export - via Go backend
    const handleBackendExport = async () => {
        if (!fabricCanvas || !pageDimensions || !originalFile) {
            alert('Please upload a PDF first');
            return;
        }

        setIsExporting(true);
        setShowExportMenu(false);

        try {
            // Collect only ACTUALLY modified text edits from the canvas
            const textEdits: Array<{
                id: string;
                page: number;
                x: number;
                y: number;
                width: number;
                height: number;
                originalText: string;
                newText: string;
                fontSize: number;
                fontFamily: string;
                scale: number;
            }> = [];

            const canvasObjects = fabricCanvas.getObjects();

            canvasObjects.forEach((obj, index) => {
                if (obj.type === 'textbox' || obj.type === 'text') {
                    const textObj = obj as fabric.Textbox & {
                        originalText?: string;
                        originalLeft?: number;
                        originalTop?: number;
                    };
                    const currentText = textObj.text || '';
                    const originalText = textObj.originalText || '';

                    // Only include if text content was actually modified
                    // If there's no originalText, it's a newly added text (double-click to add)
                    const isModified = currentText !== originalText;
                    const isNewText = textObj.originalText === undefined;

                    if (isModified || isNewText) {
                        textEdits.push({
                            id: `edit-${index}`,
                            page: 1, // Currently single page
                            x: textObj.originalLeft || textObj.left || 0,
                            y: textObj.originalTop || textObj.top || 0,
                            width: (textObj.width || 100) * (textObj.scaleX || 1),
                            height: (textObj.height || 20) * (textObj.scaleY || 1),
                            originalText: originalText,
                            newText: currentText,
                            fontSize: textObj.fontSize || 16,
                            fontFamily: textObj.fontFamily || 'Helvetica',
                            scale: pageDimensions.scale,
                        });
                    }
                }
            });

            console.log(`Sending ${textEdits.length} text edits to backend`);
            console.log('Text edits:', textEdits);

            // Create form data for backend
            const formData = new FormData();
            formData.append('file', originalFile);
            formData.append('textEdits', JSON.stringify(textEdits));

            // Send to Go backend
            const response = await fetch('http://localhost:8080/api/pdf/apply-edits', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`Backend error: ${response.statusText}`);
            }

            // Download the response as PDF
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = originalFile.name.replace('.pdf', '-edited.pdf');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
        } catch (err) {
            console.error('Export failed:', err);
            alert('Failed to export PDF. Make sure the backend server is running on localhost:8080');
        } finally {
            setIsExporting(false);
        }
    };

    // Handle canvas reference from PDFCanvas
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

        canvas.on('object:modified', (e) => {
            if (e.target) {
                updateTextPropsFromObject(e.target);
            }
            // Save state after any modification (move, resize, rotate, etc.)
            saveStateRef.current();
        });

        canvas.on('object:scaling', (e) => {
            if (e.target) {
                updateTextPropsFromObject(e.target);
            }
        });

        canvas.on('object:moving', (e) => {
            if (e.target) {
                updateTextPropsFromObject(e.target);
            }
        });

        canvas.on('object:rotating', (e) => {
            if (e.target) {
                updateTextPropsFromObject(e.target);
            }
        });

        // Save state when new objects are added (e.g., new text on double-click)
        canvas.on('object:added', () => {
            // Delay to avoid saving during initial load
            setTimeout(() => {
                if (!isUndoRedoRef.current && historyRef.current.length > 0) {
                    saveStateRef.current();
                }
            }, 100);
        });
    }, []); // Empty deps - event handlers use refs

    const updateTextPropsFromObject = (obj: fabric.Object) => {
        if (obj.type === 'textbox' || obj.type === 'text') {
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

    const updateSelectedText = (updates: Partial<TextProperties>) => {
        if (!selectedObject || !fabricCanvas) return;

        const textObj = selectedObject as fabric.Textbox;

        if (updates.x !== undefined) textObj.set('left', updates.x);
        if (updates.y !== undefined) textObj.set('top', updates.y);
        if (updates.angle !== undefined) textObj.set('angle', updates.angle);
        if (updates.fontSize !== undefined) textObj.set('fontSize', updates.fontSize);
        if (updates.fontFamily !== undefined) textObj.set('fontFamily', updates.fontFamily);
        if (updates.fill !== undefined) textObj.set('fill', updates.fill);
        if (updates.fontWeight !== undefined) textObj.set('fontWeight', updates.fontWeight);
        if (updates.fontStyle !== undefined) textObj.set('fontStyle', updates.fontStyle);
        if (updates.underline !== undefined) textObj.set('underline', updates.underline);
        if (updates.linethrough !== undefined) textObj.set('linethrough', updates.linethrough);
        if (updates.textAlign !== undefined) textObj.set('textAlign', updates.textAlign);
        if (updates.lineHeight !== undefined) textObj.set('lineHeight', updates.lineHeight);
        if (updates.charSpacing !== undefined) textObj.set('charSpacing', updates.charSpacing);

        fabricCanvas.renderAll();
        setTextProps(prev => ({ ...prev, ...updates }));
    };

    const isTextSelected = selectedObject?.type === 'textbox' || selectedObject?.type === 'text';

    return (
        <div className="h-screen flex flex-col bg-white text-black overflow-hidden">
            {/* Top Header Bar */}
            <header className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                        <span className="text-sm font-bold text-white">N</span>
                    </div>
                    <h1 className="text-lg font-semibold">Ninja PDF Editor</h1>
                </div>

                <div className="flex items-center gap-2">
                    {pageDimensions && (
                        <>
                            <div className="flex items-center gap-1 bg-gray-100 rounded-lg px-2 py-1">
                                <button onClick={handleZoomOut} className="p-1 hover:bg-gray-200 rounded">
                                    <ZoomOutIcon />
                                </button>
                                <span className="text-sm w-12 text-center">{zoom}%</span>
                                <button onClick={handleZoomIn} className="p-1 hover:bg-gray-200 rounded">
                                    <ZoomInIcon />
                                </button>
                            </div>

                            {/* Undo/Redo buttons */}
                            <div className="flex items-center gap-1 border-l border-gray-200 pl-4 ml-2">
                                <button
                                    onClick={handleUndo}
                                    disabled={!canUndo}
                                    className="p-2 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                                    title="Undo (Ctrl+Z)"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                    </svg>
                                </button>
                                <button
                                    onClick={handleRedo}
                                    disabled={!canRedo}
                                    className="p-2 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                                    title="Redo (Ctrl+Shift+Z)"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
                                    </svg>
                                </button>
                            </div>

                            <div className="relative">
                                <button
                                    onClick={() => setShowExportMenu(!showExportMenu)}
                                    disabled={isExporting}
                                    className="flex items-center gap-2 px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isExporting ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <DownloadIcon />
                                    )}
                                    <span className="text-sm font-medium">{isExporting ? 'Exporting...' : 'Export'}</span>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                                {showExportMenu && (
                                    <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-50 min-w-[200px]">
                                        <button
                                            onClick={handleQuickExport}
                                            className="w-full px-4 py-3 text-left hover:bg-gray-50 flex flex-col gap-0.5"
                                        >
                                            <span className="text-sm font-medium text-black">Quick Export</span>
                                            <span className="text-xs text-gray-500">Fast, image-based PDF</span>
                                        </button>
                                        <div className="border-t border-gray-100" />
                                        <button
                                            onClick={handleBackendExport}
                                            className="w-full px-4 py-3 text-left hover:bg-gray-50 flex flex-col gap-0.5"
                                        >
                                            <span className="text-sm font-medium text-black">High Quality Export</span>
                                            <span className="text-xs text-gray-500">Vector text, selectable</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </header>

            {/* Digital Signature Warning Banner */}
            {isDigitallySigned && showSignatureWarning && (
                <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-amber-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div>
                            <p className="text-sm font-medium text-amber-800">This document is digitally signed</p>
                            <p className="text-xs text-amber-600">Editing this PDF will invalidate the digital signature. Proceed with caution.</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowSignatureWarning(false)}
                        className="text-amber-600 hover:text-amber-800 p-1"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}

            <div className="flex flex-1 overflow-hidden">
                {/* Main Canvas Area */}
                <main className="flex-1 overflow-auto bg-gray-100 relative">
                    {error && (
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 px-4 py-2 bg-red-500 text-white rounded-lg shadow-lg">
                            <p className="text-sm font-medium">Error: {error}</p>
                        </div>
                    )}

                    {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-10">
                            <div className="text-center">
                                <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                                <p className="text-gray-600">Processing PDF...</p>
                            </div>
                        </div>
                    )}

                    {!isLoading && pageDimensions && backgroundImageUrl && (
                        <div
                            className="flex items-start justify-center p-8 min-h-full"
                            style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
                        >
                            <PDFCanvas
                                textItems={textItems}
                                pageDimensions={pageDimensions}
                                backgroundImageUrl={backgroundImageUrl}
                                onCanvasReady={handleCanvasReady}
                            />
                        </div>
                    )}

                    {!isLoading && !pageDimensions && !error && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white">
                            <div className="text-center max-w-md">
                                <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-2xl flex items-center justify-center border-2 border-dashed border-gray-300">
                                    <UploadIcon />
                                </div>
                                <h2 className="text-2xl font-bold text-black mb-2">Upload a PDF to Edit</h2>
                                <p className="text-gray-500 mb-6">
                                    Add text, shapes, highlights, and annotations to your PDF documents
                                </p>
                                <PDFUploader onFileSelect={loadFile} isLoading={isLoading} />
                            </div>
                        </div>
                    )}
                </main>

                {/* Right Properties Panel */}
                {pageDimensions && (
                    <aside className="w-72 bg-white border-l border-gray-200 overflow-y-auto">
                        {/* Tabs */}
                        <div className="flex border-b border-gray-200">
                            <button className="flex-1 py-3 text-sm font-medium border-b-2 border-black">Style</button>
                            <button className="flex-1 py-3 text-sm font-medium text-gray-400 hover:text-gray-600">Layer</button>
                        </div>

                        {isTextSelected ? (
                            <div className="p-4 space-y-5">
                                {/* Position & Size */}
                                <div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-gray-500 w-4">X</span>
                                            <input
                                                type="number"
                                                value={textProps.x}
                                                onChange={(e) => updateSelectedText({ x: Number(e.target.value) })}
                                                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:border-black"
                                            />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-gray-500 w-4">Y</span>
                                            <input
                                                type="number"
                                                value={textProps.y}
                                                onChange={(e) => updateSelectedText({ y: Number(e.target.value) })}
                                                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:border-black"
                                            />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-gray-500 w-4">W</span>
                                            <input
                                                type="number"
                                                value={textProps.width}
                                                readOnly
                                                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded bg-gray-50"
                                            />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-gray-500 w-4">H</span>
                                            <input
                                                type="number"
                                                value={textProps.height}
                                                readOnly
                                                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded bg-gray-50"
                                            />
                                        </div>
                                        <div className="flex items-center gap-2 col-span-2">
                                            <span className="text-xs text-gray-500 w-4">A</span>
                                            <input
                                                type="number"
                                                value={textProps.angle}
                                                onChange={(e) => updateSelectedText({ angle: Number(e.target.value) })}
                                                className="w-20 px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:border-black"
                                            />
                                            <span className="text-xs text-gray-400">°</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="h-px bg-gray-200" />

                                {/* Font Family & Size */}
                                <div className="grid grid-cols-2 gap-2">
                                    <select
                                        value={textProps.fontFamily}
                                        onChange={(e) => updateSelectedText({ fontFamily: e.target.value })}
                                        className="px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:border-black"
                                    >
                                        {FONTS.map(font => (
                                            <option key={font} value={font}>{font}</option>
                                        ))}
                                    </select>
                                    <input
                                        type="number"
                                        value={textProps.fontSize}
                                        onChange={(e) => updateSelectedText({ fontSize: Number(e.target.value) })}
                                        className="px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:border-black"
                                    />
                                </div>

                                {/* Text Styling */}
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => updateSelectedText({ fontWeight: textProps.fontWeight === 'bold' ? 'normal' : 'bold' })}
                                        className={`flex-1 py-2 rounded border ${textProps.fontWeight === 'bold' ? 'bg-black text-white border-black' : 'border-gray-200 hover:bg-gray-50'}`}
                                    >
                                        <BoldIcon />
                                    </button>
                                    <button
                                        onClick={() => updateSelectedText({ fontStyle: textProps.fontStyle === 'italic' ? 'normal' : 'italic' })}
                                        className={`flex-1 py-2 rounded border ${textProps.fontStyle === 'italic' ? 'bg-black text-white border-black' : 'border-gray-200 hover:bg-gray-50'}`}
                                    >
                                        <ItalicIcon />
                                    </button>
                                    <button
                                        onClick={() => updateSelectedText({ underline: !textProps.underline })}
                                        className={`flex-1 py-2 rounded border ${textProps.underline ? 'bg-black text-white border-black' : 'border-gray-200 hover:bg-gray-50'}`}
                                    >
                                        <UnderlineIcon />
                                    </button>
                                    <button
                                        onClick={() => updateSelectedText({ linethrough: !textProps.linethrough })}
                                        className={`flex-1 py-2 rounded border ${textProps.linethrough ? 'bg-black text-white border-black' : 'border-gray-200 hover:bg-gray-50'}`}
                                    >
                                        <StrikethroughIcon />
                                    </button>
                                </div>

                                {/* Alignment */}
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => updateSelectedText({ textAlign: 'left' })}
                                        className={`flex-1 py-2 rounded border flex justify-center ${textProps.textAlign === 'left' ? 'bg-black text-white border-black' : 'border-gray-200 hover:bg-gray-50'}`}
                                    >
                                        <AlignLeftIcon />
                                    </button>
                                    <button
                                        onClick={() => updateSelectedText({ textAlign: 'center' })}
                                        className={`flex-1 py-2 rounded border flex justify-center ${textProps.textAlign === 'center' ? 'bg-black text-white border-black' : 'border-gray-200 hover:bg-gray-50'}`}
                                    >
                                        <AlignCenterIcon />
                                    </button>
                                    <button
                                        onClick={() => updateSelectedText({ textAlign: 'right' })}
                                        className={`flex-1 py-2 rounded border flex justify-center ${textProps.textAlign === 'right' ? 'bg-black text-white border-black' : 'border-gray-200 hover:bg-gray-50'}`}
                                    >
                                        <AlignRightIcon />
                                    </button>
                                </div>

                                <div className="h-px bg-gray-200" />

                                {/* Color */}
                                <div>
                                    <label className="block text-xs text-gray-500 mb-2">Color</label>
                                    <div className="flex gap-2 flex-wrap">
                                        {COLORS.map(color => (
                                            <button
                                                key={color}
                                                onClick={() => updateSelectedText({ fill: color })}
                                                className={`w-7 h-7 rounded-full border-2 transition-all ${textProps.fill === color ? 'border-black scale-110' : 'border-gray-200 hover:border-gray-400'}`}
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                        <input
                                            type="color"
                                            value={textProps.fill}
                                            onChange={(e) => updateSelectedText({ fill: e.target.value })}
                                            className="w-7 h-7 rounded cursor-pointer"
                                        />
                                    </div>
                                </div>

                                <div className="h-px bg-gray-200" />

                                {/* Line Height & Char Spacing */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Line Height</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            min="0.5"
                                            max="3"
                                            value={textProps.lineHeight}
                                            onChange={(e) => updateSelectedText({ lineHeight: Number(e.target.value) })}
                                            className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:border-black"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Char Spacing</label>
                                        <input
                                            type="number"
                                            step="10"
                                            min="-100"
                                            max="500"
                                            value={textProps.charSpacing}
                                            onChange={(e) => updateSelectedText({ charSpacing: Number(e.target.value) })}
                                            className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:border-black"
                                        />
                                    </div>
                                </div>

                                <div className="h-px bg-gray-200" />

                                {/* Delete button */}
                                <button
                                    onClick={() => {
                                        if (fabricCanvas && selectedObject) {
                                            fabricCanvas.remove(selectedObject);
                                            setSelectedObject(null);
                                        }
                                    }}
                                    className="w-full py-2 text-sm text-red-600 border border-red-200 rounded hover:bg-red-50 transition-colors"
                                >
                                    Delete Selected
                                </button>
                            </div>
                        ) : (
                            <div className="p-4 text-center text-gray-400">
                                <TextIcon />
                                <p className="mt-2 text-sm">Select a text element to edit its properties</p>
                            </div>
                        )}

                        {/* Document Info */}
                        <div className="p-4 border-t border-gray-200">
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Document</h3>
                            <div className="text-xs text-gray-500 space-y-1">
                                <p>Size: {pageDimensions?.width.toFixed(0)} × {pageDimensions?.height.toFixed(0)}</p>
                            </div>
                        </div>
                    </aside>
                )}
            </div>
        </div>
    );
}
