"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { saveAs } from "file-saver";
import FileUploadHero from "../ui/file-upload-hero"; // Hero uploader (big CTA, full-page drag overlay)
import { Button } from "../ui/button";
import { 
    Hash, 
    Type, 
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
    Palette,
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignJustify,
    Bold,
    Italic,
    Underline,
    RotateCw,
    Copy,
    Plus,
    Check,
    ChevronDown,
    ArrowUp,
    ArrowDown,
    ArrowLeft,
    ArrowRight
} from "lucide-react";
import { pdfStrategyManager, getPdfJs } from "@/lib/services/pdf-service";
import { toast } from "@/lib/hooks/use-toast";
import { cn } from "@/lib/utils";

// Page number element interface
interface PageNumberElement {
    id: string;
    format: "n" | "page-n" | "n-of-m" | "page-n-of-m";
    startFrom: number;
    pageRange: string; // e.g. "1-5, 8"
    fontFamily: string;
    fontSize: number;
    color: string;
    margin: number;
    position: "bottom-center" | "bottom-right" | "top-right" | "top-left" | "bottom-left" | "top-center";
    fontWeight: string;
    fontStyle: string;
    textDecoration: string;
    opacity: number;
    rotation: number;
    verticalAlignment: "top" | "middle" | "bottom";
    horizontalAlignment: "left" | "center" | "right";
}

// History state for undo/redo
interface HistoryState {
    pageNumberElement: PageNumberElement | null;
    currentPage: number;
}

