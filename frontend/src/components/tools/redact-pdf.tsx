"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { saveAs } from "file-saver";
import { FileUpload } from "../ui/file-upload";
import { Button } from "../ui/button";
import {
    Search,
    Eye,
    EyeOff,
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
    Shield,
    Lock,
    Unlock,
    Eraser,
    Highlighter,
    Type,
    Square,
    Circle,
    Triangle,
    PenTool,
    Copy,
    Plus,
    Check,
    ChevronDown,
    RotateCw,
    Palette,
    Trash2
} from "lucide-react";
import { pdfStrategyManager, getPdfJs } from "@/lib/services/pdf-service";
import { toast } from "@/lib/hooks/use-toast";
import { cn } from "@/lib/utils";

// Redaction element interface
interface RedactionElement {
    id: string;
    type: "text" | "area" | "highlight" | "freehand";
    x: number; // Percentage 0-100 relative to container
    y: number; // Percentage 0-100 relative to container
    width?: number; // Percentage
    height?: number; // Percentage
    page: number; // 1-based
    searchText?: string; // for text redaction
    useRegex?: boolean;
    caseSensitive?: boolean;
    color?: string;
    pathData?: { x: number, y: number }[]; // for freehand
    shapeType?: "rectangle" | "circle" | "ellipse"; // for area
    strokeWidth?: number;
    opacity?: number;
}

// History state for undo/redo
interface HistoryState {
    redactions: RedactionElement[];
    currentPage: number;
}

