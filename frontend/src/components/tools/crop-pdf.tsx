"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { saveAs } from "file-saver";
import { FileUpload } from "../ui/file-upload";
import { Button } from "../ui/button";
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
    Sliders,
    HelpCircle,
    Sun,
    Moon,
    Layers,
    History,
    Scan,
    Command,
    FileText,
    Crop as CropIcon
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
    const [showToolbar, setShowToolbar] = useState(true);
    const [showProperties, setShowProperties] = useState(true);
    const [darkMode, setDarkMode] = useState(false);
    const [viewMode, setViewMode] = useState<"desktop" | "tablet" | "mobile">("desktop");
    const [showGrid, setShowGrid] = useState(false);
    const [snapToGrid, setSnapToGrid] = useState(false);
    const [gridSize, setGridSize] = useState(5);
    const [maintainAspectRatio, setMaintainAspectRatio] = useState(false);
    const [aspectRatio, setAspectRatio] = useState<number | null>(null);
    const [cropHistory, setCropHistory] = useState<CropHistoryState[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    
    // Canvas refs
    const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Crop presets
    const cropPresets: CropPreset[] = [
        { name: "Free", aspectRatio: null, icon: <Move className="h-4 w-4" /> },
        { name: "Square", aspectRatio: 1, icon: <SquareIcon className="h-4 w-4" /> },
        { name: "4:3", aspectRatio: 4/3, icon: <Monitor className="h-4 w-4" /> },
        { name: "16:9", aspectRatio: 16/9, icon: <RectangleHorizontal className="h-4 w-4" /> },
        { name: "9:16", aspectRatio: 9/16, icon: <Smartphone className="h-4 w-4" /> },
        { name: "3:4", aspectRatio: 3/4, icon: <Tablet className="h-4 w-4" /> },
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

        const renderAllPages = async () => {
            const pdfjsLib = await getPdfJs();
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await (pdfjsLib as any).getDocument(new Uint8Array(arrayBuffer)).promise;
            
            // Apply zoom
            const scale = zoom / 100;
            
            // Render each page
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                // PDF.js expects rotation in degrees (0, 90, 180, 270). Ensure we pass a normalized integer degree.
                let rotationDeg = Math.round(rotation) || 0;
                // Normalize to 0..359
                rotationDeg = ((rotationDeg % 360) + 360) % 360;
                // If rotation is not multiple of 90, snap to nearest 90 degree for rendering
                if (rotationDeg % 90 !== 0) {
                    rotationDeg = Math.round(rotationDeg / 90) * 90;
                }
                const viewport = page.getViewport({ scale, rotation: rotationDeg });
                
                // Get or create canvas
                let canvas = canvasRefs.current[i - 1];
                
                if (!canvas) continue;
                
                const context = canvas.getContext("2d")!;
                
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                
                await page.render({
                    canvasContext: context,
                    viewport: viewport,
                    canvas: canvas,
                }).promise;
            }
        };
        
        renderAllPages();
    }, [file, zoom, rotation]);

    // Save current crop state to history
    const saveToHistory = useCallback(() => {
        const newState = {
            cropBox: { ...cropBox },
            rotation
        };
        
        // Remove any states after the current index
        const newHistory = cropHistory.slice(0, historyIndex + 1);
        newHistory.push(newState);
        
        // Limit history to 20 states
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
            
            // Adjust crop box to match aspect ratio
            const canvas = canvasRefs.current[currentPage - 1];
            if (!canvas) return;
            
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            const canvasAspectRatio = canvasWidth / canvasHeight;
            
            let newWidth, newHeight;
            
            if (preset.aspectRatio > canvasAspectRatio) {
                // Wider than canvas, match width
                newWidth = cropBox.width;
                newHeight = newWidth / preset.aspectRatio;
            } else {
                // Taller than canvas, match height
                newHeight = cropBox.height;
                newWidth = newHeight * preset.aspectRatio;
            }
            
            // Center the crop box
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

    // Fit to page
    const fitToPage = () => {
        setZoom(100);
    };

    const handleMouseDown = (e: React.MouseEvent, pageIndex: number) => {
        e.preventDefault();
        e.stopPropagation();
        
        const canvas = canvasRefs.current[pageIndex];
        if (!canvas) return;
        
        const rect = canvas.getBoundingClientRect();
        let x = ((e.clientX - rect.left) / rect.width) * 100;
        let y = ((e.clientY - rect.top) / rect.height) * 100;
        
        // Snap to grid if enabled
        if (snapToGrid) {
            x = Math.round(x / gridSize) * gridSize;
            y = Math.round(y / gridSize) * gridSize;
        }
        
        // Calculate relative position within the crop box
        const relativeX = (x - cropBox.x) / cropBox.width;
        const relativeY = (y - cropBox.y) / cropBox.height;
        
        // Determine which handle to use based on position
        let detectedHandle: string = 'move';
        const edgeThreshold = 0.25; // 25% from edge for resize handles
        
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

            const canvas = canvasRefs.current[currentPage - 1];
            if (!canvas) return;

            const rect = canvas.getBoundingClientRect();
            let x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
            let y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
            
            // Snap to grid if enabled
            if (snapToGrid) {
                x = Math.round(x / gridSize) * gridSize;
                y = Math.round(y / gridSize) * gridSize;
            }

            setCropBox(prev => {
                let newBox = { ...prev };

                if (dragHandle === 'move') {
                    // Move the entire box
                    const deltaX = x - (prev.x + prev.width / 2);
                    const deltaY = y - (prev.y + prev.height / 2);
                    newBox.x = Math.max(0, Math.min(100 - prev.width, prev.x + deltaX));
                    newBox.y = Math.max(0, Math.min(100 - prev.height, prev.y + deltaY));
                } else if (dragHandle === 'nw') {
                    let newWidth = prev.x + prev.width - x;
                    let newHeight = prev.y + prev.height - y;
                    
                    if (maintainAspectRatio && aspectRatio) {
                        // Maintain aspect ratio
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
                        // Maintain aspect ratio
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
                        // Maintain aspect ratio
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
                        // Maintain aspect ratio
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

                // Ensure minimum size and bounds
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
    }, [isDragging, dragHandle, snapToGrid, gridSize, maintainAspectRatio, aspectRatio, currentPage, saveToHistory]);

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
            <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] bg-linear-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
                <div className="max-w-md w-full p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl">
                    <div className="flex items-center justify-center mb-6">
                        <div className="p-4 bg-blue-100 dark:bg-blue-900 rounded-full">
                            <Crop className="h-12 w-12 text-blue-600 dark:text-blue-400" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-center mb-2 text-gray-900 dark:text-white">Crop PDF</h1>
                    <p className="text-center text-gray-600 dark:text-gray-400 mb-6">Upload a PDF to crop it</p>
                    <FileUpload
                        onFilesSelected={handleFileSelected}
                        maxFiles={1}
                        accept={{ "application/pdf": [".pdf"] }}
                        description="Drop a PDF file here or click to browse"
                    />
                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Crop your PDFs with precision and control
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={cn(
            "flex flex-col h-[calc(100vh-64px)]",
            darkMode ? "dark" : ""
        )}>
            {/* Floating Toolbar */}
            <div className={cn(
                "fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-2 transition-all duration-300",
                showToolbar ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"
            )}>
                <div className="flex items-center gap-1">
                    {/* Navigation */}
                    <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1 mr-2">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8" 
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} 
                            disabled={currentPage === 1}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-medium px-2 min-w-20 text-center text-gray-700 dark:text-gray-300">
                            {currentPage} / {numPages}
                        </span>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8" 
                            onClick={() => setCurrentPage(Math.min(numPages, currentPage + 1))} 
                            disabled={currentPage === numPages}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                    
                    {/* Crop Tools */}
                    <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1 mr-2">
                        {cropPresets.map((preset) => (
                            <Button
                                key={preset.name}
                                variant={maintainAspectRatio && aspectRatio === preset.aspectRatio ? "secondary" : "ghost"}
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => applyPreset(preset)}
                                title={preset.name}
                            >
                                {preset.icon}
                            </Button>
                        ))}
                    </div>
                    
                    {/* Zoom Controls */}
                    <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1 mr-2">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8" 
                            onClick={() => setZoom(Math.max(25, zoom - 25))}
                        >
                            <ZoomOut className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-medium px-2 min-w-[60px] text-center text-gray-700 dark:text-gray-300">{zoom}%</span>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8" 
                            onClick={() => setZoom(Math.min(200, zoom + 25))}
                        >
                            <ZoomIn className="h-4 w-4" />
                        </Button>
                        <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8" 
                            onClick={fitToPage} 
                            title="Fit to Page"
                        >
                            <Maximize className="h-4 w-4" />
                        </Button>
                    </div>
                    
                    {/* Rotation */}
                    <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1 mr-2">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8" 
                            onClick={() => {
                                saveToHistory();
                                setRotation((prev) => ((prev - 90 + 360) % 360));
                            }}
                            title="Rotate Left"
                        >
                            <RotateCw className="h-4 w-4 rotate-180" />
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8" 
                            onClick={() => {
                                saveToHistory();
                                setRotation((prev) => ((prev + 90) % 360));
                            }}
                            title="Rotate Right"
                        >
                            <RotateCw className="h-4 w-4" />
                        </Button>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-1 ml-2">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8" 
                            onClick={undo} 
                            disabled={historyIndex <= 0}
                            title="Undo"
                        >
                            <Undo className="h-4 w-4" />
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8" 
                            onClick={redo} 
                            disabled={historyIndex >= cropHistory.length - 1}
                            title="Redo"
                        >
                            <Redo className="h-4 w-4" />
                        </Button>
                        <Button 
                            onClick={cropPdf} 
                            disabled={isProcessing} 
                            className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {isProcessing ? "Processing..." : <><Download className="h-4 w-4 mr-1" /> Crop</>}
                        </Button>
                    </div>
                </div>
            </div>
            
            {/* Properties Panel */}
            <div className={cn(
                "fixed right-4 top-20 z-40 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 w-80 transition-all duration-300",
                showProperties ? "opacity-100 translate-x-0" : "opacity-0 translate-x-2 pointer-events-none"
            )}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Crop Settings</h3>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6" 
                        onClick={() => setShowProperties(false)}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
                
                {/* Crop Options */}
                <div className="mb-4 space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Apply to all pages</label>
                        <Button
                            variant={applyToAll ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => setApplyToAll(!applyToAll)}
                        >
                            {applyToAll ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                        </Button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Show grid</label>
                        <Button
                            variant={showGrid ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => setShowGrid(!showGrid)}
                        >
                            {showGrid ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                        </Button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Snap to grid</label>
                        <Button
                            variant={snapToGrid ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => setSnapToGrid(!snapToGrid)}
                            disabled={!showGrid}
                        >
                            {snapToGrid ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                        </Button>
                    </div>
                    
                    {showGrid && (
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Grid size</label>
                            <input
                                type="range"
                                min="2"
                                max="20"
                                value={gridSize}
                                onChange={(e) => setGridSize(Number(e.target.value))}
                                className="flex-1"
                            />
                            <span className="text-sm text-gray-600 dark:text-gray-400 w-8">{gridSize}%</span>
                        </div>
                    )}
                </div>
                
                {/* Crop Info */}
                <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        <div>Position: {Math.round(cropBox.x)}%, {Math.round(cropBox.y)}%</div>
                        <div>Size: {Math.round(cropBox.width)}% × {Math.round(cropBox.height)}%</div>
                        <div>Rotation: {rotation}°</div>
                    </div>
                </div>
                
                <div className="text-xs text-gray-500 dark:text-gray-400">
                    Drag the edges or corners of the box on the preview to resize the crop area. Drag inside the box to move it.
                </div>
            </div>
            
            {/* Settings Panel */}
            <div className="fixed bottom-4 left-4 z-40">
                <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setShowToolbar(!showToolbar)}
                        title={showToolbar ? "Hide Toolbar" : "Show Toolbar"}
                    >
                        <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setShowProperties(!showProperties)}
                        title={showProperties ? "Hide Properties" : "Show Properties"}
                    >
                        <Sliders className="h-4 w-4" />
                    </Button>
                    <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setShowGrid(!showGrid)}
                        title={showGrid ? "Hide Grid" : "Show Grid"}
                    >
                        <Grid3x3 className={cn("h-4 w-4", showGrid && "text-blue-600 dark:text-blue-400")} />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setSnapToGrid(!snapToGrid)}
                        title={snapToGrid ? "Disable Snap to Grid" : "Enable Snap to Grid"}
                    >
                        <Move className={cn("h-4 w-4", snapToGrid && "text-blue-600 dark:text-blue-400")} />
                    </Button>
                    <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setDarkMode(!darkMode)}
                        title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                    >
                        {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                            if (viewMode === 'desktop') setViewMode('tablet');
                            else if (viewMode === 'tablet') setViewMode('mobile');
                            else setViewMode('desktop');
                        }}
                        title={`View Mode: ${viewMode}`}
                    >
                        {viewMode === 'desktop' && <Monitor className="h-4 w-4" />}
                        {viewMode === 'tablet' && <Tablet className="h-4 w-4" />}
                        {viewMode === 'mobile' && <Smartphone className="h-4 w-4" />}
                    </Button>
                </div>
            </div>
            
            {/* Main Canvas Area */}
            <div 
                ref={scrollContainerRef}
                className="flex-1 bg-gray-50 dark:bg-gray-900 overflow-auto p-8 relative"
            >
                <div className="flex flex-col items-center">
                    {Array.from({ length: numPages }, (_, i) => (
                        <div 
                            key={i} 
                            className="relative mb-8 shadow-2xl transition-transform duration-200 ease-out"
                            style={{ 
                                width: "fit-content", 
                                height: "fit-content",
                                transform: `scale(${zoom / 100})`
                            }}
                        >
                            <canvas 
                                ref={el => { canvasRefs.current[i] = el; }} 
                                className="max-w-none block bg-white" 
                            />
                            
                            {/* Grid Overlay */}
                            {showGrid && (
                                <div className="absolute inset-0 pointer-events-none">
                                    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                                        <defs>
                                            <pattern id="grid" width={`${gridSize}%`} height={`${gridSize}%`} patternUnits="userSpaceOnUse">
                                                <path d={`M ${gridSize}% 0 L 0 0 0 ${gridSize}%`} fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth="0.5"/>
                                            </pattern>
                                        </defs>
                                        <rect width="100%" height="100%" fill="url(#grid)" />
                                    </svg>
                                </div>
                            )}
                            
                            {/* Crop Overlay */}
                            {i === currentPage - 1 && (
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
                                        className="absolute border-2 border-white cursor-move pointer-events-auto"
                                        style={{
                                            left: `${cropBox.x}%`,
                                            top: `${cropBox.y}%`,
                                            width: `${cropBox.width}%`,
                                            height: `${cropBox.height}%`,
                                        }}
                                        onMouseDown={(e) => handleMouseDown(e, i)}
                                    />
                                    
                                    {/* Corner handles */}
                                    <div 
                                        className="absolute w-3 h-3 bg-white border-2 border-blue-500 rounded-full pointer-events-auto cursor-nw-resize"
                                        style={{
                                            left: `${cropBox.x}%`,
                                            top: `${cropBox.y}%`,
                                            transform: 'translate(-50%, -50%)'
                                        }}
                                        onMouseDown={(e) => handleMouseDown(e, i)}
                                    />
                                    <div 
                                        className="absolute w-3 h-3 bg-white border-2 border-blue-500 rounded-full pointer-events-auto cursor-ne-resize"
                                        style={{
                                            left: `${cropBox.x + cropBox.width}%`,
                                            top: `${cropBox.y}%`,
                                            transform: 'translate(-50%, -50%)'
                                        }}
                                        onMouseDown={(e) => handleMouseDown(e, i)}
                                    />
                                    <div 
                                        className="absolute w-3 h-3 bg-white border-2 border-blue-500 rounded-full pointer-events-auto cursor-sw-resize"
                                        style={{
                                            left: `${cropBox.x}%`,
                                            top: `${cropBox.y + cropBox.height}%`,
                                            transform: 'translate(-50%, -50%)'
                                        }}
                                        onMouseDown={(e) => handleMouseDown(e, i)}
                                    />
                                    <div 
                                        className="absolute w-3 h-3 bg-white border-2 border-blue-500 rounded-full pointer-events-auto cursor-se-resize"
                                        style={{
                                            left: `${cropBox.x + cropBox.width}%`,
                                            top: `${cropBox.y + cropBox.height}%`,
                                            transform: 'translate(-50%, -50%)'
                                        }}
                                        onMouseDown={(e) => handleMouseDown(e, i)}
                                    />
                                </div>
                            )}
                            
                            {/* Page Number */}
                            <div className="absolute bottom-4 right-4 bg-gray-800 bg-opacity-70 text-white px-2 py-1 rounded text-sm">
                                Page {i + 1} of {numPages}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            {/* Help Button */}
            <div className="fixed bottom-4 right-4 z-40">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-full bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700"
                    onClick={() => {
                        toast.show({
                            title: "Crop PDF Help",
                            message: "Drag the edges or corners of the box to resize. Drag inside to move. Use the toolbar to adjust aspect ratio and other options.",
                            variant: "default",
                            position: "top-right",
                        });
                    }}
                    title="Help"
                >
                    <HelpCircle className="h-5 w-5" />
                </Button>
            </div>
        </div>
    );
}