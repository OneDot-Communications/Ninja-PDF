"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { saveAs } from "file-saver";
import { FileUpload } from "../ui/file-upload";
import { Button } from "../ui/button";
import {
    Type,
    Image as ImageIcon,
    Trash2,
    Save,
    ChevronLeft,
    ChevronRight,
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
    Stamp,
    Droplets,
    Palette,
    RotateCw,
    Copy,
    Plus,
    Check,
    ChevronDown
} from "lucide-react";
import { pdfStrategyManager, getPdfJs } from "@/lib/services/pdf-service";
import { pdfApi } from "@/lib/services/pdf-api";
import { toast } from "@/lib/hooks/use-toast";
import { cn } from "@/lib/utils";

// Watermark element interface
interface WatermarkElement {
    id: string;
    type: "text" | "image";
    content?: string; // for text
    imageBytes?: ArrayBuffer; // for image
    imageType?: "png" | "jpg" | "svg";
    x: number; // Percentage 0-100 relative to container
    y: number; // Percentage 0-100 relative to container
    width?: number; // Percentage
    height?: number; // Percentage (aspect ratio maintained)
    fontSize?: number;
    color?: string;
    opacity?: number;
    rotation?: number;
    fontFamily?: string;
    fontWeight?: string;
    fontStyle?: string;
    page?: number; // 1-based, undefined means all pages
    position?: "center" | "top" | "bottom" | "tiled" | "mosaic" | "custom";
    layer?: "over" | "below"; // Over or below PDF content
}

// History state for undo/redo
interface HistoryState {
    watermarks: WatermarkElement[];
    currentPage: number;
}

