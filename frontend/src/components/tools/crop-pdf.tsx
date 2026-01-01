"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { saveAs } from "file-saver";
import FileUploadHero from "../ui/file-upload-hero";
import {
    Crop,
    CheckSquare,
    Square,
    ChevronLeft,
    ChevronRight,
    RotateCw,
    ZoomIn,
    ZoomOut,
    Maximize,
    Grid3x3,
    Settings,
    Undo,
    Redo,
    Download,
    X,
    Move,
    Square as SquareIcon,
    RectangleHorizontal,
    Monitor,
    Smartphone,
    Tablet,
    FileText,
    FolderOpen,
} from "lucide-react";
import { pdfStrategyManager, getPdfJs } from "@/lib/services/pdf-service";
import { toast } from "@/lib/hooks/use-toast";
import { cn } from "@/lib/utils";

// Crop preset interface
interface CropPreset {
    name: string;
    aspectRatio: number | null;
    icon: React.ReactNode;
}

// Crop history state
interface CropHistoryState {
    cropBox: { x: number, y: number, width: number, height: number };
    rotation: number;
}

export function CropPdfTool() {
    // File and PDF state
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [numPages, setNumPages] = useState(0);
    const [applyToAll, setApplyToAll] = useState(true);
    const [zoom, setZoom] = useState(100);

    // Crop box in percentages (0-100)
    const [cropBox, setCropBox] = useState({ x: 10, y: 10, width: 80, height: 80 });
    const [rotation, setRotation] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [dragHandle, setDragHandle] = useState<string | null>(null);

    // UI state
    const [showGrid, setShowGrid] = useState(false);
    const [snapToGrid, setSnapToGrid] = useState(false);
    const [gridSize, setGridSize] = useState(5);
    const [maintainAspectRatio, setMaintainAspectRatio] = useState(false);
    const [aspectRatio, setAspectRatio] = useState<number | null>(null);
    const [cropHistory, setCropHistory] = useState<CropHistoryState[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    // Canvas refs
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Crop presets
    const cropPresets: CropPreset[] = [
        { name: "Free", aspectRatio: null, icon: <Move className="h-4 w-4" /> },
        { name: "Square", aspectRatio: 1, icon: <SquareIcon className="h-4 w-4" /> },
        { name: "4:3", aspectRatio: 4 / 3, icon: <Monitor className="h-4 w-4" /> },
        { name: "16:9", aspectRatio: 16 / 9, icon: <RectangleHorizontal className="h-4 w-4" /> },
        { name: "9:16", aspectRatio: 9 / 16, icon: <Smartphone className="h-4 w-4" /> },
        { name: "3:4", aspectRatio: 3 / 4, icon: <Tablet className="h-4 w-4" /> },
    ];

    const handleFileSelected = async (files: File[]) => {
        if (files.length > 0) {
            setFile(files[0]);
            const pdfjsLib = await getPdfJs();
            const arrayBuffer = await files[0].arrayBuffer();
            const pdf = await (pdfjsLib as any).getDocument(new Uint8Array(arrayBuffer)).promise;
            setNumPages(pdf.numPages);
            setCurrentPage(1);
            // Reset crop box
            setCropBox({ x: 10, y: 10, width: 80, height: 80 });
            setRotation(0);
            setCropHistory([]);
            setHistoryIndex(-1);
        }
    };

    useEffect(() => {
        if (!file) return;

        const renderPage = async () => {
            const pdfjsLib = await getPdfJs();
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await (pdfjsLib as any).getDocument(new Uint8Array(arrayBuffer)).promise;

            // Apply zoom
            const scale = zoom / 100;

            const page = await pdf.getPage(currentPage);
            let rotationDeg = Math.round(rotation) || 0;
            rotationDeg = ((rotationDeg % 360) + 360) % 360;
            if (rotationDeg % 90 !== 0) {
                rotationDeg = Math.round(rotationDeg / 90) * 90;
            }
            const viewport = page.getViewport({ scale, rotation: rotationDeg });

            const canvas = canvasRef.current;
            if (!canvas) return;

            const context = canvas.getContext("2d")!;
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({
                canvasContext: context,
                viewport: viewport,
                canvas: canvas,
            }).promise;
        };

        renderPage();
    }, [file, zoom, rotation, currentPage]);

    // Save current crop state to history
    const saveToHistory = useCallback(() => {
        const newState = {
            cropBox: { ...cropBox },
            rotation
        };

        const newHistory = cropHistory.slice(0, historyIndex + 1);
        newHistory.push(newState);

        if (newHistory.length > 20) {
            newHistory.shift();
        }

        setCropHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    }, [cropBox, rotation, cropHistory, historyIndex]);

    // Undo
    const undo = useCallback(() => {
        if (historyIndex > 0) {
            const prevState = cropHistory[historyIndex - 1];
            setCropBox(prevState.cropBox);
            setRotation(prevState.rotation);
            setHistoryIndex(historyIndex - 1);
        }
    }, [historyIndex, cropHistory]);

    // Redo
    const redo = useCallback(() => {
        if (historyIndex < cropHistory.length - 1) {
            const nextState = cropHistory[historyIndex + 1];
            setCropBox(nextState.cropBox);
            setRotation(nextState.rotation);
            setHistoryIndex(historyIndex + 1);
        }
    }, [historyIndex, cropHistory]);

    // Apply crop preset
    const applyPreset = (preset: CropPreset) => {
        saveToHistory();

        if (preset.aspectRatio === null) {
            setMaintainAspectRatio(false);
            setAspectRatio(null);
        } else {
            setMaintainAspectRatio(true);
            setAspectRatio(preset.aspectRatio);

            const canvas = canvasRef.current;
            if (!canvas) return;

            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            const canvasAspectRatio = canvasWidth / canvasHeight;

            let newWidth, newHeight;

            if (preset.aspectRatio > canvasAspectRatio) {
                newWidth = cropBox.width;
                newHeight = newWidth / preset.aspectRatio;
            } else {
                newHeight = cropBox.height;
                newWidth = newHeight * preset.aspectRatio;
            }

            const newX = cropBox.x + (cropBox.width - newWidth) / 2;
            const newY = cropBox.y + (cropBox.height - newHeight) / 2;

            setCropBox({
                x: Math.max(0, Math.min(100 - newWidth, newX)),
                y: Math.max(0, Math.min(100 - newHeight, newY)),
                width: newWidth,
                height: newHeight
            });
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        let x = ((e.clientX - rect.left) / rect.width) * 100;
        let y = ((e.clientY - rect.top) / rect.height) * 100;

        if (snapToGrid) {
            x = Math.round(x / gridSize) * gridSize;
            y = Math.round(y / gridSize) * gridSize;
        }

        const relativeX = (x - cropBox.x) / cropBox.width;
        const relativeY = (y - cropBox.y) / cropBox.height;

        let detectedHandle: string = 'move';
        const edgeThreshold = 0.25;

        if (relativeX < edgeThreshold && relativeY < edgeThreshold) {
            detectedHandle = 'nw';
        } else if (relativeX > 1 - edgeThreshold && relativeY < edgeThreshold) {
            detectedHandle = 'ne';
        } else if (relativeX < edgeThreshold && relativeY > 1 - edgeThreshold) {
            detectedHandle = 'sw';
        } else if (relativeX > 1 - edgeThreshold && relativeY > 1 - edgeThreshold) {
            detectedHandle = 'se';
        } else if (relativeX < edgeThreshold) {
            detectedHandle = 'w';
        } else if (relativeX > 1 - edgeThreshold) {
            detectedHandle = 'e';
        } else if (relativeY < edgeThreshold) {
            detectedHandle = 'n';
        } else if (relativeY > 1 - edgeThreshold) {
            detectedHandle = 's';
        }

        setIsDragging(true);
        setDragHandle(detectedHandle);
    };

    useEffect(() => {
        const handleGlobalMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;

            const canvas = canvasRef.current;
            if (!canvas) return;

            const rect = canvas.getBoundingClientRect();
            let x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
            let y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

            if (snapToGrid) {
                x = Math.round(x / gridSize) * gridSize;
                y = Math.round(y / gridSize) * gridSize;
            }

            setCropBox(prev => {
                let newBox = { ...prev };

                if (dragHandle === 'move') {
                    const deltaX = x - (prev.x + prev.width / 2);
                    const deltaY = y - (prev.y + prev.height / 2);
                    newBox.x = Math.max(0, Math.min(100 - prev.width, prev.x + deltaX));
                    newBox.y = Math.max(0, Math.min(100 - prev.height, prev.y + deltaY));
                } else if (dragHandle === 'nw') {
                    let newWidth = prev.x + prev.width - x;
                    let newHeight = prev.y + prev.height - y;

                    if (maintainAspectRatio && aspectRatio) {
                        const aspectHeight = newWidth / aspectRatio;
                        if (aspectHeight <= newHeight) {
                            newHeight = aspectHeight;
                        } else {
                            newWidth = newHeight * aspectRatio;
                        }
                    }

                    if (newWidth >= 5 && newHeight >= 5) {
                        newBox.width = newWidth;
                        newBox.height = newHeight;
                        newBox.x = prev.x + prev.width - newWidth;
                        newBox.y = prev.y + prev.height - newHeight;
                    }
                } else if (dragHandle === 'ne') {
                    let newWidth = x - prev.x;
                    let newHeight = prev.y + prev.height - y;

                    if (maintainAspectRatio && aspectRatio) {
                        const aspectHeight = newWidth / aspectRatio;
                        if (aspectHeight <= newHeight) {
                            newHeight = aspectHeight;
                        } else {
                            newWidth = newHeight * aspectRatio;
                        }
                    }

                    if (newWidth >= 5 && newHeight >= 5) {
                        newBox.width = newWidth;
                        newBox.height = newHeight;
                        newBox.y = prev.y + prev.height - newHeight;
                    }
                } else if (dragHandle === 'sw') {
                    let newWidth = prev.x + prev.width - x;
                    let newHeight = y - prev.y;

                    if (maintainAspectRatio && aspectRatio) {
                        const aspectHeight = newWidth / aspectRatio;
                        if (aspectHeight <= newHeight) {
                            newHeight = aspectHeight;
                        } else {
                            newWidth = newHeight * aspectRatio;
                        }
                    }

                    if (newWidth >= 5 && newHeight >= 5) {
                        newBox.width = newWidth;
                        newBox.height = newHeight;
                        newBox.x = prev.x + prev.width - newWidth;
                    }
                } else if (dragHandle === 'se') {
                    let newWidth = x - prev.x;
                    let newHeight = y - prev.y;

                    if (maintainAspectRatio && aspectRatio) {
                        const aspectHeight = newWidth / aspectRatio;
                        if (aspectHeight <= newHeight) {
                            newHeight = aspectHeight;
                        } else {
                            newWidth = newHeight * aspectRatio;
                        }
                    }

                    if (newWidth >= 5 && newHeight >= 5) {
                        newBox.width = newWidth;
                        newBox.height = newHeight;
                    }
                } else if (dragHandle === 'n') {
                    const newHeight = prev.y + prev.height - y;
                    if (newHeight >= 5) {
                        newBox.height = newHeight;
                        newBox.y = y;
                    }
                } else if (dragHandle === 's') {
                    const newHeight = y - prev.y;
                    if (newHeight >= 5) {
                        newBox.height = newHeight;
                    }
                } else if (dragHandle === 'w') {
                    const newWidth = prev.x + prev.width - x;
                    if (newWidth >= 5) {
                        newBox.width = newWidth;
                        newBox.x = x;
                    }
                } else if (dragHandle === 'e') {
                    const newWidth = x - prev.x;
                    if (newWidth >= 5) {
                        newBox.width = newWidth;
                    }
                }

                newBox.width = Math.max(5, Math.min(100 - newBox.x, newBox.width));
                newBox.height = Math.max(5, Math.min(100 - newBox.y, newBox.height));

                return newBox;
            });
        };

        const handleGlobalMouseUp = () => {
            if (isDragging) {
                saveToHistory();
            }
            setIsDragging(false);
            setDragHandle(null);
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleGlobalMouseMove);
            document.addEventListener('mouseup', handleGlobalMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleGlobalMouseMove);
            document.removeEventListener('mouseup', handleGlobalMouseUp);
        };
    }, [isDragging, dragHandle, snapToGrid, gridSize, maintainAspectRatio, aspectRatio, saveToHistory]);

    const cropPdf = async () => {
        if (!file) return;
        setIsProcessing(true);

        try {
            const result = await pdfStrategyManager.execute('crop', [file], {
                cropBox,
                rotation,
                applyToAll,
                pageIndex: currentPage
            });

            saveAs(result.blob, result.fileName || `cropped-${file.name}`);

            toast.show({
                title: "Success",
                message: "PDF cropped successfully!",
                variant: "success",
                position: "top-right",
            });

            // Clear file after successful crop
            setFile(null);
        } catch (error: any) {
            console.error("Error cropping PDF:", error);

            let errorMessage = "Failed to crop PDF. Please try again.";
            if (error.message?.includes('corrupted') || error.message?.includes('Invalid PDF structure')) {
                errorMessage = "The PDF file appears to be corrupted. Try using the Repair PDF tool first.";
            } else if (error.message?.includes('encrypted') || error.message?.includes('password')) {
                errorMessage = "The PDF is encrypted. Please use the Unlock PDF tool first.";
            }

            toast.show({
                title: "Operation Failed",
                message: errorMessage,
                variant: "error",
                position: "top-right",
            });
        } finally {
            setIsProcessing(false);
        }
    };

    // If no file, show file upload
    if (!file) {
        return (
            <div className="min-h-[calc(100vh-120px)] flex items-center justify-center">
                <FileUploadHero
                    title="Crop PDF"
                    onFilesSelected={handleFileSelected}
                    maxFiles={1}
                    accept={{ "application/pdf": [".pdf"] }}
                />
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => {
                        if (e.target.files) {
                            handleFileSelected(Array.from(e.target.files));
                        }
                    }}
                />
            </div>
        );
    }

    return (
        <div className="bg-[#f6f7f8] min-h-screen pb-8">
            <div className="max-w-[1800px] mx-auto px-4 py-4">
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Left Column - PDF Preview */}
                    <div className="flex-1 lg:max-w-[calc(100%-448px)]">
                        {/* Preview Card */}
                        <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
                            {/* Preview Header */}
                            <div className="bg-[#f9fafb] border-b border-[#e2e8f0] p-4">
                                <div className="flex items-center justify-between flex-wrap gap-4">
                                    {/* Page Navigation */}
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                            disabled={currentPage === 1}
                                            className="p-2 rounded-lg bg-white border border-[#e2e8f0] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <ChevronLeft className="h-4 w-4 text-[#617289]" />
                                        </button>
                                        <span className="text-sm font-bold text-[#111418] min-w-[80px] text-center">
                                            Page {currentPage} / {numPages}
                                        </span>
                                        <button
                                            onClick={() => setCurrentPage(Math.min(numPages, currentPage + 1))}
                                            disabled={currentPage === numPages}
                                            className="p-2 rounded-lg bg-white border border-[#e2e8f0] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <ChevronRight className="h-4 w-4 text-[#617289]" />
                                        </button>
                                    </div>

                                    {/* Zoom Controls */}
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setZoom(Math.max(25, zoom - 25))}
                                            className="p-2 rounded-lg bg-white border border-[#e2e8f0] hover:bg-gray-50 transition-colors"
                                        >
                                            <ZoomOut className="h-4 w-4 text-[#617289]" />
                                        </button>
                                        <span className="text-sm font-bold text-[#111418] min-w-[60px] text-center">{zoom}%</span>
                                        <button
                                            onClick={() => setZoom(Math.min(200, zoom + 25))}
                                            className="p-2 rounded-lg bg-white border border-[#e2e8f0] hover:bg-gray-50 transition-colors"
                                        >
                                            <ZoomIn className="h-4 w-4 text-[#617289]" />
                                        </button>
                                        <button
                                            onClick={() => setZoom(100)}
                                            className="p-2 rounded-lg bg-white border border-[#e2e8f0] hover:bg-gray-50 transition-colors"
                                            title="Fit to Page"
                                        >
                                            <Maximize className="h-4 w-4 text-[#617289]" />
                                        </button>
                                    </div>

                                    {/* Rotation Controls */}
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => {
                                                saveToHistory();
                                                setRotation((prev) => ((prev - 90 + 360) % 360));
                                            }}
                                            className="p-2 rounded-lg bg-white border border-[#e2e8f0] hover:bg-gray-50 transition-colors"
                                            title="Rotate Left"
                                        >
                                            <RotateCw className="h-4 w-4 text-[#617289] rotate-180" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                saveToHistory();
                                                setRotation((prev) => ((prev + 90) % 360));
                                            }}
                                            className="p-2 rounded-lg bg-white border border-[#e2e8f0] hover:bg-gray-50 transition-colors"
                                            title="Rotate Right"
                                        >
                                            <RotateCw className="h-4 w-4 text-[#617289]" />
                                        </button>
                                    </div>

                                    {/* History Controls */}
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={undo}
                                            disabled={historyIndex <= 0}
                                            className="p-2 rounded-lg bg-white border border-[#e2e8f0] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            title="Undo"
                                        >
                                            <Undo className="h-4 w-4 text-[#617289]" />
                                        </button>
                                        <button
                                            onClick={redo}
                                            disabled={historyIndex >= cropHistory.length - 1}
                                            className="p-2 rounded-lg bg-white border border-[#e2e8f0] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            title="Redo"
                                        >
                                            <Redo className="h-4 w-4 text-[#617289]" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Canvas Area */}
                            <div className="relative bg-[#f1f5f9] min-h-[600px] flex items-center justify-center p-8 overflow-auto">
                                <div className="relative" style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center' }}>
                                    <canvas
                                        ref={canvasRef}
                                        className="max-w-none block bg-white shadow-2xl"
                                    />

                                    {/* Grid Overlay */}
                                    {showGrid && (
                                        <div className="absolute inset-0 pointer-events-none">
                                            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                                                <defs>
                                                    <pattern id="grid" width={`${gridSize}%`} height={`${gridSize}%`} patternUnits="userSpaceOnUse">
                                                        <path d={`M ${gridSize}% 0 L 0 0 0 ${gridSize}%`} fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth="0.5" />
                                                    </pattern>
                                                </defs>
                                                <rect width="100%" height="100%" fill="url(#grid)" />
                                            </svg>
                                        </div>
                                    )}

                                    {/* Crop Overlay */}
                                    <div className="absolute inset-0 pointer-events-none">
                                        {/* Top overlay */}
                                        <div
                                            className="absolute bg-black/50"
                                            style={{
                                                left: 0,
                                                top: 0,
                                                width: '100%',
                                                height: `${cropBox.y}%`
                                            }}
                                        />
                                        {/* Bottom overlay */}
                                        <div
                                            className="absolute bg-black/50"
                                            style={{
                                                left: 0,
                                                top: `${cropBox.y + cropBox.height}%`,
                                                width: '100%',
                                                height: `${100 - cropBox.y - cropBox.height}%`
                                            }}
                                        />
                                        {/* Left overlay */}
                                        <div
                                            className="absolute bg-black/50"
                                            style={{
                                                left: 0,
                                                top: `${cropBox.y}%`,
                                                width: `${cropBox.x}%`,
                                                height: `${cropBox.height}%`
                                            }}
                                        />
                                        {/* Right overlay */}
                                        <div
                                            className="absolute bg-black/50"
                                            style={{
                                                left: `${cropBox.x + cropBox.width}%`,
                                                top: `${cropBox.y}%`,
                                                width: `${100 - cropBox.x - cropBox.width}%`,
                                                height: `${cropBox.height}%`
                                            }}
                                        />

                                        {/* Crop box border */}
                                        <div
                                            className="absolute border-2 border-[#4383BF] cursor-move pointer-events-auto"
                                            style={{
                                                left: `${cropBox.x}%`,
                                                top: `${cropBox.y}%`,
                                                width: `${cropBox.width}%`,
                                                height: `${cropBox.height}%`,
                                            }}
                                            onMouseDown={handleMouseDown}
                                        />

                                        {/* Corner handles */}
                                        <div
                                            className="absolute w-3 h-3 bg-white border-2 border-[#4383BF] rounded-full pointer-events-auto cursor-nw-resize"
                                            style={{
                                                left: `${cropBox.x}%`,
                                                top: `${cropBox.y}%`,
                                                transform: 'translate(-50%, -50%)'
                                            }}
                                            onMouseDown={handleMouseDown}
                                        />
                                        <div
                                            className="absolute w-3 h-3 bg-white border-2 border-[#4383BF] rounded-full pointer-events-auto cursor-ne-resize"
                                            style={{
                                                left: `${cropBox.x + cropBox.width}%`,
                                                top: `${cropBox.y}%`,
                                                transform: 'translate(-50%, -50%)'
                                            }}
                                            onMouseDown={handleMouseDown}
                                        />
                                        <div
                                            className="absolute w-3 h-3 bg-white border-2 border-[#4383BF] rounded-full pointer-events-auto cursor-sw-resize"
                                            style={{
                                                left: `${cropBox.x}%`,
                                                top: `${cropBox.y + cropBox.height}%`,
                                                transform: 'translate(-50%, -50%)'
                                            }}
                                            onMouseDown={handleMouseDown}
                                        />
                                        <div
                                            className="absolute w-3 h-3 bg-white border-2 border-[#4383BF] rounded-full pointer-events-auto cursor-se-resize"
                                            style={{
                                                left: `${cropBox.x + cropBox.width}%`,
                                                top: `${cropBox.y + cropBox.height}%`,
                                                transform: 'translate(-50%, -50%)'
                                            }}
                                            onMouseDown={handleMouseDown}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Sidebar - Configuration */}
                    <div className="lg:w-[424px]">
                        <div className="bg-white rounded-3xl border border-[#e2e8f0] p-6 shadow-xl lg:sticky lg:top-24 max-h-[calc(100vh-120px)] overflow-y-auto">
                            {/* File Summary */}
                            <div className="mb-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <FolderOpen className="h-6 w-6 text-[#4383BF]" />
                                    <h2 className="text-[#111418] font-bold text-lg leading-7">Crop Settings</h2>
                                </div>

                                {/* File Info Card */}
                                <div className="bg-[#f9fafb] rounded-lg border border-[#f3f4f6] p-3 mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-[#dbeafe] rounded w-10 h-10 flex items-center justify-center flex-shrink-0">
                                            <FileText className="h-6 w-6 text-[#4383BF]" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-[#111418] text-sm font-bold leading-5 truncate">
                                                {file.name}
                                            </div>
                                            <div className="text-[#6b7280] text-xs leading-4">
                                                {numPages} page{numPages > 1 ? 's' : ''}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Crop Info */}
                                <div className="border-t border-[#f3f4f6] pt-4 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[#6b7280] text-sm">Position</span>
                                        <span className="text-[#111418] text-sm font-bold">
                                            {Math.round(cropBox.x)}%, {Math.round(cropBox.y)}%
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[#6b7280] text-sm">Size</span>
                                        <span className="text-[#111418] text-sm font-bold">
                                            {Math.round(cropBox.width)}% × {Math.round(cropBox.height)}%
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[#6b7280] text-sm">Rotation</span>
                                        <span className="text-[#111418] text-sm font-bold">{rotation}°</span>
                                    </div>
                                </div>
                            </div>

                            {/* Aspect Ratio Presets */}
                            <div className="mb-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <Settings className="h-5 w-5 text-[#9ca3af]" />
                                    <h3 className="text-[#111418] font-bold text-base">Aspect Ratio</h3>
                                </div>

                                <div className="grid grid-cols-3 gap-2">
                                    {cropPresets.map((preset) => (
                                        <button
                                            key={preset.name}
                                            onClick={() => applyPreset(preset)}
                                            className={cn(
                                                "flex flex-col items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all",
                                                maintainAspectRatio && aspectRatio === preset.aspectRatio
                                                    ? "border-[#4383BF] bg-[#eff6ff] text-[#4383BF]"
                                                    : "border-[#e2e8f0] bg-white text-[#617289] hover:border-[#4383BF]/30"
                                            )}
                                        >
                                            {preset.icon}
                                            <span className="text-xs font-bold">{preset.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Options */}
                            <div className="mb-6">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-3 bg-[#f9fafb] rounded-lg">
                                        <label className="text-sm font-medium text-[#111418]">Apply to all pages</label>
                                        <button
                                            onClick={() => setApplyToAll(!applyToAll)}
                                            className={cn(
                                                "p-1 rounded transition-colors",
                                                applyToAll ? "text-[#4383BF]" : "text-[#9ca3af]"
                                            )}
                                        >
                                            {applyToAll ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between p-3 bg-[#f9fafb] rounded-lg">
                                        <label className="text-sm font-medium text-[#111418]">Show grid</label>
                                        <button
                                            onClick={() => setShowGrid(!showGrid)}
                                            className={cn(
                                                "p-1 rounded transition-colors",
                                                showGrid ? "text-[#4383BF]" : "text-[#9ca3af]"
                                            )}
                                        >
                                            {showGrid ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between p-3 bg-[#f9fafb] rounded-lg">
                                        <label className="text-sm font-medium text-[#111418]">Snap to grid</label>
                                        <button
                                            onClick={() => setSnapToGrid(!snapToGrid)}
                                            disabled={!showGrid}
                                            className={cn(
                                                "p-1 rounded transition-colors",
                                                snapToGrid ? "text-[#4383BF]" : "text-[#9ca3af]",
                                                !showGrid && "opacity-50 cursor-not-allowed"
                                            )}
                                        >
                                            {snapToGrid ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
                                        </button>
                                    </div>

                                    {showGrid && (
                                        <div className="p-3 bg-[#f9fafb] rounded-lg">
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="text-sm font-medium text-[#111418]">Grid size</label>
                                                <span className="text-sm text-[#6b7280] font-bold">{gridSize}%</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="2"
                                                max="20"
                                                value={gridSize}
                                                onChange={(e) => setGridSize(Number(e.target.value))}
                                                className="w-full h-2 bg-[#e5e7eb] rounded-full appearance-none cursor-pointer"
                                                style={{
                                                    background: `linear-gradient(to right, #4383BF 0%, #4383BF ${(gridSize - 2) / 18 * 100}%, #e5e7eb ${(gridSize - 2) / 18 * 100}%, #e5e7eb 100%)`
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Crop Button */}
                            <button
                                onClick={cropPdf}
                                disabled={isProcessing}
                                className="w-full bg-[#4383BF] hover:bg-[#3470A0] text-white rounded-xl h-[60px] flex items-center justify-center gap-3 font-bold text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                <Crop className="h-6 w-6" />
                                <span>
                                    {isProcessing ? "Processing..." : "CROP & DOWNLOAD"}
                                </span>
                            </button>

                            {/* Footer Text */}
                            <p className="text-[#617289] text-xs leading-relaxed text-center mt-4 italic">
                                &quot;Trimming the fat off your PDF, one pixel at a time.&quot;
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => {
                    if (e.target.files) {
                        handleFileSelected(Array.from(e.target.files));
                    }
                }}
            />
        </div >
    );
}