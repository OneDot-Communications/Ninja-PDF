"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { saveAs } from "file-saver";
import { FileUpload } from "../ui/file-upload";
import { Button } from "../ui/button";
import {
    FileText,
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
    RotateCw,
    RefreshCw,
    Plus,
    Trash2,
    Copy,
    CheckSquare,
    Square,
    LayoutGrid,
    List,
    Eye,
    EyeOff,
    ArrowUp,
    ArrowDown,
    GripVertical,
    RotateCcw
} from "lucide-react";
import { pdfStrategyManager, getPdfJs } from "@/lib/services/pdf-service";
import { pdfApi } from "@/lib/services/pdf-api";
import { toast } from "@/lib/hooks/use-toast";
import { cn } from "@/lib/utils";

// Page item interface
interface PageItem {
    id: string;
    originalIndex: number; // 0-based index in original file
    rotation: number; // Additional rotation (0, 90, 180, 270)
    isBlank?: boolean;
}

// History state for undo/redo
interface HistoryState {
    pages: PageItem[];
    currentPage: number;
}

export function RotatePdfTool() {
    // File and PDF state
    const [file, setFile] = useState<File | null>(null);
    const [pdfProxy, setPdfProxy] = useState<any>(null);
    const [pages, setPages] = useState<PageItem[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [numPages, setNumPages] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [zoom, setZoom] = useState(100);

    // Canvas refs
    const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Selection state
    const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [rotationAngle, setRotationAngle] = useState(90); // Default rotation angle

    // UI state
    const [showToolbar, setShowToolbar] = useState(true);
    const [showProperties, setShowProperties] = useState(true);
    const [darkMode, setDarkMode] = useState(false);
    const [deviceView, setDeviceView] = useState<"desktop" | "tablet" | "mobile">("desktop");
    const [showGrid, setShowGrid] = useState(false);
    const [showPageNumbers, setShowPageNumbers] = useState(true);
    const [loadingThumbnails, setLoadingThumbnails] = useState(false);
    const [thumbnails, setThumbnails] = useState<string[]>([]);

    // History state for undo/redo
    const [history, setHistory] = useState<HistoryState[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    const handleFileSelected = async (files: File[]) => {
        if (files.length > 0) {
            const selectedFile = files[0];
            setFile(selectedFile);
            setPages([]);
            setCurrentPage(1);
            setSelectedPages(new Set());

            try {
                const pdfjsLib = await getPdfJs();
                const arrayBuffer = await selectedFile.arrayBuffer();
                const pdf = await (pdfjsLib as any).getDocument({
                    data: new Uint8Array(arrayBuffer),
                    verbosity: 0
                }).promise;
                setPdfProxy(pdf);
                setNumPages(pdf.numPages);

                // Initialize canvas refs
                canvasRefs.current = Array(pdf.numPages).fill(null);

                // Generate thumbnails
                await generateThumbnails(selectedFile);

                // Create initial page items
                const newPages: PageItem[] = [];
                for (let i = 0; i < pdf.numPages; i++) {
                    newPages.push({
                        id: Math.random().toString(36).substr(2, 9),
                        originalIndex: i,
                        rotation: 0
                    });
                }
                setPages(newPages);

                // Initialize history
                setHistory([{
                    pages: newPages,
                    currentPage: 1
                }]);
                setHistoryIndex(0);
            } catch (error: any) {
                console.error("Error loading PDF:", error);
                setFile(null);
                setPdfProxy(null);

                let errorMessage = "Failed to load PDF. Please try again.";
                if (error.message?.includes('Invalid PDF structure') || error.name === 'InvalidPDFException') {
                    errorMessage = "The PDF file appears to be corrupted. Try using the Repair PDF tool first.";
                } else if (error.message?.includes('password') || error.name === 'PasswordException') {
                    errorMessage = "The PDF is password-protected. Please remove the password first.";
                } else if (error.message?.includes('encrypted')) {
                    errorMessage = "The PDF is encrypted and cannot be processed.";
                }

                toast.show({
                    title: "Load Failed",
                    message: errorMessage,
                    variant: "error",
                    position: "top-right",
                });
            }
        }
    };

    // Generate thumbnails for all pages
    const generateThumbnails = async (file: File) => {
        setLoadingThumbnails(true);
        try {
            const pdfjsLib = await getPdfJs();
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await (pdfjsLib as any).getDocument({
                data: new Uint8Array(arrayBuffer),
                verbosity: 0
            }).promise;

            const thumbs: string[] = [];

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 0.2 }); // Small thumbnail scale

                const canvas = document.createElement("canvas");
                const context = canvas.getContext("2d");

                if (!context) continue;

                canvas.height = viewport.height;
                canvas.width = viewport.width;

                await page.render({
                    canvasContext: context,
                    viewport: viewport,
                    canvas: canvas,
                }).promise;

                thumbs.push(canvas.toDataURL());
            }

            setThumbnails(thumbs);
        } catch (error) {
            console.error("Error generating thumbnails:", error);
        } finally {
            setLoadingThumbnails(false);
        }
    };

    useEffect(() => {
        if (!file || !pdfProxy) return;

        const renderAllPages = async () => {
            // Apply zoom
            const scale = zoom / 100;

            // Render each page
            for (let i = 0; i < pdfProxy.numPages; i++) {
                const page = await pdfProxy.getPage(i + 1);
                const viewport = page.getViewport({ scale });

                // Get or create canvas
                let canvas = canvasRefs.current[i];

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
    }, [file, pdfProxy, zoom]);

    // Save current state to history
    const saveToHistory = useCallback(() => {
        const newState = {
            pages: [...pages],
            currentPage
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
    }, [pages, currentPage, history, historyIndex]);

    // Undo
    const undo = useCallback(() => {
        if (historyIndex > 0) {
            const prevState = history[historyIndex - 1];
            setPages(prevState.pages);
            setCurrentPage(prevState.currentPage);
            setHistoryIndex(historyIndex - 1);
        }
    }, [historyIndex, history]);

    // Redo
    const redo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            const nextState = history[historyIndex + 1];
            setPages(nextState.pages);
            setCurrentPage(nextState.currentPage);
            setHistoryIndex(historyIndex + 1);
        }
    }, [historyIndex, history]);

    // Fit to page
    const fitToPage = () => {
        setZoom(100);
    };

    // Toggle selection
    const toggleSelection = (pageIndex: number) => {
        const newSelection = new Set(selectedPages);
        if (newSelection.has(pageIndex)) {
            newSelection.delete(pageIndex);
        } else {
            newSelection.add(pageIndex);
        }
        setSelectedPages(newSelection);
    };

    // Rotate selected pages
    const rotateSelected = (direction: "cw" | "ccw") => {
        if (selectedPages.size === 0) return;

        saveToHistory();
        setPages(prev => prev.map(p => {
            if (selectedPages.has(p.originalIndex)) {
                const angle = direction === "cw" ? rotationAngle : -rotationAngle;
                return { ...p, rotation: (p.rotation + angle + 360) % 360 };
            }
            return p;
        }));
    };

    // Rotate all pages
    const rotateAll = (direction: "cw" | "ccw") => {
        saveToHistory();
        const angle = direction === "cw" ? rotationAngle : -rotationAngle;
        setPages(prev => prev.map(p => ({ ...p, rotation: (p.rotation + angle + 360) % 360 })));
    };

    // Reset all rotations
    const resetRotations = () => {
        saveToHistory();
        setPages(prev => prev.map(p => ({ ...p, rotation: 0 })));
    };

    // Save rotated PDF
    const savePdf = async () => {
        if (!file || pages.length === 0) return;
        setIsProcessing(true);

        try {
            const result = await pdfApi.rotate(file, {
                pages
            });

            saveAs(result.blob, result.fileName || `rotated-${file.name}`);

            toast.show({
                title: "Success",
                message: "PDF rotated successfully!",
                variant: "success",
                position: "top-right",
            });
        } catch (error: any) {
            console.error("Error rotating PDF:", error);

            let errorMessage = "Failed to rotate PDF. Please try again.";
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
                            <RotateCw className="h-12 w-12 text-blue-600 dark:text-blue-400" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-center mb-2 text-gray-900 dark:text-white">Rotate PDF</h1>
                    <p className="text-center text-gray-600 dark:text-gray-400 mb-6">Upload a PDF to rotate pages</p>
                    <FileUpload
                        onFilesSelected={handleFileSelected}
                        maxFiles={1}
                        accept={{ "application/pdf": [".pdf"] }}
                        description="Drop a PDF file here or click to browse"
                    />
                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Rotate pages in your PDF with precision control
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

                    {/* Rotation Angle */}
                    <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1 mr-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setRotationAngle(45)}
                            title="Set rotation to 45°"
                        >
                            45°
                        </Button>
                        <Button
                            variant={rotationAngle === 90 ? "secondary" : "ghost"}
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setRotationAngle(90)}
                            title="Set rotation to 90°"
                        >
                            90°
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setRotationAngle(180)}
                            title="Set rotation to 180°"
                        >
                            180°
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setRotationAngle(270)}
                            title="Set rotation to 270°"
                        >
                            270°
                        </Button>
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
                            onClick={savePdf}
                            disabled={isProcessing || pages.length === 0}
                            className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {isProcessing ? "Processing..." : <><Download className="h-4 w-4 mr-1" /> Save</>}
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
                    <h3 className="font-semibold text-gray-900 dark:text-white">Rotation Properties</h3>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setShowProperties(false)}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {/* Page Info */}
                <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        <div>Total Pages: {numPages}</div>
                        <div>Selected Pages: {selectedPages.size}</div>
                        <div>Current Page: {currentPage}</div>
                        <div>Rotation Angle: {rotationAngle}°</div>
                    </div>
                </div>

                {/* Rotation Options */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Rotation Options</label>
                    <div className="grid grid-cols-2 gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => rotateSelected("ccw")}
                            disabled={selectedPages.size === 0}
                            className="h-10"
                        >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Rotate Selected Left
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => rotateSelected("cw")}
                            disabled={selectedPages.size === 0}
                            className="h-10"
                        >
                            <RotateCw className="h-4 w-4 mr-2" />
                            Rotate Selected Right
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => rotateAll("ccw")}
                            className="h-10"
                        >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Rotate All Left
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => rotateAll("cw")}
                            className="h-10"
                        >
                            <RotateCw className="h-4 w-4 mr-2" />
                            Rotate All Right
                        </Button>
                    </div>
                </div>

                {/* Reset Option */}
                <div className="mb-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={resetRotations}
                        className="w-full"
                    >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Reset All Rotations
                    </Button>
                </div>

                {/* Selection Options */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Selection Options</label>
                    <div className="grid grid-cols-2 gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                const allSelected = new Set<number>();
                                for (let i = 0; i < numPages; i++) {
                                    allSelected.add(i);
                                }
                                setSelectedPages(allSelected);
                            }}
                            className="h-10"
                        >
                            {selectedPages.size === numPages ? "Deselect All" : "Select All"}
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                const odd = new Set<number>();
                                for (let i = 0; i < numPages; i += 2) {
                                    odd.add(i);
                                }
                                setSelectedPages(odd);
                            }}
                            className="h-10"
                        >
                            Select Odd Pages
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                const even = new Set<number>();
                                for (let i = 1; i < numPages; i += 2) {
                                    even.add(i);
                                }
                                setSelectedPages(even);
                            }}
                            className="h-10"
                        >
                            Select Even Pages
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedPages(new Set())}
                            className="h-10"
                        >
                            Deselect All
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Canvas Area */}
            <div
                ref={scrollContainerRef}
                className="flex-1 bg-gray-50 dark:bg-gray-900 overflow-auto p-8 relative"
            >
                <div className="flex flex-col items-center">
                    {viewMode === 'grid' ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {pages.map((page, index) => (
                                <div
                                    key={page.id}
                                    className={cn(
                                        "relative group cursor-pointer transition-all duration-200",
                                        selectedPages.has(page.originalIndex) && "ring-2 ring-blue-500 ring-offset-2"
                                    )}
                                    onClick={() => toggleSelection(page.originalIndex)}
                                    style={{
                                        transform: `scale(${zoom / 100}) rotate(${page.rotation}deg)`
                                    }}
                                >
                                    <div className="relative aspect-3/4 w-full overflow-hidden rounded-lg shadow-md bg-white">
                                        {/* Page Thumbnail */}
                                        <div className="relative h-full w-full">
                                            {loadingThumbnails ? (
                                                <div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-500 text-sm">
                                                    Loading...
                                                </div>
                                            ) : thumbnails[index] ? (
                                                <img
                                                    src={thumbnails[index]}
                                                    alt={`Page ${index + 1}`}
                                                    className="h-full w-full object-contain"
                                                />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-500 text-sm">
                                                    Page {index + 1}
                                                </div>
                                            )}

                                            {/* Page Number */}
                                            {showPageNumbers && (
                                                <div className="absolute bottom-2 right-2 bg-gray-800 bg-opacity-70 text-white px-2 py-1 rounded text-xs">
                                                    {index + 1}
                                                </div>
                                            )}

                                            {/* Selection Indicator */}
                                            {selectedPages.has(page.originalIndex) && (
                                                <div className="absolute top-2 right-2 bg-blue-500 text-white p-1 rounded-full">
                                                    <CheckSquare className="h-3 w-3" />
                                                </div>
                                            )}

                                            {/* Rotation Indicator */}
                                            {page.rotation !== 0 && (
                                                <div className="absolute top-2 left-2 bg-gray-800 bg-opacity-70 text-white p-1 rounded-full">
                                                    <RotateCw className="h-3 w-3" style={{ transform: `rotate(${page.rotation}deg)` }} />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Page Info */}
                                    <div className="mt-2 text-center">
                                        <div className="text-sm font-medium">
                                            Page {page.originalIndex + 1}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            Rotation: {page.rotation}°
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="w-full max-w-2xl space-y-4">
                            {pages.map((page, index) => (
                                <div
                                    key={page.id}
                                    className={cn(
                                        "flex items-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md cursor-pointer transition-all duration-200",
                                        selectedPages.has(page.originalIndex) && "ring-2 ring-blue-500 ring-offset-2"
                                    )}
                                    onClick={() => toggleSelection(page.originalIndex)}
                                    style={{
                                        transform: `scale(${zoom / 100}) rotate(${page.rotation}deg)`
                                    }}
                                >
                                    {/* Page Thumbnail */}
                                    <div className="flex-1 relative h-32 w-48 overflow-hidden rounded border border-gray-200 dark:border-gray-700">
                                        {loadingThumbnails ? (
                                            <div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-500 text-sm">
                                                Loading...
                                            </div>
                                        ) : thumbnails[index] ? (
                                            <img
                                                src={thumbnails[index]}
                                                alt={`Page ${index + 1}`}
                                                className="h-full w-full object-contain"
                                            />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-500 text-sm">
                                                Page {index + 1}
                                            </div>
                                        )}

                                        {/* Page Number */}
                                        {showPageNumbers && (
                                            <div className="absolute bottom-2 right-2 bg-gray-800 bg-opacity-70 text-white px-2 py-1 rounded text-xs">
                                                {index + 1}
                                            </div>
                                        )}

                                        {/* Selection Indicator */}
                                        {selectedPages.has(page.originalIndex) && (
                                            <div className="absolute top-2 right-2 bg-blue-500 text-white p-1 rounded-full">
                                                <CheckSquare className="h-3 w-3" />
                                            </div>
                                        )}

                                        {/* Rotation Indicator */}
                                        {page.rotation !== 0 && (
                                            <div className="absolute top-2 left-2 bg-gray-800 bg-opacity-70 text-white p-1 rounded-full">
                                                <RotateCw className="h-3 w-3" style={{ transform: `rotate(${page.rotation}deg)` }} />
                                            </div>
                                        )}
                                    </div>

                                    {/* Page Info */}
                                    <div className="ml-4 flex-1">
                                        <div className="text-sm font-medium">
                                            Page {page.originalIndex + 1}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            Rotation: {page.rotation}°
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
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
                            if (deviceView === 'desktop') setDeviceView('tablet');
                            else if (deviceView === 'tablet') setDeviceView('mobile');
                            else setDeviceView('desktop');
                        }}
                        title={`View Mode: ${deviceView}`}
                    >
                        {deviceView === 'desktop' && <Monitor className="h-4 w-4" />}
                        {deviceView === 'tablet' && <Tablet className="h-4 w-4" />}
                        {deviceView === 'mobile' && <Smartphone className="h-4 w-4" />}
                    </Button>
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
                            title: "Rotate PDF Help",
                            message: "Select pages to rotate individually or use the rotation options to rotate all pages. Adjust the rotation angle for precise control.",
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