export function WatermarkPdfTool() {
    // File and PDF state
    const [file, setFile] = useState<File | null>(null);
    const [watermarks, setWatermarks] = useState<WatermarkElement[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [numPages, setNumPages] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedWatermarkId, setSelectedWatermarkId] = useState<string | null>(null);
    const [zoom, setZoom] = useState(100);

    // Canvas refs
    const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Properties state
    const [text, setText] = useState("CONFIDENTIAL");
    const [fontSize, setFontSize] = useState(50);
    const [color, setColor] = useState("#FF0000");
    const [opacity, setOpacity] = useState(0.3);
    const [rotation, setRotation] = useState(45);
    const [fontFamily, setFontFamily] = useState("Arial");
    const [isBold, setIsBold] = useState(false);
    const [isItalic, setIsItalic] = useState(false);
    const [position, setPosition] = useState<"center" | "top" | "bottom" | "tiled" | "mosaic" | "custom">("center");
    const [applyToAll, setApplyToAll] = useState(true);
    const [layer, setLayer] = useState<"over" | "below">("over");

    // UI state
    const [showToolbar, setShowToolbar] = useState(true);
    const [showProperties, setShowProperties] = useState(true);
    const [darkMode, setDarkMode] = useState(false);
    const [viewMode, setViewMode] = useState<"desktop" | "tablet" | "mobile">("desktop");
    const [showGrid, setShowGrid] = useState(false);
    const [snapToGrid, setSnapToGrid] = useState(false);
    const [gridSize, setGridSize] = useState(10);

    // History state for undo/redo
    const [history, setHistory] = useState<HistoryState[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    // Font options
    const fontOptions = [
        "Arial", "Helvetica", "Times New Roman", "Courier New",
        "Georgia", "Verdana", "Comic Sans MS", "Impact",
        "Lucida Console", "Tahoma", "Trebuchet MS", "Palatino"
    ];

    // Color presets
    const colorPresets = [
        "#FF0000", "#0000FF", "#00FF00", "#FFFF00",
        "#FF00FF", "#00FFFF", "#000000", "#FFFFFF", "#888888"
    ];

    const handleFileSelected = async (files: File[]) => {
        if (files.length > 0) {
            setFile(files[0]);
            setWatermarks([]);
            setCurrentPage(1);

            // Load PDF to get page count
            const pdfjsLib = await getPdfJs();
            const arrayBuffer = await files[0].arrayBuffer();
            const pdf = await (pdfjsLib as any).getDocument(new Uint8Array(arrayBuffer)).promise;
            setNumPages(pdf.numPages);

            // Initialize canvas refs
            canvasRefs.current = Array(pdf.numPages).fill(null);
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
                const viewport = page.getViewport({ scale });

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
    }, [file, zoom]);

    // Load selected watermark's properties into the form
    useEffect(() => {
        if (selectedWatermarkId) {
            const wm = watermarks.find(w => w.id === selectedWatermarkId);
            if (wm) {
                if (wm.type === 'text') {
                    if (wm.content) setText(wm.content);
                    if (wm.fontSize) setFontSize(wm.fontSize);
                    if (wm.color) setColor(wm.color);
                    if (wm.fontFamily) setFontFamily(wm.fontFamily);
                    setIsBold(wm.fontWeight === 'bold');
                    setIsItalic(wm.fontStyle === 'italic');
                }
                if (wm.opacity !== undefined) setOpacity(wm.opacity);
                if (wm.rotation !== undefined) setRotation(wm.rotation);
                if (wm.position) setPosition(wm.position);
                setApplyToAll(wm.page === undefined);
            }
        }
    }, [selectedWatermarkId]); // Only run when selection changes

    // Save current state to history
    const saveToHistory = useCallback(() => {
        const newState = {
            watermarks: [...watermarks],
            currentPage
        };

        // Remove any states after the current index
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(newState);

        // Limit history to 50 states
        if (newHistory.length > 50) {
            newHistory.shift();
        }

        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    }, [watermarks, currentPage, history, historyIndex]);

    // Undo
    const undo = useCallback(() => {
        if (historyIndex > 0) {
            const prevState = history[historyIndex - 1];
            setWatermarks(prevState.watermarks);
            setCurrentPage(prevState.currentPage);
            setHistoryIndex(historyIndex - 1);
        }
    }, [historyIndex, history]);

    // Redo
    const redo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            const nextState = history[historyIndex + 1];
            setWatermarks(nextState.watermarks);
            setCurrentPage(nextState.currentPage);
            setHistoryIndex(historyIndex + 1);
        }
    }, [historyIndex, history]);

    // Fit to page
    const fitToPage = () => {
        setZoom(100);
    };

    // Add text watermark
    const addTextWatermark = () => {
        const id = Math.random().toString(36).substr(2, 9);
        const newWatermark: WatermarkElement = {
            id,
            type: "text",
            content: text,
            x: 50,
            y: 50,
            fontSize: fontSize,
            color: color,
            opacity: opacity,
            rotation: rotation,
            fontFamily: fontFamily,
            fontWeight: isBold ? 'bold' : 'normal',
            fontStyle: isItalic ? 'italic' : 'normal',
            position: position,
            page: applyToAll ? undefined : currentPage,
            layer: layer
        };

        saveToHistory();
        setWatermarks(prev => [...prev, newWatermark]);
        setSelectedWatermarkId(id);
    };

    // Add image watermark
    const addImageWatermark = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const imgFile = e.target.files[0];
            const arrayBuffer = await imgFile.arrayBuffer();
            const id = Math.random().toString(36).substr(2, 9);

            const newWatermark: WatermarkElement = {
                id,
                type: "image",
                imageBytes: arrayBuffer,
                imageType: imgFile.type.includes("png") ? "png" : "jpg",
                x: 50,
                y: 50,
                width: 20,
                opacity: opacity,
                rotation: rotation,
                position: position,
                page: applyToAll ? undefined : currentPage
            };

            saveToHistory();
            setWatermarks(prev => [...prev, newWatermark]);
            setSelectedWatermarkId(id);
        }
    };

    // Update selected watermark properties
    const updateSelectedWatermark = (updates: Partial<WatermarkElement>) => {
        if (!selectedWatermarkId) return;

        saveToHistory();
        setWatermarks(prev => prev.map(wm =>
            wm.id === selectedWatermarkId ? { ...wm, ...updates } : wm
        ));
    };

    // Remove watermark
    const removeWatermark = (id: string) => {
        saveToHistory();
        setWatermarks(prev => prev.filter(wm => wm.id !== id));
        if (selectedWatermarkId === id) setSelectedWatermarkId(null);
    };

    // Duplicate watermark
    const duplicateWatermark = (id: string) => {
        const watermark = watermarks.find(wm => wm.id === id);
        if (!watermark) return;

        const newWatermark = {
            ...watermark,
            id: Math.random().toString(36).substr(2, 9),
            x: watermark.x + 5,
            y: watermark.y + 5
        };

        saveToHistory();
        setWatermarks(prev => [...prev, newWatermark]);
        setSelectedWatermarkId(newWatermark.id);
    };

    // Apply watermarks to PDF
    const applyWatermarks = async () => {
        if (!file) return;
        setIsProcessing(true);

        try {
            const result = await pdfApi.watermark(file, {
                watermarks
            });

            saveAs(result.blob, result.fileName || `watermarked-${file.name}`);

            toast.show({
                title: "Success",
                message: "Watermarks applied successfully!",
                variant: "success",
                position: "top-right",
            });
        } catch (error) {
            console.error("Error applying watermarks:", error);
            toast.show({
                title: "Watermark Failed",
                message: "Failed to apply watermarks. Please try again.",
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
            <div className="mx-auto max-w-2xl px-4">
                <FileUpload
                    onFilesSelected={handleFileSelected}
                    maxFiles={1}
                    accept={{ "application/pdf": [".pdf"] }}
                    description="Drop a PDF file here or click to browse"
                />
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

                    {/* Watermark Tools */}
                    <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1 mr-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={addTextWatermark}
                            title="Add Text Watermark"
                            className="h-8 w-8"
                        >
                            <Type className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => fileInputRef.current?.click()}
                            title="Add Image Watermark"
                            className="h-8 w-8"
                        >
                            <ImageIcon className="h-4 w-4" />
                        </Button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={addImageWatermark}
                        />
                    </div>

                    {/* Zoom Controls */}
                    <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
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
                            disabled={historyIndex >= history.length - 1}
                            title="Redo"
                        >
                            <Redo className="h-4 w-4" />
                        </Button>
                        <Button
                            onClick={applyWatermarks}
                            disabled={isProcessing || watermarks.length === 0}
                            className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {isProcessing ? "Processing..." : <><Download className="h-4 w-4 mr-1" /> Apply</>}
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
                    <h3 className="font-semibold text-gray-900 dark:text-white">Watermark Properties</h3>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setShowProperties(false)}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {/* Watermark Type */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type</label>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={addTextWatermark}
                        >
                            <Type className="h-4 w-4 mr-2" /> Text
                        </Button>
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <ImageIcon className="h-4 w-4 mr-2" /> Image
                        </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Click to add a watermark to your PDF</p>
                </div>

                {/* Text Content */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Text Content</label>
                    <input
                        type="text"
                        value={text}
                        onChange={(e) => {
                            setText(e.target.value);
                            if (selectedWatermarkId) updateSelectedWatermark({ content: e.target.value });
                        }}
                        className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-500 px-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        placeholder="Enter watermark text"
                    />
                </div>

                {/* Font Selection */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Font Family</label>
                    <select
                        value={fontFamily}
                        onChange={(e) => {
                            setFontFamily(e.target.value);
                            if (selectedWatermarkId) updateSelectedWatermark({ fontFamily: e.target.value });
                        }}
                        className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-500 px-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                        {fontOptions.map(font => (
                            <option key={font} value={font}>{font}</option>
                        ))}
                    </select>
                </div>

                {/* Text Style Controls */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Text Style</label>
                    <div className="flex items-center gap-2">
                        <Button
                            variant={isBold ? "secondary" : "ghost"}
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                                const newBold = !isBold;
                                setIsBold(newBold);
                                if (selectedWatermarkId) updateSelectedWatermark({ fontWeight: newBold ? 'bold' : 'normal' });
                            }}
                            title="Bold"
                        >
                            <span className="font-bold">B</span>
                        </Button>
                        <Button
                            variant={isItalic ? "secondary" : "ghost"}
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                                const newItalic = !isItalic;
                                setIsItalic(newItalic);
                                if (selectedWatermarkId) updateSelectedWatermark({ fontStyle: newItalic ? 'italic' : 'normal' });
                            }}
                            title="Italic"
                        >
                            <span className="italic">I</span>
                        </Button>
                    </div>
                </div>

                {/* Font Size */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Font Size: {fontSize}px</label>
                    <input
                        type="range"
                        min="10"
                        max="200"
                        step="5"
                        value={fontSize}
                        onChange={(e) => {
                            const val = Number(e.target.value);
                            setFontSize(val);
                            if (selectedWatermarkId) updateSelectedWatermark({ fontSize: val });
                        }}
                        className="w-full"
                    />
                </div>

                {/* Color Picker */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Color</label>
                    <div className="flex items-center gap-2 flex-wrap">
                        {colorPresets.map(c => (
                            <button
                                key={c}
                                className={cn("w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600", color === c && "ring-2 ring-offset-2 ring-blue-500")}
                                style={{ backgroundColor: c }}
                                onClick={() => {
                                    setColor(c);
                                    if (selectedWatermarkId) updateSelectedWatermark({ color: c });
                                }}
                                title={c}
                            />
                        ))}
                        <input
                            type="color"
                            value={color}
                            onChange={(e) => {
                                setColor(e.target.value);
                                if (selectedWatermarkId) updateSelectedWatermark({ color: e.target.value });
                            }}
                            className="h-8 w-8 rounded border border-gray-300 dark:border-gray-500 cursor-pointer bg-transparent p-0"
                            title="Custom Color"
                        />
                    </div>
                </div>

                {/* Opacity */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Opacity: {Math.round(opacity * 100)}%</label>
                    <input
                        type="range"
                        min="0.1"
                        max="1"
                        step="0.1"
                        value={opacity}
                        onChange={(e) => {
                            const val = Number(e.target.value);
                            setOpacity(val);
                            if (selectedWatermarkId) updateSelectedWatermark({ opacity: val });
                        }}
                        className="w-full"
                    />
                </div>

                {/* Rotation */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Rotation: {rotation}°</label>
                    <input
                        type="range"
                        min="-180"
                        max="180"
                        step="5"
                        value={rotation}
                        onChange={(e) => {
                            const val = Number(e.target.value);
                            setRotation(val);
                            if (selectedWatermarkId) updateSelectedWatermark({ rotation: val });
                        }}
                        className="w-full"
                    />
                </div>

                {/* Position */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Position</label>
                    <div className="grid grid-cols-3 gap-2">
                        {["center", "top", "bottom", "tiled", "mosaic"].map((p) => (
                            <Button
                                key={p}
                                variant={position === p ? "secondary" : "ghost"}
                                size="sm"
                                onClick={() => {
                                    setPosition(p as any);
                                    if (selectedWatermarkId) updateSelectedWatermark({ position: p as any });
                                }}
                                className="capitalize"
                            >
                                {p}
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Layer - Over or Below content */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Layer</label>
                    <div className="grid grid-cols-2 gap-2">
                        <Button
                            variant={layer === "over" ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => {
                                setLayer("over");
                                if (selectedWatermarkId) updateSelectedWatermark({ layer: "over" });
                            }}
                            className="flex flex-col items-center py-3"
                        >
                            <Layers className="h-4 w-4 mb-1" />
                            <span className="text-xs">Over content</span>
                        </Button>
                        <Button
                            variant={layer === "below" ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => {
                                setLayer("below");
                                if (selectedWatermarkId) updateSelectedWatermark({ layer: "below" });
                            }}
                            className="flex flex-col items-center py-3"
                        >
                            <Layers className="h-4 w-4 mb-1 rotate-180" />
                            <span className="text-xs">Below content</span>
                        </Button>
                    </div>
                </div>

                {/* Apply to All Pages */}
                <div className="mb-4">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Apply to all pages</label>
                        <Button
                            variant={applyToAll ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => setApplyToAll(!applyToAll)}
                        >
                            {applyToAll ? <Check className="h-4 w-4" /> : <div className="h-4 w-4 border border-gray-300 dark:border-gray-500" />}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Layers Panel */}
            <div className={cn(
                "fixed left-4 top-20 z-40 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 w-64 transition-all duration-300",
                "opacity-100 translate-x-0"
            )}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Watermarks</h3>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => { }}
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>

                <div className="space-y-2 max-h-96 overflow-auto">
                    {watermarks.length === 0 ? (
                        <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                            No watermarks added yet
                        </div>
                    ) : (
                        watermarks.map((wm) => (
                            <div
                                key={wm.id}
                                className={cn(
                                    "flex items-center gap-2 p-2 rounded-md cursor-pointer",
                                    selectedWatermarkId === wm.id ? "bg-blue-100 dark:bg-blue-900" : "hover:bg-gray-100 dark:hover:bg-gray-700"
                                )}
                                onClick={() => setSelectedWatermarkId(wm.id)}
                            >
                                <div className="flex-1 flex items-center gap-2">
                                    {wm.type === 'text' ? <Type className="h-4 w-4 text-gray-600 dark:text-gray-400" /> : <ImageIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />}
                                    <span className="text-sm truncate">
                                        {wm.type === 'text' ? wm.content?.substring(0, 20) : `Image ${wm.id.substring(0, 8)}`}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            duplicateWatermark(wm.id);
                                        }}
                                        title="Duplicate"
                                    >
                                        <Copy className="h-3 w-3" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeWatermark(wm.id);
                                        }}
                                        title="Delete"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
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

                            {/* Watermark Overlay */}
                            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                                {watermarks.filter(wm => wm.page === undefined || wm.page === i + 1).map((wm) => (
                                    <div key={wm.id}>
                                        {wm.position === 'tiled' ? (
                                            <div className="grid grid-cols-3 grid-rows-4 h-full w-full">
                                                {Array.from({ length: 12 }).map((_, j) => (
                                                    <div key={j} className="flex items-center justify-center">
                                                        {wm.type === 'text' ? (
                                                            <div
                                                                className="font-bold whitespace-nowrap select-none"
                                                                style={{
                                                                    color: wm.color,
                                                                    opacity: wm.opacity,
                                                                    transform: `rotate(${wm.rotation}deg)`,
                                                                    fontSize: `${(wm.fontSize || 50) * 0.4}px`,
                                                                    fontFamily: wm.fontFamily,
                                                                    fontWeight: wm.fontWeight,
                                                                    fontStyle: wm.fontStyle
                                                                }}
                                                            >
                                                                {wm.content}
                                                            </div>
                                                        ) : wm.imageBytes && (
                                                            <img
                                                                src={URL.createObjectURL(new Blob([wm.imageBytes]))}
                                                                style={{
                                                                    opacity: wm.opacity,
                                                                    transform: `rotate(${wm.rotation}deg)`,
                                                                    width: `${(wm.fontSize || 50) * 0.8}px`
                                                                }}
                                                            />
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div
                                                className={cn(
                                                    "absolute flex items-center justify-center",
                                                    wm.position === 'center' ? "inset-0" :
                                                        wm.position === 'top' ? "top-8 left-0 right-0" :
                                                            wm.position === 'bottom' ? "bottom-8 left-0 right-0" :
                                                                `left-[${wm.x}%] top-[${wm.y}%]`
                                                )}
                                            >
                                                {wm.type === 'text' ? (
                                                    <div
                                                        className="font-bold whitespace-nowrap select-none"
                                                        style={{
                                                            color: wm.color,
                                                            opacity: wm.opacity,
                                                            transform: `rotate(${wm.rotation}deg)`,
                                                            fontSize: `${(wm.fontSize || 50) * 0.6}px`,
                                                            fontFamily: wm.fontFamily,
                                                            fontWeight: wm.fontWeight,
                                                            fontStyle: wm.fontStyle
                                                        }}
                                                    >
                                                        {wm.content}
                                                    </div>
                                                ) : wm.imageBytes && (
                                                    <img
                                                        src={URL.createObjectURL(new Blob([wm.imageBytes]))}
                                                        style={{
                                                            opacity: wm.opacity,
                                                            transform: `rotate(${wm.rotation}deg)`,
                                                            width: `${(wm.fontSize || 50) * 2}px`
                                                        }}
                                                    />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

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
                            title: "Watermark PDF Help",
                            message: "Add text or image watermarks to your PDF. Use the properties panel to customize appearance.",
                            variant: "success",
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