export function RedactPdfTool() {
    // File and PDF state
    const [file, setFile] = useState<File | null>(null);
    const [redactions, setRedactions] = useState<RedactionElement[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [numPages, setNumPages] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedRedactionId, setSelectedRedactionId] = useState<string | null>(null);
    const [zoom, setZoom] = useState(100);

    // Canvas refs
    const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
    const overlayCanvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Drawing state
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentPath, setCurrentPath] = useState<{ x: number, y: number }[]>([]);
    const [currentShape, setCurrentShape] = useState<{ startX: number, startY: number, endX: number, endY: number } | null>(null);

    // Properties state
    const [searchText, setSearchText] = useState("");
    const [useRegex, setUseRegex] = useState(false);
    const [caseSensitive, setCaseSensitive] = useState(false);
    const [redactionColor, setRedactionColor] = useState("#000000");
    const [activeTool, setActiveTool] = useState<"select" | "area" | "highlight" | "text" | "freehand">("select");
    const [strokeWidth, setStrokeWidth] = useState(3);
    const [opacity, setOpacity] = useState(1);

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
        "#000000", "#FF0000", "#0000FF", "#00FF00",
        "#FFFF00", "#FF00FF", "#00FFFF", "#888888"
    ];

    // Shape options
    const shapeOptions = [
        { id: "rectangle", icon: <Square className="h-4 w-4" />, label: "Rectangle" },
        { id: "circle", icon: <Circle className="h-4 w-4" />, label: "Circle" },
        { id: "ellipse", icon: <Circle className="h-4 w-4" />, label: "Ellipse" }
    ];

    const handleFileSelected = async (files: File[]) => {
        if (files.length > 0) {
            setFile(files[0]);
            setRedactions([]);
            setCurrentPage(1);

            // Load PDF to get page count
            const pdfjsLib = await getPdfJs();
            const arrayBuffer = await files[0].arrayBuffer();
            const pdf = await (pdfjsLib as any).getDocument(new Uint8Array(arrayBuffer)).promise;
            setNumPages(pdf.numPages);

            // Initialize canvas refs
            canvasRefs.current = Array(pdf.numPages).fill(null);
            overlayCanvasRefs.current = Array(pdf.numPages).fill(null);
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
                let overlayCanvas = overlayCanvasRefs.current[i - 1];

                if (!canvas || !overlayCanvas) continue;

                const context = canvas.getContext("2d")!;

                canvas.height = viewport.height;
                canvas.width = viewport.width;

                // Resize overlay canvas to match
                overlayCanvas.width = viewport.width;
                overlayCanvas.height = viewport.height;

                await page.render({
                    canvasContext: context,
                    viewport: viewport,
                    canvas: canvas,
                }).promise;
            }
        };

        renderAllPages();
    }, [file, zoom]);

    // Draw redactions on overlay canvases
    useEffect(() => {
        // Draw on each page's overlay canvas
        for (let i = 0; i < numPages; i++) {
            const overlayCanvas = overlayCanvasRefs.current[i];
            if (!overlayCanvas) continue;

            const ctx = overlayCanvas.getContext('2d');
            if (!ctx) continue;

            ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
            const width = overlayCanvas.width;
            const height = overlayCanvas.height;

            // Draw grid if enabled
            if (showGrid) {
                ctx.strokeStyle = "#e0e0e0";
                ctx.lineWidth = 0.5;

                for (let x = 0; x <= width; x += gridSize) {
                    ctx.beginPath();
                    ctx.moveTo(x, 0);
                    ctx.lineTo(x, height);
                    ctx.stroke();
                }

                for (let y = 0; y <= height; y += gridSize) {
                    ctx.beginPath();
                    ctx.moveTo(0, y);
                    ctx.lineTo(width, y);
                    ctx.stroke();
                }
            }

            // Draw redactions on this page
            redactions.filter(red => red.page === i + 1).forEach(red => {
                ctx.save();

                // Apply opacity
                ctx.globalAlpha = red.opacity || 1;

                if (red.type === 'area') {
                    ctx.fillStyle = red.color || '#000000';
                    const x = (red.x / 100) * width;
                    const y = (red.y / 100) * height;
                    const w = ((red.width || 0) / 100) * width;
                    const h = ((red.height || 0) / 100) * height;

                    if (red.shapeType === 'rectangle') {
                        ctx.fillRect(x, y, w, h);
                    } else if (red.shapeType === 'circle') {
                        ctx.beginPath();
                        const radius = Math.min(w, h) / 2;
                        ctx.arc(x + w / 2, y + h / 2, radius, 0, 2 * Math.PI);
                        ctx.fill();
                    } else if (red.shapeType === 'ellipse') {
                        ctx.beginPath();
                        ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, 2 * Math.PI);
                        ctx.fill();
                    }
                } else if (red.type === 'highlight') {
                    ctx.fillStyle = red.color || '#FFFF00';
                    ctx.globalAlpha = 0.3;
                    const x = (red.x / 100) * width;
                    const y = (red.y / 100) * height;
                    const w = ((red.width || 0) / 100) * width;
                    const h = ((red.height || 0) / 100) * height;
                    ctx.fillRect(x, y, w, h);
                } else if (red.type === 'freehand' && red.pathData) {
                    ctx.strokeStyle = red.color || '#000000';
                    ctx.lineWidth = red.strokeWidth || 2;
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';

                    if (red.pathData.length > 0) {
                        const startX = (red.pathData[0].x / 100) * width;
                        const startY = (red.pathData[0].y / 100) * height;
                        ctx.beginPath();
                        ctx.moveTo(startX, startY);

                        for (let i = 1; i < red.pathData.length; i++) {
                            const x = (red.pathData[i].x / 100) * width;
                            const y = (red.pathData[i].y / 100) * height;
                            ctx.lineTo(x, y);
                        }
                        ctx.stroke();
                    }
                }

                ctx.restore();
            });

            // Draw current path being drawn
            if (isDrawing && currentPath.length > 0) {
                ctx.beginPath();
                ctx.strokeStyle = redactionColor;
                ctx.lineWidth = strokeWidth;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.globalAlpha = opacity;

                const startX = (currentPath[0].x / 100) * width;
                const startY = (currentPath[0].y / 100) * height;
                ctx.moveTo(startX, startY);

                for (let i = 1; i < currentPath.length; i++) {
                    const x = (currentPath[i].x / 100) * width;
                    const y = (currentPath[i].y / 100) * height;
                    ctx.lineTo(x, y);
                }
                ctx.stroke();
            }

            // Draw current shape being drawn
            if (isDrawing && currentShape) {
                ctx.fillStyle = redactionColor;
                ctx.globalAlpha = opacity;

                const x = Math.min(currentShape.startX, currentShape.endX);
                const y = Math.min(currentShape.startY, currentShape.endY);
                const w = Math.abs(currentShape.endX - currentShape.startX);
                const h = Math.abs(currentShape.endY - currentShape.startY);

                if (activeTool === 'area') {
                    if (shapeOptions.find(opt => opt.id === 'rectangle')?.id) {
                        ctx.fillRect(x, y, w, h);
                    } else if (shapeOptions.find(opt => opt.id === 'circle')?.id) {
                        ctx.beginPath();
                        const radius = Math.min(w, h) / 2;
                        ctx.arc(x + w / 2, y + h / 2, radius, 0, 2 * Math.PI);
                        ctx.fill();
                    } else if (shapeOptions.find(opt => opt.id === 'ellipse')?.id) {
                        ctx.beginPath();
                        ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, 2 * Math.PI);
                        ctx.fill();
                    }
                } else if (activeTool === 'highlight') {
                    ctx.fillStyle = '#FFFF00';
                    ctx.globalAlpha = 0.3;
                    ctx.fillRect(x, y, w, h);
                }
            }
        }
    }, [redactions, numPages, isDrawing, currentPath, currentShape, redactionColor, strokeWidth, opacity, zoom, activeTool, showGrid, gridSize]);

    // Save current state to history
    const saveToHistory = useCallback(() => {
        const newState = {
            redactions: [...redactions],
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
    }, [redactions, currentPage, history, historyIndex]);

    // Undo
    const undo = useCallback(() => {
        if (historyIndex > 0) {
            const prevState = history[historyIndex - 1];
            setRedactions(prevState.redactions);
            setCurrentPage(prevState.currentPage);
            setHistoryIndex(historyIndex - 1);
        }
    }, [historyIndex, history]);

    // Redo
    const redo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            const nextState = history[historyIndex + 1];
            setRedactions(nextState.redactions);
            setCurrentPage(nextState.currentPage);
            setHistoryIndex(historyIndex + 1);
        }
    }, [historyIndex, history]);

    // Fit to page
    const fitToPage = () => {
        setZoom(100);
    };

    // Handle mouse down
    const handleMouseDown = (e: React.MouseEvent, pageIndex: number) => {
        const pageNum = pageIndex + 1;

        if (activeTool === 'select') return;

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

        setIsDrawing(true);

        if (activeTool === 'freehand') {
            setCurrentPath([{ x, y }]);
        } else if (activeTool === 'area' || activeTool === 'highlight') {
            setCurrentShape({ startX: x, startY: y, endX: x, endY: y });
        }
    };

    // Handle mouse move
    const handleMouseMove = (e: React.MouseEvent, pageIndex: number) => {
        if (!isDrawing) return;

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

        if (activeTool === 'freehand') {
            setCurrentPath(prev => [...prev, { x, y }]);
        } else if (currentShape) {
            setCurrentShape({ ...currentShape, endX: x, endY: y });
        }
    };

    // Handle mouse up
    const handleMouseUp = (pageIndex: number) => {
        if (!isDrawing) return;
        setIsDrawing(false);

        const pageNum = pageIndex + 1;

        if (activeTool === 'freehand') {
            const id = Math.random().toString(36).substr(2, 9);
            setRedactions(prev => [
                ...prev,
                {
                    id,
                    type: 'freehand',
                    x: currentPath.length > 0 ? currentPath[0].x : 0,
                    y: currentPath.length > 0 ? currentPath[0].y : 0,
                    pathData: currentPath,
                    page: pageNum,
                    color: redactionColor,
                    strokeWidth: strokeWidth,
                    opacity: opacity
                }
            ]);
            setCurrentPath([]);
        } else if (currentShape) {
            const id = Math.random().toString(36).substr(2, 9);
            const x = Math.min(currentShape.startX, currentShape.endX);
            const y = Math.min(currentShape.startY, currentShape.endY);
            const width = Math.abs(currentShape.endX - currentShape.startX);
            const height = Math.abs(currentShape.endY - currentShape.startY);

            if (width < 2 || height < 2) {
                setCurrentShape(null);
                return;
            }

            if (activeTool === 'area') {
                setRedactions(prev => [
                    ...prev,
                    {
                        id,
                        type: 'area',
                        shapeType: 'rectangle',
                        x,
                        y,
                        width,
                        height,
                        page: pageNum,
                        color: redactionColor,
                        opacity: opacity
                    }
                ]);
            } else if (activeTool === 'highlight') {
                setRedactions(prev => [
                    ...prev,
                    {
                        id,
                        type: 'highlight',
                        x,
                        y,
                        width,
                        height,
                        page: pageNum,
                        color: '#FFFF00',
                        opacity: 0.3
                    }
                ]);
            }

            setCurrentShape(null);
        }
    };

    // Search and redact text
    const searchAndRedact = async () => {
        if (!file || !searchText) return;
        setIsProcessing(true);

        try {
            // Find all occurrences of the text
            const pdfjsLib = await getPdfJs();
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await (pdfjsLib as any).getDocument(new Uint8Array(arrayBuffer)).promise;

            const newRedactions: RedactionElement[] = [];

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();

                // Combine text items into strings
                const pageText = textContent.items.map((item: any) => item.str).join(' ');

                // Find matches
                let matches: RegExpMatchArray[] = [];

                if (useRegex) {
                    try {
                        const regex = new RegExp(searchText, caseSensitive ? 'g' : 'gi');
                        matches = [...pageText.matchAll(regex)];
                    } catch (e) {
                        console.error("Invalid regex:", e);
                        toast.show({
                            title: "Invalid Regex",
                            message: "Please check your regex pattern.",
                            variant: "error",
                            position: "top-right",
                        });
                        setIsProcessing(false);
                        return;
                    }
                } else {
                    const flags = caseSensitive ? 'g' : 'gi';
                    const regex = new RegExp(searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
                    matches = [...pageText.matchAll(regex)];
                }

                // Create redaction elements for each match
                if (matches.length > 0) {
                    const viewport = page.getViewport({ scale: 1.0 });

                    for (const match of matches) {
                        if (match.index !== undefined) {
                            // Get the text item that contains this match
                            let textIndex = 0;
                            let currentPos = 0;

                            for (const item of textContent.items) {
                                const itemStr = item.str;
                                if (!itemStr) continue;

                                if (currentPos + itemStr.length > match.index) {
                                    // This item contains our match
                                    const matchStartInItem = match.index - currentPos;
                                    const matchEndInItem = matchStartInItem + match[0].length;

                                    // Get the transform matrix for this text item
                                    const transform = item.transform;
                                    const tx = transform[4];
                                    const ty = transform[5];

                                    // Calculate the position of the match within the item
                                    const itemWidth = item.width;
                                    const matchStartX = tx + (itemWidth * matchStartInItem / itemStr.length);
                                    const matchWidth = itemWidth * match[0].length / itemStr.length;

                                    // Create a redaction element
                                    newRedactions.push({
                                        id: Math.random().toString(36).substr(2, 9),
                                        type: 'area',
                                        shapeType: 'rectangle',
                                        x: (matchStartX / viewport.width) * 100,
                                        y: (ty / viewport.height) * 100,
                                        width: (matchWidth / viewport.width) * 100,
                                        height: (item.height / viewport.height) * 100,
                                        page: i,
                                        color: redactionColor,
                                        opacity: 1
                                    });

                                    break;
                                }

                                currentPos += itemStr.length;
                            }
                        }
                    }
                }
            }

            // Add the new redactions to the existing ones
            saveToHistory();
            setRedactions(prev => [...prev, ...newRedactions]);

            toast.show({
                title: "Search Complete",
                message: `Found and redacted ${newRedactions.length} occurrences of "${searchText}"`,
                variant: "success",
                position: "top-right",
            });
        } catch (error) {
            console.error("Error searching text:", error);
            toast.show({
                title: "Search Failed",
                message: "Failed to search for text. Please try again.",
                variant: "error",
                position: "top-right",
            });
        } finally {
            setIsProcessing(false);
        }
    };

    // Remove redaction
    const removeRedaction = (id: string) => {
        saveToHistory();
        setRedactions(prev => prev.filter(red => red.id !== id));
        if (selectedRedactionId === id) setSelectedRedactionId(null);
    };

    // Apply redactions to PDF
    const applyRedactions = async () => {
        if (!file) return;
        setIsProcessing(true);

        try {
            const result = await pdfStrategyManager.execute('redact', [file], {
                redactions
            });

            saveAs(result.blob, result.fileName || `redacted-${file.name}`);

            toast.show({
                title: "Success",
                message: "PDF redacted successfully!",
                variant: "success",
                position: "top-right",
            });
        } catch (error: any) {
            console.error("Error redacting PDF:", error);

            let errorMessage = "Failed to redact PDF. Please try again.";
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

                    {/* Redaction Tools */}
                    <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1 mr-2">
                        <Button
                            variant={activeTool === 'select' ? 'secondary' : 'ghost'}
                            size="icon"
                            onClick={() => setActiveTool('select')}
                            title="Select"
                            className={cn("h-8 w-8", activeTool === 'select' && "bg-white dark:bg-gray-600 shadow-sm text-blue-600 dark:text-blue-400")}
                        >
                            <Move className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={activeTool === 'area' ? 'secondary' : 'ghost'}
                            size="icon"
                            onClick={() => setActiveTool('area')}
                            title="Redact Area"
                            className={cn("h-8 w-8", activeTool === 'area' && "bg-white dark:bg-gray-600 shadow-sm text-blue-600 dark:text-blue-400")}
                        >
                            <Square className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={activeTool === 'highlight' ? 'secondary' : 'ghost'}
                            size="icon"
                            onClick={() => setActiveTool('highlight')}
                            title="Highlight"
                            className={cn("h-8 w-8", activeTool === 'highlight' && "bg-white dark:bg-gray-600 shadow-sm text-blue-600 dark:text-blue-400")}
                        >
                            <Highlighter className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={activeTool === 'freehand' ? 'secondary' : 'ghost'}
                            size="icon"
                            onClick={() => setActiveTool('freehand')}
                            title="Freehand Redaction"
                            className={cn("h-8 w-8", activeTool === 'freehand' && "bg-white dark:bg-gray-600 shadow-sm text-blue-600 dark:text-blue-400")}
                        >
                            <PenTool className="h-4 w-4" />
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
                            onClick={applyRedactions}
                            disabled={isProcessing || redactions.length === 0}
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
                    <h3 className="font-semibold text-gray-900 dark:text-white">Redaction Properties</h3>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setShowProperties(false)}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {/* Text Search */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Text Search</label>
                    <div className="space-y-2">
                        <input
                            type="text"
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-500 px-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            placeholder={useRegex ? "e.g. \\d{3}-\\d{2}-\\d{4}" : "e.g. Social Security Number, Email"}
                        />
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={searchAndRedact}
                                disabled={isProcessing || !searchText}
                                className="flex-1"
                            >
                                <Search className="h-4 w-4 mr-2" />
                                {isProcessing ? "Searching..." : "Find & Redact"}
                            </Button>
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={useRegex}
                                    onChange={(e) => setUseRegex(e.target.checked)}
                                    className="rounded border-gray-300"
                                />
                                Use Regex
                            </label>
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={caseSensitive}
                                    onChange={(e) => setCaseSensitive(e.target.checked)}
                                    className="rounded border-gray-300"
                                />
                                Case Sensitive
                            </label>
                        </div>
                    </div>
                </div>

                {/* Color Picker */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Redaction Color</label>
                    <div className="flex items-center gap-2 flex-wrap">
                        {colorPresets.map(c => (
                            <button
                                key={c}
                                className={cn("w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600", redactionColor === c && "ring-2 ring-offset-2 ring-blue-500")}
                                style={{ backgroundColor: c }}
                                onClick={() => setRedactionColor(c)}
                                title={c}
                            />
                        ))}
                        <input
                            type="color"
                            value={redactionColor}
                            onChange={(e) => setRedactionColor(e.target.value)}
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
                        onChange={(e) => setOpacity(Number(e.target.value))}
                        className="w-full"
                    />
                </div>

                {/* Stroke Width */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Stroke Width: {strokeWidth}px</label>
                    <input
                        type="range"
                        min="1"
                        max="20"
                        step="1"
                        value={strokeWidth}
                        onChange={(e) => setStrokeWidth(Number(e.target.value))}
                        className="w-full"
                    />
                </div>

                {/* Shape Options */}
                {activeTool === 'area' && (
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Shape</label>
                        <div className="grid grid-cols-3 gap-2">
                            {shapeOptions.map((shape) => (
                                <Button
                                    key={shape.id}
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => { }}
                                    className="h-10 flex items-center justify-center"
                                >
                                    {shape.icon}
                                    <span className="text-xs ml-1">{shape.label}</span>
                                </Button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Redaction Count */}
                <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                        <div>Total Redactions: {redactions.length}</div>
                        <div>Current Page: {redactions.filter(r => r.page === currentPage).length}</div>
                    </div>
                </div>
            </div>

            {/* Layers Panel */}
            <div className={cn(
                "fixed left-4 top-20 z-40 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 w-64 transition-all duration-300",
                "opacity-100 translate-x-0"
            )}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Redactions</h3>
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
                    {redactions.length === 0 ? (
                        <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                            No redactions added yet
                        </div>
                    ) : (
                        redactions.map((red) => (
                            <div
                                key={red.id}
                                className={cn(
                                    "flex items-center gap-2 p-2 rounded-md cursor-pointer",
                                    selectedRedactionId === red.id ? "bg-blue-100 dark:bg-blue-900" : "hover:bg-gray-100 dark:hover:bg-gray-700"
                                )}
                                onClick={() => setSelectedRedactionId(red.id)}
                            >
                                <div className="flex-1 flex items-center gap-2">
                                    {red.type === 'area' && <Square className="h-4 w-4 text-gray-600 dark:text-gray-400" />}
                                    {red.type === 'highlight' && <Highlighter className="h-4 w-4 text-gray-600 dark:text-gray-400" />}
                                    {red.type === 'freehand' && <PenTool className="h-4 w-4 text-gray-600 dark:text-gray-400" />}
                                    <span className="text-sm truncate">
                                        {red.type === 'area' ? `Area on Page ${red.page}` :
                                            red.type === 'highlight' ? `Highlight on Page ${red.page}` :
                                                `Freehand on Page ${red.page}`}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeRedaction(red.id);
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
                            onMouseDown={(e) => handleMouseDown(e, i)}
                            onMouseMove={(e) => handleMouseMove(e, i)}
                            onMouseUp={() => handleMouseUp(i)}
                            onMouseLeave={() => handleMouseUp(i)}
                        >
                            <canvas
                                ref={el => { canvasRefs.current[i] = el; }}
                                className="max-w-none block bg-white"
                            />
                            <canvas
                                ref={el => { overlayCanvasRefs.current[i] = el; }}
                                className="absolute inset-0 pointer-events-none"
                            />

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
                            title: "Redact PDF Help",
                            message: "Use tools to redact areas or search for text to automatically redact. Redactions permanently remove sensitive information.",
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