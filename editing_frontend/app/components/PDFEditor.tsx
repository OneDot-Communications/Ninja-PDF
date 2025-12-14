
'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePDFLoader } from '@/app/hooks/usePDFLoader';
import PDFUploader from './PDFUploader';
import PDFCanvas from './PDFCanvas';
import { fabric } from 'fabric';

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
    const { loadFile, textItems, pageDimensions, backgroundImageUrl, isLoading, error } = usePDFLoader();
    const [zoom, setZoom] = useState(100);
    const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(null);
    const [textProps, setTextProps] = useState<TextProperties>(defaultTextProps);
    const [fabricCanvas, setFabricCanvas] = useState<fabric.Canvas | null>(null);

    const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 200));
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50));

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
    }, []);

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
                            <button className="flex items-center gap-2 px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg transition-colors">
                                <DownloadIcon />
                                <span className="text-sm font-medium">Export</span>
                            </button>
                        </>
                    )}
                </div>
            </header>

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
