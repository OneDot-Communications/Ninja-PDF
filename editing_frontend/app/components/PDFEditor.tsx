
'use client';

import { useState } from 'react';
import { usePDFLoader } from '@/app/hooks/usePDFLoader';
import PDFUploader from './PDFUploader';
import PDFCanvas from './PDFCanvas';

// Tool icons as simple SVG components
const TextIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
);

const ShapeIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
    </svg>
);

const HighlightIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
);

const DrawIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
);

const EraserIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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

interface ToolButtonProps {
    icon: React.ReactNode;
    label: string;
    active?: boolean;
    onClick?: () => void;
}

function ToolButton({ icon, label, active, onClick }: ToolButtonProps) {
    return (
        <button
            onClick={onClick}
            className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200 group
                ${active
                    ? 'bg-black text-white shadow-lg'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-black'
                }`}
            title={label}
        >
            {icon}
            <span className="text-[10px] mt-1 opacity-80">{label}</span>
        </button>
    );
}

export default function PDFEditor() {
    const {
        loadFile,
        textItems,
        pageDimensions,
        backgroundImageUrl,
        isLoading,
        error,
    } = usePDFLoader();

    const [activeTool, setActiveTool] = useState('select');
    const [zoom, setZoom] = useState(100);

    const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 200));
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50));

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
                {/* Left Toolbar */}
                {pageDimensions && (
                    <aside className="w-16 bg-white border-r border-gray-200 flex flex-col items-center py-4 gap-1">
                        <ToolButton
                            icon={<TextIcon />}
                            label="Text"
                            active={activeTool === 'text'}
                            onClick={() => setActiveTool('text')}
                        />
                        <ToolButton
                            icon={<ShapeIcon />}
                            label="Shape"
                            active={activeTool === 'shape'}
                            onClick={() => setActiveTool('shape')}
                        />
                        <ToolButton
                            icon={<HighlightIcon />}
                            label="Mark"
                            active={activeTool === 'highlight'}
                            onClick={() => setActiveTool('highlight')}
                        />
                        <ToolButton
                            icon={<DrawIcon />}
                            label="Draw"
                            active={activeTool === 'draw'}
                            onClick={() => setActiveTool('draw')}
                        />
                        <div className="w-8 h-px bg-gray-200 my-2" />
                        <ToolButton
                            icon={<EraserIcon />}
                            label="Erase"
                            active={activeTool === 'eraser'}
                            onClick={() => setActiveTool('eraser')}
                        />
                    </aside>
                )}

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
                    <aside className="w-64 bg-white border-l border-gray-200 p-4 overflow-y-auto">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Properties</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Font Size</label>
                                <input
                                    type="range"
                                    min="8"
                                    max="72"
                                    defaultValue="16"
                                    className="w-full accent-black"
                                />
                            </div>

                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Color</label>
                                <div className="flex gap-2">
                                    {['#000000', '#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'].map(color => (
                                        <button
                                            key={color}
                                            className="w-6 h-6 rounded-full border-2 border-gray-200 hover:border-black transition-colors"
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Opacity</label>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    defaultValue="100"
                                    className="w-full accent-black"
                                />
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-gray-200">
                            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Document</h3>
                            <div className="text-sm text-gray-600 space-y-1">
                                <p>Width: {pageDimensions.width.toFixed(0)}px</p>
                                <p>Height: {pageDimensions.height.toFixed(0)}px</p>
                                <p>Scale: {(pageDimensions.scale * 100).toFixed(0)}%</p>
                            </div>
                        </div>
                    </aside>
                )}
            </div>
        </div>
    );
}
