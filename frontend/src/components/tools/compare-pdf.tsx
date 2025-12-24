"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { saveAs } from "file-saver";
import { FileUpload } from "../ui/file-upload";
import { Button } from "../ui/button";
import {
    GitCompare,
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
    ArrowRight,
    ArrowLeft,
    ArrowUp,
    ArrowDown,
    Eye,
    EyeOff,
    StretchHorizontal,
    Copy,
    Plus,
    Check,
    ChevronDown,
    RotateCw,
    Palette,
    Loader2,
    Type,
    Circle
} from "lucide-react";
import { pdfStrategyManager, getPdfJs } from "@/lib/services/pdf-service";
import { toast } from "@/lib/hooks/use-toast";
import { cn } from "@/lib/utils";

// Comparison mode
type ComparisonMode = "side-by-side" | "overlay" | "diff" | "slide";

// Comparison element interface
interface ComparisonElement {
    id: string;
    type: "rectangle" | "circle" | "arrow" | "text";
    x: number; // Percentage 0-100 relative to container
    y: number; // Percentage 0-100 relative to container
    width?: number; // Percentage
    height?: number; // Percentage
    page: number; // 1-based
    content?: string; // for text
    color?: string;
    strokeWidth?: number;
    opacity?: number;
    fontSize?: number;
    fontFamily?: string;
    points?: { x: number, y: number }[]; // for arrow
}

// History state for undo/redo
interface HistoryState {
    comparisonElements: ComparisonElement[];
    currentPage: number;
    comparisonMode: ComparisonMode;
    opacity: number;
}