export function PageNumbersTool() {
    // File and PDF state
    const [file, setFile] = useState<File | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [numPages, setNumPages] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [zoom, setZoom] = useState(100);
    
    // Page number element state
    const [pageNumberElement, setPageNumberElement] = useState<PageNumberElement | null>(null);
    
    // Canvas refs
    const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    
    // Properties state
    const [format, setFormat] = useState<"n" | "page-n" | "n-of-m" | "page-n-of-m">("n-of-m");
    const [startFrom, setStartFrom] = useState(1);
    const [pageRange, setPageRange] = useState(""); // e.g. "1-5, 8"
    const [fontFamily, setFontFamily] = useState("Helvetica");
    const [fontSize, setFontSize] = useState(12);
    const [color, setColor] = useState("#000000");
    const [margin, setMargin] = useState(20);
    const [position, setPosition] = useState<"bottom-center" | "bottom-right" | "top-right" | "top-left" | "bottom-left" | "top-center">("bottom-center");
    const [isBold, setIsBold] = useState(false);
    const [isItalic, setIsItalic] = useState(false);
    const [isUnderline, setIsUnderline] = useState(false);
    const [opacity, setOpacity] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [verticalAlignment, setVerticalAlignment] = useState<"top" | "middle" | "bottom">("bottom");
    const [horizontalAlignment, setHorizontalAlignment] = useState<"left" | "center" | "right">("center");
    
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
        "Helvetica", "Times New Roman", "Courier New", 
        "Georgia", "Verdana", "Comic Sans MS", "Impact", 
        "Lucida Console", "Tahoma", "Trebuchet MS", "Palatino"
    ];
    
    // Color presets
    const colorPresets = [
        "#000000", "#FF0000", "#0000FF", "#00FF00", 
        "#FFFF00", "#FF00FF", "#00FFFF", "#888888"
    ];
    
    // Format options
    const formatOptions = [
        { id: "n", label: "1", example: "1" },
        { id: "page-n", label: "Page 1", example: "Page 1" },
        { id: "n-of-m", label: "1 of N", example: "1 of 5" },
        { id: "page-n-of-m", label: "Page 1 of N", example: "Page 1 of 5" }
    ];
    
    // Position options
    const positionOptions = [
        { id: "top-left", icon: <ArrowUp className="h-3 w-3 mr-1" />, label: "Top Left" },
        { id: "top-center", icon: <ArrowUp className="h-3 w-3 mx-auto" />, label: "Top Center" },
        { id: "top-right", icon: <ArrowUp className="h-3 w-3 ml-auto" />, label: "Top Right" },
        { id: "bottom-left", icon: <ArrowDown className="h-3 w-3 mr-1" />, label: "Bottom Left" },
        { id: "bottom-center", icon: <ArrowDown className="h-3 w-3 mx-auto" />, label: "Bottom Center" },
        { id: "bottom-right", icon: <ArrowDown className="h-3 w-3 ml-auto" />, label: "Bottom Right" }
    ];

    const handleFileSelected = async (files: File[]) => {
        if (files.length > 0) {
            setFile(files[0]);
            setCurrentPage(1);
            
            // Load PDF to get page count
            const pdfjsLib = await getPdfJs();
            const arrayBuffer = await files[0].arrayBuffer();
            const pdf = await (pdfjsLib as any).getDocument(new Uint8Array(arrayBuffer)).promise;
            setNumPages(pdf.numPages);
            
            // Initialize canvas refs
            canvasRefs.current = Array(pdf.numPages).fill(null);
            
            // Initialize page number element
            const newPageNumberElement: PageNumberElement = {
                id: Math.random().toString(36).substr(2, 9),
                format,
                startFrom,
                pageRange,
                fontFamily,
                fontSize,
                color,
                margin,
                position,
                fontWeight: isBold ? 'bold' : 'normal',
                fontStyle: isItalic ? 'italic' : 'normal',
                textDecoration: isUnderline ? 'underline' : 'none',
                opacity,
                rotation,
                verticalAlignment,
                horizontalAlignment
            };
            
            setPageNumberElement(newPageNumberElement);
            setHistory([{
                pageNumberElement: newPageNumberElement,
                currentPage: 1
            }]);
            setHistoryIndex(0);
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

    // Save current state to history
    const saveToHistory = useCallback(() => {
        if (!pageNumberElement) return;
        
        const newState = {
            pageNumberElement: { ...pageNumberElement },
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
    }, [pageNumberElement, currentPage, history, historyIndex]);

    // Undo
    const undo = useCallback(() => {
        if (historyIndex > 0) {
            const prevState = history[historyIndex - 1];
            setPageNumberElement(prevState.pageNumberElement);
            setCurrentPage(prevState.currentPage);
            setHistoryIndex(historyIndex - 1);
            
            // Update local state
            if (prevState.pageNumberElement) {
                setFormat(prevState.pageNumberElement.format);
                setStartFrom(prevState.pageNumberElement.startFrom);
                setPageRange(prevState.pageNumberElement.pageRange);
                setFontFamily(prevState.pageNumberElement.fontFamily);
                setFontSize(prevState.pageNumberElement.fontSize);
                setColor(prevState.pageNumberElement.color);
                setMargin(prevState.pageNumberElement.margin);
                setPosition(prevState.pageNumberElement.position);
                setIsBold(prevState.pageNumberElement.fontWeight === 'bold');
                setIsItalic(prevState.pageNumberElement.fontStyle === 'italic');
                setIsUnderline(prevState.pageNumberElement.textDecoration === 'underline');
                setOpacity(prevState.pageNumberElement.opacity);
                setRotation(prevState.pageNumberElement.rotation);
                setVerticalAlignment(prevState.pageNumberElement.verticalAlignment);
                setHorizontalAlignment(prevState.pageNumberElement.horizontalAlignment);
            }
        }
    }, [historyIndex, history]);

    // Redo
    const redo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            const nextState = history[historyIndex + 1];
            setPageNumberElement(nextState.pageNumberElement);
            setCurrentPage(nextState.currentPage);
            setHistoryIndex(historyIndex + 1);
            
            // Update local state
            if (nextState.pageNumberElement) {
                setFormat(nextState.pageNumberElement.format);
                setStartFrom(nextState.pageNumberElement.startFrom);
                setPageRange(nextState.pageNumberElement.pageRange);
                setFontFamily(nextState.pageNumberElement.fontFamily);
                setFontSize(nextState.pageNumberElement.fontSize);
                setColor(nextState.pageNumberElement.color);
                setMargin(nextState.pageNumberElement.margin);
                setPosition(nextState.pageNumberElement.position);
                setIsBold(nextState.pageNumberElement.fontWeight === 'bold');
                setIsItalic(nextState.pageNumberElement.fontStyle === 'italic');
                setIsUnderline(nextState.pageNumberElement.textDecoration === 'underline');
                setOpacity(nextState.pageNumberElement.opacity);
                setRotation(nextState.pageNumberElement.rotation);
                setVerticalAlignment(nextState.pageNumberElement.verticalAlignment);
                setHorizontalAlignment(nextState.pageNumberElement.horizontalAlignment);
            }
        }
    }, [historyIndex, history]);

    // Fit to page
    const fitToPage = () => {
        setZoom(100);
    };

    // Update page number element
    const updatePageNumberElement = useCallback(() => {
        if (!pageNumberElement) return;
        
        const updatedElement: PageNumberElement = {
            ...pageNumberElement,
            format,
            startFrom,
            pageRange,
            fontFamily,
            fontSize,
            color,
            margin,
            position,
            fontWeight: isBold ? 'bold' : 'normal',
            fontStyle: isItalic ? 'italic' : 'normal',
            textDecoration: isUnderline ? 'underline' : 'none',
            opacity,
            rotation,
            verticalAlignment,
            horizontalAlignment
        };
        
        setPageNumberElement(updatedElement);
        saveToHistory();
    }, [pageNumberElement, format, startFrom, pageRange, fontFamily, fontSize, color, margin, position, isBold, isItalic, isUnderline, opacity, rotation, verticalAlignment, horizontalAlignment, saveToHistory]);

    // Apply page numbers to PDF
    const applyPageNumbers = async () => {
        if (!file || !pageNumberElement) return;
        setIsProcessing(true);

        try {
            const result = await pdfStrategyManager.execute('page-numbers', [file], {
                ...pageNumberElement
            });

            saveAs(result.blob, result.fileName || `numbered-${file.name}`);
            
            toast.show({
                title: "Success",
                message: "Page numbers added successfully!",
                variant: "success",
                position: "top-right",
            });
        } catch (error: any) {
            console.error("Error adding page numbers:", error);

            let errorMessage = "Failed to add page numbers. Please try again.";
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

    // Generate page number text for display
    const generatePageNumberText = (pageNum: number) => {
        if (!pageNumberElement) return "";
        
        const { format, startFrom } = pageNumberElement;
        const adjustedPageNum = pageNum - 1 + startFrom;
        
        switch (format) {
            case "n":
                return `${adjustedPageNum}`;
            case "page-n":
                return `Page ${adjustedPageNum}`;
            case "n-of-m":
                return `${adjustedPageNum} of ${numPages}`;
            case "page-n-of-m":
                return `Page ${adjustedPageNum} of ${numPages}`;
            default:
                return `${adjustedPageNum}`;
        }
    };

    // If no file, show file upload
    if (!file) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] bg-linear-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
                <div className="max-w-md w-full p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl">
                    <div className="flex items-center justify-center mb-6">
                        <div className="p-4 bg-blue-100 dark:bg-blue-900 rounded-full">
                            <Hash className="h-12 w-12 text-blue-600 dark:text-blue-400" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-center mb-2 text-gray-900 dark:text-white">Add Page Numbers</h1>
                    <p className="text-center text-gray-600 dark:text-gray-400 mb-6">Upload a PDF to add page numbers</p>
                    <div className="min-h-[320px] flex items-center justify-center">
                        <FileUploadHero
                            title="Page Numbers"
                            onFilesSelected={handleFileSelected}
                            maxFiles={1}
                            accept={{ "application/pdf": [".pdf"] }}
                        />
                    </div>
                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Add professional page numbers to your PDFs
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
                            onClick={applyPageNumbers} 
                            disabled={isProcessing || !pageNumberElement} 
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
                    <h3 className="font-semibold text-gray-900 dark:text-white">Page Number Properties</h3>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6" 
                        onClick={() => setShowProperties(false)}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
                
                {/* Format Options */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Format</label>
                    <div className="grid grid-cols-2 gap-2">
                        {formatOptions.map((fmt) => (
                            <Button
                                key={fmt.id}
                                variant={format === fmt.id ? "secondary" : "ghost"}
                                size="sm"
                                onClick={() => {
                                    setFormat(fmt.id as any);
                                    updatePageNumberElement();
                                }}
                                className="justify-start"
                            >
                                {fmt.label}
                            </Button>
                        ))}
                    </div>
                </div>
                
                {/* Start From and Page Range */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Start From</label>
                        <input
                            type="number"
                            min="1"
                            value={startFrom}
                            onChange={(e) => {
                                setStartFrom(parseInt(e.target.value) || 1);
                                updatePageNumberElement();
                            }}
                            className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-500 px-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Page Range</label>
                        <input
                            type="text"
                            placeholder="e.g. 1-5, 8"
                            value={pageRange}
                            onChange={(e) => {
                                setPageRange(e.target.value);
                                updatePageNumberElement();
                            }}
                            className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-500 px-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                    </div>
                </div>
                
                {/* Font Selection */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Font Family</label>
                    <select
                        value={fontFamily}
                        onChange={(e) => {
                            setFontFamily(e.target.value);
                            updatePageNumberElement();
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
                                setIsBold(!isBold);
                                updatePageNumberElement();
                            }}
                            title="Bold"
                        >
                            <Bold className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={isItalic ? "secondary" : "ghost"}
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                                setIsItalic(!isItalic);
                                updatePageNumberElement();
                            }}
                            title="Italic"
                        >
                            <Italic className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={isUnderline ? "secondary" : "ghost"}
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                                setIsUnderline(!isUnderline);
                                updatePageNumberElement();
                            }}
                            title="Underline"
                        >
                            <Underline className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                
                {/* Font Size and Margin */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Font Size</label>
                        <input
                            type="number"
                            min="6"
                            max="72"
                            value={fontSize}
                            onChange={(e) => {
                                setFontSize(parseInt(e.target.value) || 12);
                                updatePageNumberElement();
                            }}
                            className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-500 px-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Margin (px)</label>
                        <input
                            type="number"
                            min="0"
                            max="200"
                            value={margin}
                            onChange={(e) => {
                                setMargin(parseInt(e.target.value) || 0);
                                updatePageNumberElement();
                            }}
                            className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-500 px-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
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
                                    updatePageNumberElement();
                                }}
                                title={c}
                            />
                        ))}
                        <input
                            type="color"
                            value={color}
                            onChange={(e) => {
                                setColor(e.target.value);
                                updatePageNumberElement();
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
                            setOpacity(Number(e.target.value));
                            updatePageNumberElement();
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
                            setRotation(Number(e.target.value));
                            updatePageNumberElement();
                        }}
                        className="w-full"
                    />
                </div>
                
                {/* Position */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Position</label>
                    <div className="grid grid-cols-3 gap-2">
                        {positionOptions.map((pos) => (
                            <Button
                                key={pos.id}
                                variant={position === pos.id ? "secondary" : "ghost"}
                                size="sm"
                                onClick={() => {
                                    setPosition(pos.id as any);
                                    updatePageNumberElement();
                                }}
                                className="h-10 flex items-center justify-center"
                            >
                                {pos.icon}
                                <span className="text-xs">{pos.label}</span>
                            </Button>
                        ))}
                    </div>
                </div>
                
                {/* Alignment */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Alignment</label>
                    <div className="grid grid-cols-3 gap-2">
                        <Button
                            variant={horizontalAlignment === "left" ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => {
                                setHorizontalAlignment("left");
                                updatePageNumberElement();
                            }}
                            className="h-10"
                        >
                            <AlignLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={horizontalAlignment === "center" ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => {
                                setHorizontalAlignment("center");
                                updatePageNumberElement();
                            }}
                            className="h-10"
                        >
                            <AlignCenter className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={horizontalAlignment === "right" ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => {
                                setHorizontalAlignment("right");
                                updatePageNumberElement();
                            }}
                            className="h-10"
                        >
                            <AlignRight className="h-4 w-4" />
                        </Button>
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
                            
                            {/* Page Number Overlay */}
                            {pageNumberElement && (
                                <div 
                                    className="absolute p-2 font-bold whitespace-nowrap select-none transition-all duration-300"
                                    style={{
                                        fontFamily: pageNumberElement.fontFamily,
                                        fontSize: `${pageNumberElement.fontSize * (zoom / 100)}px`,
                                        color: pageNumberElement.color,
                                        fontWeight: pageNumberElement.fontWeight,
                                        fontStyle: pageNumberElement.fontStyle,
                                        textDecoration: pageNumberElement.textDecoration,
                                        opacity: pageNumberElement.opacity,
                                        ...(
                                            pageNumberElement.position === "bottom-center" ? { bottom: `${pageNumberElement.margin}px`, left: "50%", transform: `translateX(-50%) rotate(${pageNumberElement.rotation}deg)` } :
                                            pageNumberElement.position === "bottom-right" ? { bottom: `${pageNumberElement.margin}px`, right: `${pageNumberElement.margin}px`, transform: `rotate(${pageNumberElement.rotation}deg)` } :
                                            pageNumberElement.position === "bottom-left" ? { bottom: `${pageNumberElement.margin}px`, left: `${pageNumberElement.margin}px`, transform: `rotate(${pageNumberElement.rotation}deg)` } :
                                            pageNumberElement.position === "top-center" ? { top: `${pageNumberElement.margin}px`, left: "50%", transform: `translateX(-50%) rotate(${pageNumberElement.rotation}deg)` } :
                                            pageNumberElement.position === "top-right" ? { top: `${pageNumberElement.margin}px`, right: `${pageNumberElement.margin}px`, transform: `rotate(${pageNumberElement.rotation}deg)` } :
                                            pageNumberElement.position === "top-left" ? { top: `${pageNumberElement.margin}px`, left: `${pageNumberElement.margin}px`, transform: `rotate(${pageNumberElement.rotation}deg)` } :
                                            { transform: `rotate(${pageNumberElement.rotation}deg)` }
                                        )
                                    }}
                                >
                                    {generatePageNumberText(i + 1)}
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
                            title: "Page Numbers Help",
                            message: "Customize page number format, position, and style using the properties panel.",
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