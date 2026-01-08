"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { saveAs } from "file-saver";
import FileUploadHero from "../ui/file-upload-hero"; // Hero uploader (big CTA, full-page drag overlay)
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
    Trash2,
    Layout,
    Lightbulb
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
    overlayType?: "color" | "blur"; // New property for redaction style
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

    // Refs for smooth drag handling (avoid re-renders during drag)
    const dragStartRef = useRef<{ x: number, y: number } | null>(null);
    const initialRedactionRef = useRef<Partial<RedactionElement> | null>(null);
    const rafIdRef = useRef<number | null>(null);
    const isDraggingRef = useRef(false);

    // Drawing state
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentPath, setCurrentPath] = useState<{ x: number, y: number }[]>([]);
    const [currentShape, setCurrentShape] = useState<{ startX: number, startY: number, endX: number, endY: number } | null>(null);

    // Properties state
    const [searchText, setSearchText] = useState("");
    const [caseSensitive, setCaseSensitive] = useState(true);
    const [redactionColor, setRedactionColor] = useState("#000000");
    const [activeTool, setActiveTool] = useState<"select" | "area" | "highlight" | "text" | "freehand">("area");
    const [redactionType, setRedactionType] = useState<"color" | "blur">("color");
    const [resizeHandle, setResizeHandle] = useState<string | null>(null);
    const [dragStart, setDragStart] = useState<{ x: number, y: number } | null>(null);
    const [initialRedactionState, setInitialRedactionState] = useState<Partial<RedactionElement> | null>(null);
    const [strokeWidth, setStrokeWidth] = useState(3);
    const [opacity, setOpacity] = useState(1);

    // UI state
    const [showToolbar, setShowToolbar] = useState(true);
    const [showProperties, setShowProperties] = useState(true);
    const [darkMode, setDarkMode] = useState(false);
    const [viewMode, setViewMode] = useState<"desktop" | "tablet" | "mobile" | "file">("desktop");
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

    // Track render tasks to cancel them if needed (prevents race conditions)
    const renderTasksRefs = useRef<any[]>([]);

    useEffect(() => {
        if (!file) return;

        // Reset tasks array on file change
        renderTasksRefs.current = new Array(numPages).fill(null);

        const renderAllPages = async () => {
            if (viewMode === 'file') return; // Optimized: No need to render invisible canvases

            // Small delay to ensure DOM is ready and refs are attached, especially after view switch
            await new Promise(resolve => requestAnimationFrame(resolve));

            const pdfjsLib = await getPdfJs();
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await (pdfjsLib as any).getDocument(new Uint8Array(arrayBuffer)).promise;

            // Apply zoom
            const scale = zoom / 100;

            // Render each page
            for (let i = 1; i <= pdf.numPages; i++) {
                // Cancel previous render task for this page if it exists
                if (renderTasksRefs.current[i - 1]) {
                    renderTasksRefs.current[i - 1].cancel();
                }

                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale });

                // Get or create canvas
                let canvas = canvasRefs.current[i - 1];
                let overlayCanvas = overlayCanvasRefs.current[i - 1];

                if (!canvas || !overlayCanvas) {
                    // Safety check: try finding it by ID or retry next frame? 
                    // Just skipping for now, but this implies refs aren't ready yet.
                    console.warn(`Canvas for page ${i} not found`);
                    continue;
                }

                const context = canvas.getContext("2d")!;

                // Clear canvas before drawing
                context.clearRect(0, 0, canvas.width, canvas.height);

                canvas.height = viewport.height;
                canvas.width = viewport.width;

                // Resize overlay canvas to match
                overlayCanvas.width = viewport.width;
                overlayCanvas.height = viewport.height;

                const renderTask = page.render({
                    canvasContext: context,
                    viewport: viewport,
                    canvas: canvas,
                });

                // Store task to cancel later
                renderTasksRefs.current[i - 1] = renderTask;

                try {
                    await renderTask.promise;
                } catch (error: any) {
                    if (error.name !== 'RenderingCancelledException') {
                        console.error(`Error rendering page ${i}:`, error);
                    }
                }
            }
        };

        renderAllPages();

        // Cleanup function to cancel tasks on unmount or re-effect
        return () => {
            renderTasksRefs.current.forEach(task => {
                if (task) task.cancel();
            });
        };
    }, [file, zoom, viewMode, numPages]);

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
                    const x = (red.x / 100) * width;
                    const y = (red.y / 100) * height;
                    const w = ((red.width || 0) / 100) * width;
                    const h = ((red.height || 0) / 100) * height;

                    if (red.overlayType === 'blur') {
                        const baseCanvas = canvasRefs.current[i];
                        if (baseCanvas) {
                            try {
                                ctx.filter = 'blur(4px)';
                                ctx.drawImage(baseCanvas, x, y, w, h, x, y, w, h);
                                ctx.filter = 'none';
                                ctx.fillStyle = 'rgba(0,0,0,0.1)';
                                ctx.fillRect(x, y, w, h);
                            } catch (e) {
                                ctx.fillStyle = '#666666';
                                ctx.fillRect(x, y, w, h);
                            }
                        } else {
                            ctx.fillStyle = '#666666';
                            ctx.fillRect(x, y, w, h);
                        }
                    } else {
                        ctx.fillStyle = red.color || '#000000';
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

            // Draw current shape being drawn (convert from percentage to pixels)
            if (isDrawing && currentShape) {
                ctx.fillStyle = redactionColor;
                ctx.globalAlpha = opacity;

                // Convert percentage coordinates to pixel coordinates
                const startX = (currentShape.startX / 100) * width;
                const startY = (currentShape.startY / 100) * height;
                const endX = (currentShape.endX / 100) * width;
                const endY = (currentShape.endY / 100) * height;

                const x = Math.min(startX, endX);
                const y = Math.min(startY, endY);
                const w = Math.abs(endX - startX);
                const h = Math.abs(endY - startY);

                if (activeTool === 'area') {
                    // Draw with semi-transparent overlay for preview
                    ctx.globalAlpha = 0.7;
                    ctx.fillRect(x, y, w, h);
                    // Add border for visibility
                    ctx.strokeStyle = '#000';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(x, y, w, h);
                } else if (activeTool === 'highlight') {
                    ctx.fillStyle = '#FFFF00';
                    ctx.globalAlpha = 0.3;
                    ctx.fillRect(x, y, w, h);
                }
            }
        }
    }, [redactions, numPages, isDrawing, currentPath, currentShape, redactionColor, strokeWidth, opacity, zoom, activeTool, showGrid, gridSize, viewMode]);

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
        const canvas = overlayCanvasRefs.current[pageIndex];
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        let x = ((e.clientX - rect.left) / rect.width) * 100;
        let y = ((e.clientY - rect.top) / rect.height) * 100;

        if (activeTool === 'select') {
            // Check if hitting a redaction on this page
            const clickedRedaction = [...redactions].reverse().find(r =>
                r.page === pageNum &&
                x >= r.x && x <= r.x + (r.width || 0) &&
                y >= r.y && y <= r.y + (r.height || 0)
            );

            if (clickedRedaction) {
                setSelectedRedactionId(clickedRedaction.id);
                // Use refs for drag - prevents re-renders during drag
                isDraggingRef.current = true;
                dragStartRef.current = { x, y };
                initialRedactionRef.current = { ...clickedRedaction };
            } else {
                setSelectedRedactionId(null);
            }
            return;
        }

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

    // Handle mouse move with RAF throttling
    const handleMouseMove = (e: React.MouseEvent, pageIndex: number) => {
        const canvas = overlayCanvasRefs.current[pageIndex];
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        // Select tool drag - use refs to avoid re-renders on every pixel
        if (activeTool === 'select' && isDraggingRef.current && selectedRedactionId && dragStartRef.current && initialRedactionRef.current) {
            // Cancel any pending RAF
            if (rafIdRef.current) {
                cancelAnimationFrame(rafIdRef.current);
            }

            // Schedule update on next animation frame
            rafIdRef.current = requestAnimationFrame(() => {
                const dx = x - dragStartRef.current!.x;
                const dy = y - dragStartRef.current!.y;

                setRedactions(prev => prev.map(r => {
                    if (r.id === selectedRedactionId) {
                        return {
                            ...r,
                            x: Math.max(0, Math.min(100 - (r.width || 0), (initialRedactionRef.current!.x || 0) + dx)),
                            y: Math.max(0, Math.min(100 - (r.height || 0), (initialRedactionRef.current!.y || 0) + dy))
                        };
                    }
                    return r;
                }));
            });
            return;
        }

        if (!isDrawing) return;

        // Snap to grid if enabled
        let finalX = x;
        let finalY = y;
        if (snapToGrid) {
            finalX = Math.round(x / gridSize) * gridSize;
            finalY = Math.round(y / gridSize) * gridSize;
        }

        if (activeTool === 'freehand') {
            setCurrentPath(prev => [...prev, { x: finalX, y: finalY }]);
        } else if (currentShape) {
            setCurrentShape({ ...currentShape, endX: finalX, endY: finalY });
        }
    };

    // Handle mouse up
    const handleMouseUp = (pageIndex: number) => {
        // Reset drag refs first
        if (isDraggingRef.current) {
            isDraggingRef.current = false;
            dragStartRef.current = null;
            initialRedactionRef.current = null;
            if (rafIdRef.current) {
                cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
            }
            return; // Drag complete, don't create new redaction
        }

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
                        overlayType: redactionType,
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

                // Filter out empty items to ensure sync between pageText and loop
                const validItems = textContent.items.filter((item: any) => item.str.length > 0);

                // Combine text items into strings
                const pageText = validItems.map((item: any) => item.str).join(' ');

                // Find matches
                let matches: RegExpMatchArray[] = [];

                const flags = caseSensitive ? 'g' : 'gi';
                const regex = new RegExp(searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
                matches = [...pageText.matchAll(regex)];

                // Create redaction elements for each match
                if (matches.length > 0) {
                    const viewport = page.getViewport({ scale: 1.0 });

                    for (const match of matches) {
                        if (match.index !== undefined) {
                            // Get the text item that contains this match
                            let textIndex = 0;
                            let currentPos = 0;

                            for (const item of validItems) {
                                const itemStr = item.str;
                                // Empty check not strictly needed due to filter, but safe to keep or remove. 
                                // Removing since validItems guarantees length > 0

                                // Verify match is actually within this item (handling the case where match might overlap space)
                                // But since we split by space, finding "Annual" which has no space means it must be fully inside an item
                                // OR split across items if PDF broke it up.
                                // For now, assume simple case where word is in one item or we just take the chunk in this item.

                                // If matchStartInItem is negative, it means the match started in a previous item and continues here (not handled yet by this simple logic)
                                // Since we reset search for each item loop? No, we iterate items and check if SINGLE match falls in it.
                                // Actually, if match.index < currentPos, we already passed it? No.
                                // match.index is absolute. currentPos is absolute start of this item.

                                if (match.index >= currentPos && match.index < currentPos + itemStr.length) {
                                    // This item definitely contains the START of the match

                                    // Get transform ... (keep existing transform logic)
                                    const transform = item.transform;
                                    const tx = transform[4];
                                    const ty = transform[5];

                                    // Calculate height from transform if item.height is not reliable
                                    const pdfHeight = item.height || Math.abs(transform[3]);
                                    const pdfWidth = item.width;

                                    // Calculate the position of the match within the item
                                    const matchStartInItem = match.index - currentPos;

                                    // Length of the match part that is inside this item
                                    // (Clamping to item length in case it spans across items - though basic logic assumes 1 item)
                                    const visibleMatchLength = Math.min(match[0].length, itemStr.length - matchStartInItem);

                                    // Assumption: characters are roughly equally spaced (approximation)
                                    // Ideally we would sum character widths if available.
                                    const charWidthApprox = pdfWidth / itemStr.length;
                                    const matchStartX = tx + (charWidthApprox * matchStartInItem);
                                    const matchWidth = charWidthApprox * visibleMatchLength;

                                    // Calculate PDF coordinates for the match rectangle
                                    const pdfBoxX = matchStartX;
                                    const pdfBoxY = ty;
                                    const pdfBoxW = matchWidth;
                                    const pdfBoxH = pdfHeight;

                                    // Convert PDF coordinates to Viewport (Screen) coordinates
                                    let bl = [0, 0];
                                    let tr = [0, 0];

                                    if (viewport.convertToViewportPoint) {
                                        bl = viewport.convertToViewportPoint(pdfBoxX, pdfBoxY);
                                        tr = viewport.convertToViewportPoint(pdfBoxX + pdfBoxW, pdfBoxY + pdfBoxH);
                                    } else {
                                        const vTransform = viewport.transform;
                                        bl = [
                                            pdfBoxX * vTransform[0] + pdfBoxY * vTransform[2] + vTransform[4],
                                            pdfBoxX * vTransform[1] + pdfBoxY * vTransform[3] + vTransform[5]
                                        ];
                                        tr = [
                                            (pdfBoxX + pdfBoxW) * vTransform[0] + (pdfBoxY + pdfBoxH) * vTransform[2] + vTransform[4],
                                            (pdfBoxX + pdfBoxW) * vTransform[1] + (pdfBoxY + pdfBoxH) * vTransform[3] + vTransform[5]
                                        ];
                                    }

                                    const screenX = Math.min(bl[0], tr[0]);
                                    const screenY = Math.min(bl[1], tr[1]);
                                    const screenW = Math.abs(bl[0] - tr[0]);
                                    const screenH = Math.abs(bl[1] - tr[1]);

                                    newRedactions.push({
                                        id: Math.random().toString(36).substr(2, 9),
                                        type: 'area',
                                        shapeType: 'rectangle',
                                        x: (screenX / viewport.width) * 100,
                                        y: (screenY / viewport.height) * 100,
                                        width: (screenW / viewport.width) * 100,
                                        height: (screenH * 1.5 / viewport.height) * 100,
                                        page: i,
                                        color: redactionColor,
                                        overlayType: redactionType,
                                        opacity: 1
                                    });

                                    // Break only if we assume one match per item? 
                                    // No, because we are looping over matches.
                                    // Once we found the item for this match, we are done with THIS match.
                                    break;
                                }

                                // IMPORTANT: Account for the space added during join(' ')
                                // If itemStr is empty, we still added a space? 
                                // join(' ') adds space BETWEEN items.
                                // So currentPos + itemStr.length is end of word.
                                // Next word starts at currentPos + itemStr.length + 1
                                currentPos += itemStr.length + 1;
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

    // Apply redactions to PDF using pdf-lib
    const applyRedactions = async () => {
        if (!file) return;

        if (redactions.length === 0) {
            toast.show({
                title: "No Redactions Found",
                message: "Please draw at least one redaction box on the document before processing.",
                variant: "error",
                position: "top-right",
            });
            return;
        }

        setIsProcessing(true);

        try {
            // Dynamic import pdf-lib
            const { PDFDocument, rgb } = await import('pdf-lib');

            // Load the PDF
            const arrayBuffer = await file.arrayBuffer();
            const pdfDoc = await PDFDocument.load(arrayBuffer);
            const pages = pdfDoc.getPages();

            // Apply each redaction
            for (const red of redactions) {
                if (red.type === 'freehand') continue; // Skip freehand for now

                const pageIndex = red.page - 1;
                if (pageIndex < 0 || pageIndex >= pages.length) continue;

                const page = pages[pageIndex];
                const { width: pageWidth, height: pageHeight } = page.getSize();

                // Convert percentage coordinates to PDF coordinates
                // Note: PDF coordinate system has origin at bottom-left
                const x = (red.x / 100) * pageWidth;
                const y = pageHeight - ((red.y / 100) * pageHeight) - ((red.height || 0) / 100) * pageHeight;
                const w = ((red.width || 0) / 100) * pageWidth;
                const h = ((red.height || 0) / 100) * pageHeight;

                // Parse color or default to black
                let color = rgb(0, 0, 0);
                if (red.color && red.color !== '#000000') {
                    const hex = red.color.replace('#', '');
                    const r = parseInt(hex.substring(0, 2), 16) / 255;
                    const g = parseInt(hex.substring(2, 4), 16) / 255;
                    const b = parseInt(hex.substring(4, 6), 16) / 255;
                    color = rgb(r, g, b);
                }

                // Draw the redaction rectangle
                page.drawRectangle({
                    x,
                    y,
                    width: w,
                    height: h,
                    color,
                });
            }

            // Save and download
            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
            saveAs(blob, `redacted-${file.name}`);

            toast.show({
                title: "Success",
                message: `PDF redacted with ${redactions.length} redaction(s)!`,
                variant: "success",
                position: "top-right",
            });
        } catch (error: any) {
            console.error("Error redacting PDF:", error);
            toast.show({
                title: "Operation Failed",
                message: "Failed to process PDF: " + (error.message || "Unknown error"),
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
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)]">
                <FileUploadHero
                    title="Redact PDF"
                    onFilesSelected={handleFileSelected}
                    maxFiles={1}
                    accept={{ "application/pdf": [".pdf"] }}
                />
            </div>
        );
    }

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
        return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    };

    return (
        <div className={cn(
            "bg-[#f6f7f8] min-h-screen pb-8",
            darkMode ? "dark" : ""
        )}>
            <div className="max-w-[1800px] mx-auto px-4 py-4">
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Left Column - Main Content */}
                    <div className="flex-1 lg:max-w-[calc(100%-448px)]">
                        {/* Floating Top Bar */}
                        <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-[#e2e8f0] shadow-sm p-4 mb-6 sticky top-4 z-30">
                            <div className="flex items-center justify-between flex-wrap gap-4">
                                {/* View Toggle */}
                                <div className="bg-[#f0f2f4] rounded-lg p-1 flex">
                                    <button
                                        onClick={() => setViewMode("file")}
                                        className={cn(
                                            "px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2",
                                            viewMode === "file" ? "bg-white text-[#136dec] shadow" : "text-[#617289]"
                                        )}
                                    >
                                        <FileText className="h-4 w-4" />
                                        File View
                                    </button>
                                    <button
                                        onClick={() => setViewMode("desktop")}
                                        className={cn(
                                            "px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2",
                                            viewMode !== "file" ? "bg-white text-[#136dec] shadow" : "text-[#617289]"
                                        )}
                                    >
                                        <Layers className="h-4 w-4" />
                                        Page View
                                    </button>
                                </div>

                                {/* Search Bar */}
                                <div className="flex-1 flex items-center justify-center gap-2 max-w-md mx-auto min-w-[240px]">
                                    <div className="relative w-full">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#617289]" />
                                        <input
                                            type="text"
                                            value={searchText}
                                            onChange={(e) => setSearchText(e.target.value)}
                                            placeholder="Search text to redact..."
                                            className="w-full pl-9 pr-4 py-2 bg-[#f0f2f4] border-none rounded-lg text-sm text-[#111418] placeholder:text-[#617289] focus:outline-none focus:ring-2 focus:ring-[#4383BF]/20 transition-all font-medium"
                                            onKeyDown={(e) => e.key === 'Enter' && searchAndRedact()}
                                        />
                                    </div>
                                    <Button
                                        onClick={searchAndRedact}
                                        disabled={!searchText || isProcessing}
                                        size="sm"
                                        className="bg-[#4383BF] hover:bg-[#3A74A8] text-white font-bold px-4 h-9 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                                    >
                                        Redact
                                    </Button>
                                </div>

                                {/* Clear All Button */}
                                <Button
                                    variant="ghost"
                                    onClick={() => {
                                        setRedactions([]);
                                        setHistory([]);
                                        setHistoryIndex(-1);
                                    }}
                                    className="text-[#617289] hover:text-red-600 hover:bg-red-50"
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Clear All
                                </Button>
                            </div>
                        </div>

                        {/* Main Content Area */}
                        <div className="relative transition-all flex justify-center min-h-[500px]">
                            {viewMode === "file" ? (
                                <div className="w-full">
                                    <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden p-6 flex items-start gap-6">
                                        <div className="h-24 w-24 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <FileText className="h-10 w-10 text-red-500" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-xl font-bold text-[#111418] mb-2">{file.name}</h3>
                                            <div className="flex flex-col gap-1 text-sm text-[#617289]">
                                                <p>Size: <span className="font-medium text-[#111418]">{formatFileSize(file.size)}</span></p>
                                                <p>Pages: <span className="font-medium text-[#111418]">{numPages}</span></p>
                                                <p>Redactions: <span className="font-medium text-[#111418]">{redactions.length}</span></p>
                                            </div>
                                        </div>
                                        <Button
                                            variant="outline"
                                            onClick={() => setFile(null)}
                                            className="text-red-600 hover:bg-red-50 border-red-200"
                                        >
                                            Remove File
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center pb-20 w-full max-w-5xl">
                                    <div ref={containerRef} className="relative w-full flex flex-col items-center gap-8">
                                        {Array.from({ length: numPages }).map((_, index) => (
                                            <div key={index} className="relative group shadow-lg">
                                                <canvas
                                                    ref={(el) => { canvasRefs.current[index] = el; }}
                                                    className="block bg-white"
                                                />
                                                <canvas
                                                    ref={(el) => { overlayCanvasRefs.current[index] = el; }}
                                                    className={cn(
                                                        "absolute top-0 left-0",
                                                        activeTool === 'select' ? 'cursor-default' : 'cursor-crosshair'
                                                    )}
                                                    style={{ cursor: isDraggingRef.current ? 'grabbing' : undefined }}
                                                    onMouseDown={(e) => handleMouseDown(e, index)}
                                                    onMouseMove={(e) => handleMouseMove(e, index)}
                                                    onMouseUp={() => handleMouseUp(index)}
                                                    onMouseLeave={() => handleMouseUp(index)}
                                                />

                                                {/* Redaction Overlays */}
                                                {redactions.filter(r => r.page === index + 1).map(red => (
                                                    <div
                                                        key={red.id}
                                                        className={cn(
                                                            "absolute border-2 border-transparent hover:border-blue-500 cursor-pointer group/redaction transition-colors pointer-events-none",
                                                            selectedRedactionId === red.id ? "border-blue-500" : ""
                                                        )}
                                                        style={{
                                                            left: `${red.x}%`,
                                                            top: `${red.y}%`,
                                                            width: `${red.width}%`,
                                                            height: `${red.height}%`,
                                                            display: red.type === 'freehand' ? 'none' : 'block'
                                                        }}
                                                    >
                                                        <button
                                                            className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover/redaction:opacity-100 transition-opacity shadow-md z-20 pointer-events-auto"
                                                            onMouseDown={(e) => e.stopPropagation()}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                removeRedaction(red.id);
                                                            }}
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                ))}

                                                {/* Page Number */}
                                                <div className="absolute top-4 left-4 bg-black/50 text-white px-2 py-1 rounded text-xs font-medium backdrop-blur-sm">
                                                    Page {index + 1}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Floating Zoom Controls */}
                                    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-sm border border-gray-200 shadow-xl rounded-full px-4 py-2 flex items-center gap-4 z-40">
                                        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" onClick={() => setZoom(Math.max(25, zoom - 25))}>
                                            <ZoomOut className="h-4 w-4" />
                                        </Button>
                                        <span className="text-sm font-semibold w-12 text-center">{zoom}%</span>
                                        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" onClick={() => setZoom(Math.min(200, zoom + 25))}>
                                            <ZoomIn className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Sidebar - Floating Card */}
                    <div className="lg:w-[424px] lg:fixed lg:right-4 lg:top-24 z-20">
                        <div className="bg-white rounded-3xl border border-[#e2e8f0] p-6 shadow-2xl h-[calc(100vh-140px)] min-h-[600px] flex flex-col justify-between">
                            <div className="space-y-6 overflow-y-auto pr-1">
                                {/* Header */}
                                <div className="flex items-center gap-2 pb-2 border-b border-[#e2e8f0]">
                                    <Layout className="h-5 w-5 text-[#111418]" />
                                    <h2 className="font-bold text-lg text-[#111418]">Download Options</h2>
                                </div>

                                {/* Summary Section */}
                                <div className="space-y-3">
                                    <h3 className="text-[11px] font-bold text-[#889096] uppercase tracking-wider">SUMMARY</h3>
                                    <div className="bg-[#f8f9fa] rounded-2xl p-5 space-y-3">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">File Name</span>
                                            <span className="font-medium text-[#111418] truncate max-w-[200px]" title={file.name}>{file.name}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Total Pages</span>
                                            <span className="font-medium text-[#111418]">{numPages}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Pages with Redactions</span>
                                            <span className="font-medium text-[#111418]">{new Set(redactions.map(r => r.page)).size}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Redactions Count</span>
                                            <span className="font-medium text-[#111418]">{redactions.length}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Tip Box */}
                                <div className="bg-[#f8f9fa] rounded-2xl p-4 flex gap-3">
                                    <div className="mt-0.5">
                                        <div className="w-5 h-5 flex items-center justify-center">
                                            <Lightbulb className="h-4 w-4 text-[#fbbf24] fill-current" />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-[13px] font-bold text-[#4785ff] uppercase tracking-wide">TIP</h4>
                                        <p className="text-[13px] text-[#64748b] leading-tight">
                                            Click and drag to draw redaction boxes. Use the Select tool to move or resize them.
                                        </p>
                                    </div>
                                </div>

                                {/* Fill Style */}
                                <div className="space-y-3">
                                    <h3 className="text-[11px] font-bold text-[#889096] uppercase tracking-wider">FILL STYLE</h3>
                                    <div className="bg-[#f8f9fa] p-1.5 rounded-xl flex gap-1">
                                        <button
                                            onClick={() => setRedactionType('color')}
                                            className={cn(
                                                "flex-1 flex items-center justify-center gap-2 py-2 px-2 rounded-lg text-[11px] font-bold transition-all",
                                                redactionType === 'color'
                                                    ? "bg-white text-[#111418] shadow-sm ring-1 ring-black/5"
                                                    : "text-[#617289] hover:text-[#111418] hover:bg-black/5"
                                            )}
                                        >
                                            <div className="w-3 h-3 rounded-full bg-black" />
                                            Solid Color
                                        </button>
                                        <button
                                            onClick={() => setRedactionType('blur')}
                                            className={cn(
                                                "flex-1 flex items-center justify-center gap-2 py-2 px-2 rounded-lg text-[11px] font-bold transition-all",
                                                redactionType === 'blur'
                                                    ? "bg-white text-[#111418] shadow-sm ring-1 ring-black/5"
                                                    : "text-[#617289] hover:text-[#111418] hover:bg-black/5"
                                            )}
                                        >
                                            <Grid3x3 className="h-3 w-3" />
                                            Blur / Pixelate
                                        </button>
                                    </div>
                                </div>

                                {/* Manual Tools - Simplified for Context */}
                                <div className="space-y-3">
                                    <h3 className="text-[11px] font-bold text-[#889096] uppercase tracking-wider">REDACTION TOOLS</h3>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => setActiveTool('select')}
                                            className={cn(
                                                "flex items-center justify-center gap-2 p-3 rounded-xl border transition-all",
                                                activeTool === 'select'
                                                    ? "bg-[#4383BF]/5 border-[#4383BF] text-[#4383BF]"
                                                    : "border-[#e2e8f0] text-[#617289] hover:border-[#cbd5e1] hover:bg-gray-50"
                                            )}
                                        >
                                            <Move className="h-4 w-4" />
                                            <span className="text-xs font-bold">Select</span>
                                        </button>
                                        <button
                                            onClick={() => setActiveTool('area')}
                                            className={cn(
                                                "flex items-center justify-center gap-2 p-3 rounded-xl border transition-all",
                                                activeTool === 'area'
                                                    ? "bg-[#4383BF]/5 border-[#4383BF] text-[#4383BF]"
                                                    : "border-[#e2e8f0] text-[#617289] hover:border-[#cbd5e1] hover:bg-gray-50"
                                            )}
                                        >
                                            <Square className="h-4 w-4" />
                                            <span className="text-xs font-bold">Draw Box</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3 pt-6 mt-auto">
                                <Button
                                    onClick={applyRedactions}
                                    disabled={isProcessing}
                                    className="w-full h-[52px] text-[15px] font-bold bg-[#4383BF] hover:bg-[#3A74A8] text-white shadow-lg shadow-blue-500/10 rounded-xl disabled:opacity-70 transition-all border-none"
                                >
                                    {isProcessing ? (
                                        <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>Processing...</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <Shield className="h-5 w-5" />
                                            <span>Redact & Download ({redactions.length})</span>
                                        </div>
                                    )}
                                </Button>

                                <Button
                                    variant="ghost"
                                    onClick={() => saveAs(file, file.name)}
                                    className="w-full h-[52px] text-[15px] font-bold text-[#4b5563] bg-[#f3f5f9] hover:bg-[#e5e7eb] hover:text-[#111418] rounded-xl border-none"
                                >
                                    <Download className="h-4 w-4 mr-2" />
                                    Download Original
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
}