export function ComparePdfTool() {
    // File and PDF state
    const [file1, setFile1] = useState<File | null>(null);
    const [file2, setFile2] = useState<File | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [numPages, setNumPages] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [zoom, setZoom] = useState(100);

    // Canvas refs
    const canvas1Refs = useRef<(HTMLCanvasElement | null)[]>([]);
    const canvas2Refs = useRef<(HTMLCanvasElement | null)[]>([]);
    const diffCanvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Comparison state
    const [comparisonMode, setComparisonMode] = useState<ComparisonMode>("side-by-side");
    const [opacity, setOpacity] = useState(50);
    const [comparisonElements, setComparisonElements] = useState<ComparisonElement[]>([]);
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
    const [activeTool, setActiveTool] = useState<"select" | "rectangle" | "circle" | "arrow" | "text">("select");
    const [strokeWidth, setStrokeWidth] = useState(2);
    const [color, setColor] = useState("#FF0000");
    const [fontSize, setFontSize] = useState(16);
    const [fontFamily, setFontFamily] = useState("Arial");
    const [isComputingDiff, setIsComputingDiff] = useState(false);
    const [diffImage, setDiffImage] = useState<string | null>(null);
    const [showFile1Only, setShowFile1Only] = useState(false);
    const [showFile2Only, setShowFile2Only] = useState(false);

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

    // Color presets
    const colorPresets = [
        "#FF0000", "#0000FF", "#00FF00", "#FFFF00",
        "#FF00FF", "#00FFFF", "#000000", "#888888"
    ];

    // Font options
    const fontOptions = [
        "Arial", "Helvetica", "Times New Roman", "Courier New",
        "Georgia", "Verdana", "Comic Sans MS", "Impact"
    ];

    // Comparison mode options
    const comparisonModeOptions = [
        { id: "side-by-side", icon: <ArrowLeft className="h-4 w-4 mr-2" />, label: "Side by Side" },
        { id: "overlay", icon: <Layers className="h-4 w-4 mr-2" />, label: "Overlay" },
        { id: "diff", icon: <GitCompare className="h-4 w-4 mr-2" />, label: "Difference" },
        { id: "slide", icon: <StretchHorizontal className="h-4 w-4 mr-2" />, label: "Slider" }
    ];

    const handleFile1Selected = async (files: File[]) => {
        if (files.length > 0) {
            setFile1(files[0]);
            setCurrentPage(1);

            // Load PDF to get page count
            const pdfjsLib = await getPdfJs();
            const arrayBuffer = await files[0].arrayBuffer();
            const pdf = await (pdfjsLib as any).getDocument(new Uint8Array(arrayBuffer)).promise;
            setNumPages(pdf.numPages);

            // Initialize canvas refs
            canvas1Refs.current = Array(pdf.numPages).fill(null);
            canvas2Refs.current = Array(pdf.numPages).fill(null);
            diffCanvasRefs.current = Array(pdf.numPages).fill(null);
        }
    };

    const handleFile2Selected = async (files: File[]) => {
        if (files.length > 0) {
            setFile2(files[0]);
            setCurrentPage(1);

            // Load PDF to get page count
            const pdfjsLib = await getPdfJs();
            const arrayBuffer = await files[0].arrayBuffer();
            const pdf = await (pdfjsLib as any).getDocument(new Uint8Array(arrayBuffer)).promise;
            setNumPages(pdf.numPages);

            // Initialize canvas refs
            canvas1Refs.current = Array(pdf.numPages).fill(null);
            canvas2Refs.current = Array(pdf.numPages).fill(null);
            diffCanvasRefs.current = Array(pdf.numPages).fill(null);
        }
    };

    useEffect(() => {
        if (!file1 || !file2) return;

        const renderAllPages = async () => {
            const pdfjsLib = await getPdfJs();

            // Apply zoom
            const scale = zoom / 100;

            // Render file 1
            const arrayBuffer1 = await file1.arrayBuffer();
            const pdf1 = await (pdfjsLib as any).getDocument(new Uint8Array(arrayBuffer1)).promise;

            for (let i = 1; i <= pdf1.numPages; i++) {
                const page = await pdf1.getPage(i);
                const viewport = page.getViewport({ scale });

                // Get or create canvas
                let canvas = canvas1Refs.current[i - 1];

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

            // Render file 2
            const arrayBuffer2 = await file2.arrayBuffer();
            const pdf2 = await (pdfjsLib as any).getDocument(new Uint8Array(arrayBuffer2)).promise;

            for (let i = 1; i <= pdf2.numPages; i++) {
                const page = await pdf2.getPage(i);
                const viewport = page.getViewport({ scale });

                // Get or create canvas
                let canvas = canvas2Refs.current[i - 1];

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

            // Compute diff if in diff mode
            if (comparisonMode === "diff") {
                computeDiff();
            }
        };

        renderAllPages();
    }, [file1, file2, zoom, comparisonMode]);

    // Compute difference between PDFs
    const computeDiff = useCallback(async () => {
        if (!file1 || !file2) return;
        setIsComputingDiff(true);
        setDiffImage(null);

        try {
            // Initialize PDF.js
            const pdfjsLib = await getPdfJs();

            // Get page 1 from both PDFs
            const arrayBuffer1 = await file1.arrayBuffer();
            const pdf1 = await (pdfjsLib as any).getDocument(new Uint8Array(arrayBuffer1)).promise;
            const page1 = await pdf1.getPage(1);

            const arrayBuffer2 = await file2.arrayBuffer();
            const pdf2 = await (pdfjsLib as any).getDocument(new Uint8Array(arrayBuffer2)).promise;
            const page2 = await pdf2.getPage(1);

            // Render both pages to canvases
            const viewport1 = page1.getViewport({ scale: 1 });
            const viewport2 = page2.getViewport({ scale: 1 });

            // Use larger dimensions
            const width = Math.max(viewport1.width, viewport2.width);
            const height = Math.max(viewport1.height, viewport2.height);

            const canvas1 = document.createElement("canvas");
            canvas1.width = width;
            canvas1.height = height;
            const ctx1 = canvas1.getContext("2d");
            if (!ctx1) throw new Error("Could not get context 1");

            const canvas2 = document.createElement("canvas");
            canvas2.width = width;
            canvas2.height = height;
            const ctx2 = canvas2.getContext("2d");
            if (!ctx2) throw new Error("Could not get context 2");

            // Fill with white background
            ctx1.fillStyle = "white";
            ctx1.fillRect(0, 0, width, height);
            ctx2.fillStyle = "white";
            ctx2.fillRect(0, 0, width, height);

            await page1.render({ canvasContext: ctx1, viewport: viewport1, canvas: canvas1 }).promise;
            await page2.render({ canvasContext: ctx2, viewport: viewport2, canvas: canvas2 }).promise;

            // Get image data for comparison
            const imageData1 = ctx1.getImageData(0, 0, width, height);
            const imageData2 = ctx2.getImageData(0, 0, width, height);

            // Create diff canvas
            const diffCanvas = document.createElement("canvas");
            diffCanvas.width = width;
            diffCanvas.height = height;
            const diffCtx = diffCanvas.getContext("2d");
            if (!diffCtx) throw new Error("Could not get diff context");

            // Create diff image data
            const diffImageData = diffCtx.createImageData(width, height);
            const data1 = imageData1.data;
            const data2 = imageData2.data;
            const diffData = diffImageData.data;

            // Simple pixel-by-pixel comparison
            for (let i = 0; i < data1.length; i += 4) {
                const r1 = data1[i];
                const g1 = data1[i + 1];
                const b1 = data1[i + 2];
                const a1 = data1[i + 3];

                const r2 = data2[i];
                const g2 = data2[i + 1];
                const b2 = data2[i + 2];
                const a2 = data2[i + 3];

                // Calculate difference
                const diff = Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);

                if (diff > 30) {
                    // Mark as red
                    diffData[i] = 255;
                    diffData[i + 1] = 0;
                    diffData[i + 2] = 0;
                    diffData[i + 3] = 255;
                } else {
                    // Mark as white
                    diffData[i] = 255;
                    diffData[i + 1] = 255;
                    diffData[i + 2] = 255;
                    diffData[i + 3] = 255;
                }
            }

            // Put diff image data back to canvas
            diffCtx.putImageData(diffImageData, 0, 0);

            // Convert to data URL
            const diffImageUrl = diffCanvas.toDataURL();
            setDiffImage(diffImageUrl);

            // Store diff canvas in refs
            diffCanvasRefs.current[0] = diffCanvas;

        } catch (error) {
            console.error("Error computing diff:", error);
            toast.show({
                title: "Diff Failed",
                message: "Failed to compute difference. Please try again.",
                variant: "error",
                position: "top-right",
            });
        } finally {
            setIsComputingDiff(false);
        }
    }, [file1, file2]);

    // Save current state to history
    const saveToHistory = useCallback(() => {
        const newState = {
            comparisonElements: [...comparisonElements],
            currentPage,
            comparisonMode,
            opacity
        };

        // Remove any states after the current index
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(newState);

        // Limit history to 20 states
        if (newHistory.length > 20) {
            newHistory.shift();
        }

        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    }, [comparisonElements, currentPage, comparisonMode, opacity, history, historyIndex]);

    // Undo
    const undo = useCallback(() => {
        if (historyIndex > 0) {
            const prevState = history[historyIndex - 1];
            setComparisonElements(prevState.comparisonElements);
            setCurrentPage(prevState.currentPage);
            setComparisonMode(prevState.comparisonMode);
            setOpacity(prevState.opacity);
            setHistoryIndex(historyIndex - 1);
        }
    }, [historyIndex, history]);

    // Redo
    const redo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            const nextState = history[historyIndex + 1];
            setComparisonElements(nextState.comparisonElements);
            setCurrentPage(nextState.currentPage);
            setComparisonMode(nextState.comparisonMode);
            setOpacity(nextState.opacity);
            setHistoryIndex(historyIndex + 1);
        }
    }, [historyIndex, history]);

    // Fit to page
    const fitToPage = () => {
        setZoom(100);
    };

    // Add comparison element
    const addComparisonElement = (type: "rectangle" | "circle" | "arrow" | "text") => {
        const id = Math.random().toString(36).substr(2, 9);
        const newElement: ComparisonElement = {
            id,
            type,
            x: 50,
            y: 50,
            page: currentPage,
            color: color,
            strokeWidth: strokeWidth,
            opacity: opacity / 100
        };

        if (type === "text") {
            newElement.content = "Note";
            newElement.fontSize = fontSize;
            newElement.fontFamily = fontFamily;
        } else if (type === "rectangle" || type === "circle") {
            newElement.width = 20;
            newElement.height = 10;
        } else if (type === "arrow") {
            newElement.points = [
                { x: 40, y: 50 },
                { x: 60, y: 50 }
            ];
        }

        saveToHistory();
        setComparisonElements(prev => [...prev, newElement]);
        setSelectedElementId(id);
        setActiveTool('select');
    };

    // Update selected element properties
    const updateSelectedElement = (updates: Partial<ComparisonElement>) => {
        if (!selectedElementId) return;

        saveToHistory();
        setComparisonElements(prev => prev.map(el =>
            el.id === selectedElementId ? { ...el, ...updates } : el
        ));
    };

    // Remove element
    const removeElement = (id: string) => {
        saveToHistory();
        setComparisonElements(prev => prev.filter(el => el.id !== id));
        if (selectedElementId === id) setSelectedElementId(null);
    };

    // Export comparison
    const exportComparison = async () => {
        if (!file1 || !file2) return;
        setIsProcessing(true);

        try {
            // Create a new PDF with comparison elements
            const result = await pdfStrategyManager.execute('compare', [file1, file2], {
                comparisonMode,
                opacity: opacity / 100,
                comparisonElements
            });

            saveAs(result.blob, result.fileName || `comparison-${file1.name}-vs-${file2.name}`);

            toast.show({
                title: "Success",
                message: "Comparison exported successfully!",
                variant: "success",
                position: "top-right",
            });
        } catch (error) {
            console.error("Error exporting comparison:", error);
            toast.show({
                title: "Export Failed",
                message: "Failed to export comparison. Please try again.",
                variant: "error",
                position: "top-right",
            });
        } finally {
            setIsProcessing(false);
        }
    };

    // Handle both files from a single upload
    const handleFilesSelected = async (files: File[]) => {
        if (files.length >= 1) {
            setFile1(files[0]);
        }
        if (files.length >= 2) {
            setFile2(files[1]);
        }

        if (files.length > 0) {
            // Load PDF to get page count from first file
            const pdfjsLib = await getPdfJs();
            const arrayBuffer = await files[0].arrayBuffer();
            const pdf = await (pdfjsLib as any).getDocument(new Uint8Array(arrayBuffer)).promise;
            setNumPages(pdf.numPages);

            // Initialize canvas refs
            canvas1Refs.current = Array(pdf.numPages).fill(null);
            canvas2Refs.current = Array(pdf.numPages).fill(null);
            diffCanvasRefs.current = Array(pdf.numPages).fill(null);
        }
    };

    // If no files, show file upload
    if (!file1 || !file2) {
        return (
            <div className="mx-auto max-w-2xl px-4 py-8">
                {/* Initial state - no files selected */}
                {!file1 && (
                    <FileUpload
                        onFilesSelected={handleFilesSelected}
                        maxFiles={2}
                        accept={{ "application/pdf": [".pdf"] }}
                        description="Select 2 PDF files to compare"
                    />
                )}

                {/* One file selected - show option to add second */}
                {file1 && !file2 && (
                    <FileUpload
                        onFilesSelected={(files) => {
                            if (files.length > 0) {
                                setFile2(files[0]);
                            }
                        }}
                        maxFiles={1}
                        accept={{ "application/pdf": [".pdf"] }}
                        description="Select the second PDF to compare with"
                    />
                )}

                {/* Show selected files status */}
                {(file1 || file2) && (
                    <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div
                            className={cn(
                                "rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md",
                                !file1 && "cursor-pointer border-dashed"
                            )}
                            onClick={() => !file1 && document.getElementById('file1-input')?.click()}
                        >
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                                    <FileText className="h-5 w-5" />
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <p className="text-xs font-medium text-muted-foreground mb-0.5">Original PDF</p>
                                    <p className="text-sm font-semibold truncate text-foreground">
                                        {file1 ? file1.name : <span className="text-muted-foreground italic font-normal">Click to select...</span>}
                                    </p>
                                </div>
                                {file1 ? (
                                    <div className="flex items-center gap-1">
                                        <Check className="h-5 w-5 text-green-500" />
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setFile1(null); }}
                                            className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                                        >
                                            <X className="h-4 w-4 text-gray-500" />
                                        </button>
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        <div
                            className={cn(
                                "rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md",
                                !file2 && file1 && "cursor-pointer border-dashed border-indigo-300"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                                    <GitCompare className="h-5 w-5" />
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <p className="text-xs font-medium text-muted-foreground mb-0.5">Modified PDF</p>
                                    <p className="text-sm font-semibold truncate text-foreground">
                                        {file2 ? file2.name : <span className="text-muted-foreground italic font-normal">{file1 ? "↑ Select above" : "Waiting..."}</span>}
                                    </p>
                                </div>
                                {file2 ? (
                                    <div className="flex items-center gap-1">
                                        <Check className="h-5 w-5 text-green-500" />
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setFile2(null); }}
                                            className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                                        >
                                            <X className="h-4 w-4 text-gray-500" />
                                        </button>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </div>
                )}
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

                    {/* Comparison Mode */}
                    <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1 mr-2">
                        {comparisonModeOptions.map((mode) => (
                            <Button
                                key={mode.id}
                                variant={comparisonMode === mode.id ? "secondary" : "ghost"}
                                size="sm"
                                onClick={() => {
                                    setComparisonMode(mode.id as ComparisonMode);
                                    saveToHistory();
                                }}
                                className="h-8 px-2"
                            >
                                {mode.icon}
                                <span className="text-xs">{mode.label}</span>
                            </Button>
                        ))}
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
                            onClick={exportComparison}
                            disabled={isProcessing}
                            className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {isProcessing ? "Processing..." : <><Download className="h-4 w-4 mr-1" /> Export</>}
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
                    <h3 className="font-semibold text-gray-900 dark:text-white">Comparison Properties</h3>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setShowProperties(false)}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {/* Opacity Control */}
                {comparisonMode === "overlay" && (
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Overlay Opacity: {opacity}%</label>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={opacity}
                            onChange={(e) => {
                                setOpacity(Number(e.target.value));
                                saveToHistory();
                            }}
                            className="w-full"
                        />
                    </div>
                )}

                {/* Annotation Tools */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Annotation Tools</label>
                    <div className="grid grid-cols-4 gap-2">
                        <Button
                            variant={activeTool === 'select' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setActiveTool('select')}
                            title="Select"
                        >
                            <Move className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={activeTool === 'rectangle' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => addComparisonElement('rectangle')}
                            title="Rectangle"
                        >
                            <SquareIcon className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={activeTool === 'circle' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => addComparisonElement('circle')}
                            title="Circle"
                        >
                            <Circle className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={activeTool === 'arrow' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => addComparisonElement('arrow')}
                            title="Arrow"
                        >
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={activeTool === 'text' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => addComparisonElement('text')}
                            title="Text"
                        >
                            <Type className="h-4 w-4" />
                        </Button>
                    </div>
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
                                    updateSelectedElement({ color: c });
                                }}
                                title={c}
                            />
                        ))}
                        <input
                            type="color"
                            value={color}
                            onChange={(e) => {
                                setColor(e.target.value);
                                updateSelectedElement({ color: e.target.value });
                            }}
                            className="h-8 w-8 rounded border border-gray-300 dark:border-gray-500 cursor-pointer bg-transparent p-0"
                            title="Custom Color"
                        />
                    </div>
                </div>

                {/* Stroke Width */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Stroke Width: {strokeWidth}px</label>
                    <input
                        type="range"
                        min="1"
                        max="10"
                        step="1"
                        value={strokeWidth}
                        onChange={(e) => {
                            setStrokeWidth(Number(e.target.value));
                            updateSelectedElement({ strokeWidth: Number(e.target.value) });
                        }}
                        className="w-full"
                    />
                </div>

                {/* Font Options */}
                {activeTool === 'text' && (
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Text Properties</label>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Font Family</label>
                                <select
                                    value={fontFamily}
                                    onChange={(e) => {
                                        setFontFamily(e.target.value);
                                        updateSelectedElement({ fontFamily: e.target.value });
                                    }}
                                    className="w-full h-8 rounded border border-gray-300 dark:border-gray-500 px-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs"
                                >
                                    {fontOptions.map(font => (
                                        <option key={font} value={font}>{font}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Font Size</label>
                                <input
                                    type="number"
                                    min="8"
                                    max="72"
                                    value={fontSize}
                                    onChange={(e) => {
                                        setFontSize(Number(e.target.value));
                                        updateSelectedElement({ fontSize: Number(e.target.value) });
                                    }}
                                    className="w-full h-8 rounded border border-gray-300 dark:border-gray-500 px-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* File Info */}
                <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        <div>File 1: {file1?.name || "Not selected"}</div>
                        <div>File 2: {file2?.name || "Not selected"}</div>
                        <div>Mode: {comparisonModeOptions.find(m => m.id === comparisonMode)?.label}</div>
                    </div>
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
                    {comparisonMode === "side-by-side" && (
                        <div className="flex gap-8">
                            <div className="flex flex-col items-center">
                                <h3 className="text-lg font-semibold mb-2 text-gray-700 dark:text-gray-300">{file1?.name || "File 1"}</h3>
                                {Array.from({ length: numPages }, (_, i) => (
                                    <div
                                        key={i}
                                        className="relative mb-4 shadow-2xl transition-transform duration-200 ease-out"
                                        style={{
                                            width: "fit-content",
                                            height: "fit-content",
                                            transform: `scale(${zoom / 100})`
                                        }}
                                    >
                                        <canvas
                                            ref={el => { canvas1Refs.current[i] = el; }}
                                            className="max-w-none block bg-white"
                                        />

                                        {/* Page Number */}
                                        <div className="absolute bottom-4 right-4 bg-gray-800 bg-opacity-70 text-white px-2 py-1 rounded text-sm">
                                            Page {i + 1}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex flex-col items-center">
                                <h3 className="text-lg font-semibold mb-2 text-gray-700 dark:text-gray-300">{file2?.name || "File 2"}</h3>
                                {Array.from({ length: numPages }, (_, i) => (
                                    <div
                                        key={i}
                                        className="relative mb-4 shadow-2xl transition-transform duration-200 ease-out"
                                        style={{
                                            width: "fit-content",
                                            height: "fit-content",
                                            transform: `scale(${zoom / 100})`
                                        }}
                                    >
                                        <canvas
                                            ref={el => { canvas2Refs.current[i] = el; }}
                                            className="max-w-none block bg-white"
                                        />

                                        {/* Page Number */}
                                        <div className="absolute bottom-4 right-4 bg-gray-800 bg-opacity-70 text-white px-2 py-1 rounded text-sm">
                                            Page {i + 1}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {comparisonMode === "overlay" && (
                        <div className="relative">
                            <h3 className="text-lg font-semibold mb-4 text-center text-gray-700 dark:text-gray-300">
                                {file1?.name || "File 1"} vs {file2?.name || "File 2"}
                            </h3>
                            {Array.from({ length: numPages }, (_, i) => (
                                <div
                                    key={i}
                                    className="relative mb-4 shadow-2xl transition-transform duration-200 ease-out"
                                    style={{
                                        width: "fit-content",
                                        height: "fit-content",
                                        transform: `scale(${zoom / 100})`
                                    }}
                                >
                                    <canvas
                                        ref={el => { canvas1Refs.current[i] = el; }}
                                        className="max-w-none block bg-white"
                                    />

                                    {/* Overlay second PDF */}
                                    <div
                                        className="absolute inset-0"
                                        style={{ opacity: opacity / 100 }}
                                    >
                                        <canvas
                                            ref={el => { canvas2Refs.current[i] = el; }}
                                            className="max-w-none block"
                                        />
                                    </div>

                                    {/* Page Number */}
                                    <div className="absolute bottom-4 right-4 bg-gray-800 bg-opacity-70 text-white px-2 py-1 rounded text-sm">
                                        Page {i + 1}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {comparisonMode === "diff" && (
                        <div className="flex flex-col items-center">
                            <h3 className="text-lg font-semibold mb-4 text-center text-gray-700 dark:text-gray-300">
                                Difference: {file1?.name || "File 1"} vs {file2?.name || "File 2"}
                            </h3>
                            {isComputingDiff ? (
                                <div className="flex items-center justify-center h-64">
                                    <Loader2 className="h-8 w-8 animate-spin mr-2" />
                                    <span className="text-lg">Computing differences...</span>
                                </div>
                            ) : (
                                Array.from({ length: numPages }, (_, i) => (
                                    <div
                                        key={i}
                                        className="relative mb-4 shadow-2xl transition-transform duration-200 ease-out"
                                        style={{
                                            width: "fit-content",
                                            height: "fit-content",
                                            transform: `scale(${zoom / 100})`
                                        }}
                                    >
                                        {diffImage && i === 0 ? (
                                            <img
                                                src={diffImage}
                                                alt="Difference"
                                                className="max-w-none block bg-white"
                                            />
                                        ) : (
                                            <canvas
                                                ref={el => { diffCanvasRefs.current[i] = el; }}
                                                className="max-w-none block bg-white"
                                            />
                                        )}

                                        {/* Page Number */}
                                        <div className="absolute bottom-4 right-4 bg-gray-800 bg-opacity-70 text-white px-2 py-1 rounded text-sm">
                                            Page {i + 1}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {comparisonMode === "slide" && (
                        <div className="flex flex-col items-center">
                            <div className="flex items-center gap-4 mb-4">
                                <Button
                                    variant={showFile1Only ? "secondary" : "outline"}
                                    size="sm"
                                    onClick={() => {
                                        setShowFile1Only(true);
                                        setShowFile2Only(false);
                                    }}
                                >
                                    {file1?.name || "File 1"}
                                </Button>
                                <Button
                                    variant={showFile2Only ? "secondary" : "outline"}
                                    size="sm"
                                    onClick={() => {
                                        setShowFile1Only(false);
                                        setShowFile2Only(true);
                                    }}
                                >
                                    {file2?.name || "File 2"}
                                </Button>
                                <Button
                                    variant={!showFile1Only && !showFile2Only ? "secondary" : "outline"}
                                    size="sm"
                                    onClick={() => {
                                        setShowFile1Only(false);
                                        setShowFile2Only(false);
                                    }}
                                >
                                    Both
                                </Button>
                            </div>

                            {Array.from({ length: numPages }, (_, i) => (
                                <div
                                    key={i}
                                    className="relative mb-4 shadow-2xl transition-transform duration-200 ease-out"
                                    style={{
                                        width: "fit-content",
                                        height: "fit-content",
                                        transform: `scale(${zoom / 100})`
                                    }}
                                >
                                    {showFile1Only && (
                                        <canvas
                                            ref={el => { canvas1Refs.current[i] = el; }}
                                            className="max-w-none block bg-white"
                                        />
                                    )}

                                    {showFile2Only && (
                                        <canvas
                                            ref={el => { canvas2Refs.current[i] = el; }}
                                            className="max-w-none block bg-white"
                                        />
                                    )}

                                    {!showFile1Only && !showFile2Only && (
                                        <div className="flex gap-4">
                                            <canvas
                                                ref={el => { canvas1Refs.current[i] = el; }}
                                                className="max-w-none block bg-white"
                                            />
                                            <canvas
                                                ref={el => { canvas2Refs.current[i] = el; }}
                                                className="max-w-none block bg-white"
                                            />
                                        </div>
                                    )}

                                    {/* Page Number */}
                                    <div className="absolute bottom-4 right-4 bg-gray-800 bg-opacity-70 text-white px-2 py-1 rounded text-sm">
                                        Page {i + 1}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
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
                            title: "Compare PDF Help",
                            message: "Use different comparison modes to analyze differences between PDFs. Add annotations to highlight specific areas.",
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