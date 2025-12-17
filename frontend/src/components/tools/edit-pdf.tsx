"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
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
    Pencil, 
    Square, 
    Circle, 
    MousePointer2, 
    Hand, 
    Minus, 
    Plus, 
    Undo, 
    Redo,
    Download,
    X,
    Maximize,
    Highlighter,
    Bold,
    Italic,
    Underline,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Layers,
    Lock,
    Unlock,
    Copy,
    Grid3x3,
    ZoomIn,
    ZoomOut,
    RotateCw,
    FileText,
    Palette,
    Move,
    Search,
    Check,
    ChevronDown,
    MoreVertical,
    Settings,
    HelpCircle,
    Sparkles,
    Eraser,
    PenTool,
    TypeOutline,
    RectangleHorizontal,
    CircleDot,
    ArrowRight,
    Triangle,
    Star,
    Heart,
    MessageSquare,
    Sticker,
    Scan,
    FileImage,
    FilePlus,
    FolderOpen,
    Share2,
    Upload,
    History,
    Command,
    Sliders,
    Sun,
    Moon,
    Monitor,
    Smartphone,
    Tablet
} from "lucide-react";
import { pdfStrategyManager, getPdfJs } from "@/lib/services/pdf-service";
import { toast } from "@/lib/hooks/use-toast";
import { cn } from "@/lib/utils";

// Google Fonts API key should be provided via environment variable NEXT_PUBLIC_GOOGLE_FONTS_API_KEY
const GOOGLE_FONTS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_FONTS_API_KEY || undefined;

// List of popular Google Fonts
const POPULAR_FONTS = [
    "Roboto", "Open Sans", "Lato", "Montserrat", "Oswald", 
    "Raleway", "Poppins", "Roboto Slab", "Nunito", "Ubuntu",
    "Playfair Display", "Merriweather", "PT Sans", "Roboto Mono", "Source Sans Pro",
    "Dancing Script", "Bebas Neue", "Righteous", "Bangers", "Pacifico",
    "Caveat", "Kalam", "Permanent Marker", "Shadows Into Light", "Lobster",
    "Amatic SC", "Indie Flower", "Gloria Hallelujah", "Satisfy", "Caveat Brush"
];

// Full list of Google Fonts categories
const FONT_CATEGORIES = [
    "serif", "sans-serif", "display", "handwriting", "monospace"
];

// Editor element interface
interface EditorElement {
    id: string;
    type: "text" | "image" | "path" | "shape" | "arrow" | "line" | "stamp";
    x: number; // Percentage 0-100 relative to container
    y: number; // Percentage 0-100 relative to container
    page: number; // 1-based
    content?: string; // for text
    imageBytes?: ArrayBuffer; // for image
    imageType?: "png" | "jpg" | "svg";
    fontSize?: number;
    color?: string;
    width?: number; // Percentage
    height?: number; // Percentage (aspect ratio maintained)
    pathData?: { x: number, y: number }[]; // for freehand
    shapeType?: "rectangle" | "circle" | "triangle" | "star" | "heart"; // for shape
    strokeWidth?: number;
    opacity?: number;
    fontFamily?: string;
    fontWeight?: string;
    fontStyle?: string;
    textDecoration?: string;
    textAlign?: "left" | "center" | "right";
    rotation?: number;
    locked?: boolean;
    zIndex?: number;
    points?: { x: number, y: number }[]; // for arrow, line
}

// History state for undo/redo
interface HistoryState {
    elements: EditorElement[];
    currentPage: number;
}

// Google Font interface
interface GoogleFont {
    family: string;
    category: string;
    variants: string[];
}

// PDF Editor Component
export function EditPdfTool() {
    // File and PDF state
    const [file, setFile] = useState<File | null>(null);
    const [elements, setElements] = useState<EditorElement[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [numPages, setNumPages] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
    const [activeTool, setActiveTool] = useState<"select" | "hand" | "draw" | "highlight" | "rect" | "circle" | "triangle" | "star" | "heart" | "arrow" | "line" | "text" | "image" | "stamp" | "eraser">("select");
    const [zoom, setZoom] = useState(100);
    
    // Canvas refs
    const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
    const overlayCanvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);
    const renderTaskRefs = useRef<any[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    
    // Drawing state
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentPath, setCurrentPath] = useState<{ x: number, y: number }[]>([]);
    const [currentShape, setCurrentShape] = useState<{ startX: number, startY: number, endX: number, endY: number } | null>(null);
    
    // Properties state
    const [newText, setNewText] = useState("New Text");
    const [fontSize, setFontSize] = useState(24);
    const [color, setColor] = useState("#000000");
    const [strokeWidth, setStrokeWidth] = useState(3);
    const [fontFamily, setFontFamily] = useState("Roboto");
    const [isBold, setIsBold] = useState(false);
    const [isItalic, setIsItalic] = useState(false);
    const [isUnderline, setIsUnderline] = useState(false);
    const [textAlign, setTextAlign] = useState<"left" | "center" | "right">("left");
    const [opacity, setOpacity] = useState(1);
    const [rotation, setRotation] = useState(0);
    
    // Resize state
    const [isResizing, setIsResizing] = useState(false);
    const [resizeHandle, setResizeHandle] = useState<string | null>(null);
    const [startSize, setStartSize] = useState({ width: 0, height: 0 });
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    
    // Pan state
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const [scrollPos, setScrollPos] = useState({ left: 0, top: 0 });
    
    // History state for undo/redo
    const [history, setHistory] = useState<HistoryState[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    
    // Google Fonts state
    const [googleFonts, setGoogleFonts] = useState<GoogleFont[]>([]);
    const [fontSearchQuery, setFontSearchQuery] = useState("");
    const [fontCategory, setFontCategory] = useState("all");
    const [isLoadingFonts, setIsLoadingFonts] = useState(false);
    const [showFontDropdown, setShowFontDropdown] = useState(false);
    
    // UI state
    const [showToolbar, setShowToolbar] = useState(true);
    const [showProperties, setShowProperties] = useState(true);
    const [darkMode, setDarkMode] = useState(false);
    const [viewMode, setViewMode] = useState<"desktop" | "tablet" | "mobile">("desktop");
    const [continuousScroll, setContinuousScroll] = useState(true);
    const [showGrid, setShowGrid] = useState(false);
    const [snapToGrid, setSnapToGrid] = useState(false);
    const [gridSize, setGridSize] = useState(10);
    
    // Layer state
    const [showLayers, setShowLayers] = useState(false);
    
    // Load Google Fonts on mount
    useEffect(() => {
        loadGoogleFonts();
    }, []);
    
    // Load Google Fonts from API
    const loadGoogleFonts = async () => {
        setIsLoadingFonts(true);
        try {
            // First, load the popular fonts directly
            const popularFontsList = POPULAR_FONTS.map(font => ({
                family: font,
                category: "popular",
                variants: ["regular", "italic", "bold", "bolditalic"]
            }));
            
            // Then try to fetch from Google Fonts API
            try {
                const response = await fetch(`https://www.googleapis.com/webfonts/v1/webfonts?key=${GOOGLE_FONTS_API_KEY}&sort=popularity`);
                if (response.ok) {
                    const data = await response.json();
                    const allFonts = data.items.map((font: any) => ({
                        family: font.family,
                        category: font.category,
                        variants: font.variants
                    }));
                    
                    // Combine popular fonts with API results
                    setGoogleFonts([...popularFontsList, ...allFonts]);
                } else {
                    // Fallback to just popular fonts
                    setGoogleFonts(popularFontsList);
                }
            } catch (error) {
                console.error("Error fetching Google Fonts:", error);
                // Fallback to just popular fonts
                setGoogleFonts(popularFontsList);
            }
        } finally {
            setIsLoadingFonts(false);
        }
    };
    
    // Filter fonts based on search and category
    const filteredFonts = useMemo(() => {
        let filtered = googleFonts;
        
        if (fontCategory !== "all") {
            filtered = filtered.filter(font => font.category === fontCategory);
        }
        
        if (fontSearchQuery) {
            filtered = filtered.filter(font => 
                font.family.toLowerCase().includes(fontSearchQuery.toLowerCase())
            );
        }
        
        return filtered.slice(0, 100); // Limit to 100 for performance
    }, [googleFonts, fontCategory, fontSearchQuery]);
    
    // Load a specific font
    const loadFont = (fontFamily: string) => {
        const link = document.createElement('link');
        link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, '+')}:wght@400;700&display=swap`;
        link.rel = 'stylesheet';
        document.head.appendChild(link);
        
        // Set a timeout to remove the link after loading
        setTimeout(() => {
            document.head.removeChild(link);
        }, 5000);
    };
    
    // Sync properties when selection changes
    useEffect(() => {
        if (selectedElementId) {
            const el = elements.find(e => e.id === selectedElementId);
            if (el) {
                if (el.color) setColor(el.color);
                if (el.strokeWidth) setStrokeWidth(el.strokeWidth);
                if (el.fontSize) setFontSize(el.fontSize);
                if (el.fontFamily) {
                    setFontFamily(el.fontFamily);
                    loadFont(el.fontFamily);
                }
                if (el.fontWeight) setIsBold(el.fontWeight === 'bold');
                if (el.fontStyle) setIsItalic(el.fontStyle === 'italic');
                if (el.textDecoration) setIsUnderline(el.textDecoration === 'underline');
                if (el.textAlign) setTextAlign(el.textAlign);
                if (el.opacity !== undefined) setOpacity(el.opacity);
                if (el.rotation !== undefined) setRotation(el.rotation);
            }
        }
    }, [selectedElementId, elements]);
    
    // Update selected element properties
    const updateSelectedElement = (updates: Partial<EditorElement>) => {
        if (!selectedElementId) return;
        
        // Save to history before making changes
        saveToHistory();
        
        setElements(prev => prev.map(el => 
            el.id === selectedElementId ? { ...el, ...updates } : el
        ));
    };
    
    // Save current state to history
    const saveToHistory = () => {
        const newState = {
            elements: [...elements],
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
    };
    
    // Undo
    const undo = () => {
        if (historyIndex > 0) {
            const prevState = history[historyIndex - 1];
            setElements(prevState.elements);
            setCurrentPage(prevState.currentPage);
            setHistoryIndex(historyIndex - 1);
        }
    };
    
    // Redo
    const redo = () => {
        if (historyIndex < history.length - 1) {
            const nextState = history[historyIndex + 1];
            setElements(nextState.elements);
            setCurrentPage(nextState.currentPage);
            setHistoryIndex(historyIndex + 1);
        }
    };
    
    // Fit to page
    const fitToPage = async () => {
        if (!file || !scrollContainerRef.current) return;
        
        try {
            const pdfjsLib = await getPdfJs();
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await (pdfjsLib as any).getDocument(new Uint8Array(arrayBuffer)).promise;
            const page = await pdf.getPage(currentPage);
            const unscaledViewport = page.getViewport({ scale: 1 }); // Base scale 1
            
            const containerHeight = scrollContainerRef.current.clientHeight - 64; // Padding
            const containerWidth = scrollContainerRef.current.clientWidth - 64;
            
            const scaleHeight = containerHeight / unscaledViewport.height;
            const scaleWidth = containerWidth / unscaledViewport.width;
            
            const scale = Math.min(scaleHeight, scaleWidth);
            const newZoom = Math.floor(scale * 100);
            
            setZoom(Math.min(Math.max(newZoom, 25), 200)); // Clamp between 25% and 200%
        } catch (error) {
            console.error("Error fitting to page:", error);
        }
    };
    
    // Handle file selection
    const handleFileSelected = async (files: File[]) => {
        if (files.length > 0) {
            setFile(files[0]);
            setElements([]);
            setCurrentPage(1);
            
            // Load PDF to get page count
            const pdfjsLib = await getPdfJs();
            const arrayBuffer = await files[0].arrayBuffer();
            const pdf = await (pdfjsLib as any).getDocument(new Uint8Array(arrayBuffer)).promise;
            setNumPages(pdf.numPages);
            
            // Initialize canvas refs
            canvasRefs.current = Array(pdf.numPages).fill(null);
            overlayCanvasRefs.current = Array(pdf.numPages).fill(null);
            renderTaskRefs.current = Array(pdf.numPages).fill(null);
            
            // Fit to page after a short delay to allow render
            setTimeout(fitToPage, 100);
        }
    };
    
    // Initial fit to page when file loads or page changes
    useEffect(() => {
        if (file) {
            // Small delay to ensure container is rendered
            const timer = setTimeout(fitToPage, 100);
            return () => clearTimeout(timer);
        }
    }, [file, currentPage]);
    
    // Render all pages
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
                
                // Cancel any ongoing render for this page
                if (renderTaskRefs.current[i - 1]) {
                    renderTaskRefs.current[i - 1].cancel();
                }
                
                const renderTask = page.render({
                    canvasContext: context,
                    viewport: viewport,
                    canvas: canvas,
                });
                
                renderTaskRefs.current[i - 1] = renderTask;
                
                try {
                    await renderTask.promise;
                } catch (error: any) {
                    if (error.name !== 'RenderingCancelledException') {
                        console.error("Render error:", error);
                    }
                }
                renderTaskRefs.current[i - 1] = null;
            }
        };
        
        renderAllPages();
    }, [file, zoom]);
    
    // Draw elements on overlay canvases
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
            
            // Draw elements on this page
            elements.filter(el => el.page === i + 1).forEach(el => {
                ctx.save();
                
                // Apply rotation if needed
                if (el.rotation) {
                    const centerX = (el.x / 100) * width;
                    const centerY = (el.y / 100) * height;
                    ctx.translate(centerX, centerY);
                    ctx.rotate((el.rotation * Math.PI) / 180);
                    ctx.translate(-centerX, -centerY);
                }
                
                // Apply opacity
                ctx.globalAlpha = el.opacity || 1;
                
                if (el.type === 'path' && el.pathData) {
                    ctx.beginPath();
                    ctx.strokeStyle = el.color || '#000000';
                    ctx.lineWidth = el.strokeWidth || 2;
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';
                    
                    if (el.pathData.length > 0) {
                        const startX = (el.pathData[0].x / 100) * width;
                        const startY = (el.pathData[0].y / 100) * height;
                        ctx.moveTo(startX, startY);
                        
                        for (let i = 1; i < el.pathData.length; i++) {
                            const x = (el.pathData[i].x / 100) * width;
                            const y = (el.pathData[i].y / 100) * height;
                            ctx.lineTo(x, y);
                        }
                    }
                    ctx.stroke();
                } else if (el.type === 'shape') {
                    ctx.strokeStyle = el.color || '#000000';
                    ctx.lineWidth = el.strokeWidth || 2;
                    const x = (el.x / 100) * width;
                    const y = (el.y / 100) * height;
                    const w = ((el.width || 0) / 100) * width;
                    const h = ((el.height || 0) / 100) * height;
                    
                    if (el.shapeType === 'rectangle') {
                        ctx.strokeRect(x, y, w, h);
                    } else if (el.shapeType === 'circle') {
                        ctx.beginPath();
                        const radius = Math.min(w, h) / 2;
                        ctx.arc(x + w/2, y + h/2, radius, 0, 2 * Math.PI);
                        ctx.stroke();
                    } else if (el.shapeType === 'triangle') {
                        ctx.beginPath();
                        ctx.moveTo(x + w/2, y);
                        ctx.lineTo(x, y + h);
                        ctx.lineTo(x + w, y + h);
                        ctx.closePath();
                        ctx.stroke();
                    } else if (el.shapeType === 'star') {
                        const centerX = x + w/2;
                        const centerY = y + h/2;
                        const outerRadius = Math.min(w, h) / 2;
                        const innerRadius = outerRadius / 2;
                        const numPoints = 5;
                        
                        ctx.beginPath();
                        for (let i = 0; i < numPoints * 2; i++) {
                            const radius = i % 2 === 0 ? outerRadius : innerRadius;
                            const angle = (i * Math.PI) / numPoints - Math.PI / 2;
                            const xPos = centerX + Math.cos(angle) * radius;
                            const yPos = centerY + Math.sin(angle) * radius;
                            
                            if (i === 0) {
                                ctx.moveTo(xPos, yPos);
                            } else {
                                ctx.lineTo(xPos, yPos);
                            }
                        }
                        ctx.closePath();
                        ctx.stroke();
                    } else if (el.shapeType === 'heart') {
                        const width = w;
                        const height = h;
                        const topCurveHeight = height * 0.3;
                        
                        ctx.beginPath();
                        ctx.moveTo(x, y + topCurveHeight);
                        // Top left curve
                        ctx.bezierCurveTo(
                            x, y, 
                            x - width / 2, y, 
                            x - width / 2, y + topCurveHeight
                        );
                        // Bottom left curve
                        ctx.bezierCurveTo(
                            x - width / 2, y + (height + topCurveHeight) / 2, 
                            x, y + (height + topCurveHeight) / 2, 
                            x, y + height
                        );
                        // Bottom right curve
                        ctx.bezierCurveTo(
                            x, y + (height + topCurveHeight) / 2, 
                            x + width / 2, y + (height + topCurveHeight) / 2, 
                            x + width / 2, y + topCurveHeight
                        );
                        // Top right curve
                        ctx.bezierCurveTo(
                            x + width / 2, y, 
                            x, y, 
                            x, y + topCurveHeight
                        );
                        ctx.closePath();
                        ctx.stroke();
                    }
                } else if (el.type === 'arrow' && el.points && el.points.length >= 2) {
                    ctx.strokeStyle = el.color || '#000000';
                    ctx.lineWidth = el.strokeWidth || 2;
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';
                    
                    // Draw line
                    ctx.beginPath();
                    const startX = (el.points[0].x / 100) * width;
                    const startY = (el.points[0].y / 100) * height;
                    ctx.moveTo(startX, startY);
                    
                    for (let i = 1; i < el.points.length; i++) {
                        const x = (el.points[i].x / 100) * width;
                        const y = (el.points[i].y / 100) * height;
                        ctx.lineTo(x, y);
                    }
                    ctx.stroke();
                    
                    // Draw arrowhead
                    const endX = (el.points[el.points.length - 1].x / 100) * width;
                    const endY = (el.points[el.points.length - 1].y / 100) * height;
                    const prevX = (el.points[el.points.length - 2].x / 100) * width;
                    const prevY = (el.points[el.points.length - 2].y / 100) * height;
                    
                    const angle = Math.atan2(endY - prevY, endX - prevX);
                    const arrowLength = 15;
                    
                    ctx.beginPath();
                    ctx.moveTo(endX, endY);
                    ctx.lineTo(
                        endX - arrowLength * Math.cos(angle - Math.PI / 6),
                        endY - arrowLength * Math.sin(angle - Math.PI / 6)
                    );
                    ctx.moveTo(endX, endY);
                    ctx.lineTo(
                        endX - arrowLength * Math.cos(angle + Math.PI / 6),
                        endY - arrowLength * Math.sin(angle + Math.PI / 6)
                    );
                    ctx.stroke();
                } else if (el.type === 'line' && el.points && el.points.length >= 2) {
                    ctx.strokeStyle = el.color || '#000000';
                    ctx.lineWidth = el.strokeWidth || 2;
                    ctx.lineCap = 'round';
                    
                    ctx.beginPath();
                    const startX = (el.points[0].x / 100) * width;
                    const startY = (el.points[0].y / 100) * height;
                    ctx.moveTo(startX, startY);
                    
                    for (let i = 1; i < el.points.length; i++) {
                        const x = (el.points[i].x / 100) * width;
                        const y = (el.points[i].y / 100) * height;
                        ctx.lineTo(x, y);
                    }
                    ctx.stroke();
                }
                
                ctx.restore();
            });
            
            // Draw current path being drawn
            if (isDrawing && currentPath.length > 0) {
                ctx.beginPath();
                ctx.strokeStyle = activeTool === 'highlight' ? '#FFFF00' : color;
                ctx.lineWidth = activeTool === 'highlight' ? 20 : strokeWidth;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.globalAlpha = activeTool === 'highlight' ? 0.4 : 1;
                
                const startX = (currentPath[0].x / 100) * width;
                const startY = (currentPath[0].y / 100) * height;
                ctx.moveTo(startX, startY);
                
                for (let i = 1; i < currentPath.length; i++) {
                    const x = (currentPath[i].x / 100) * width;
                    const y = (currentPath[i].y / 100) * height;
                    ctx.lineTo(x, y);
                }
                ctx.stroke();
                ctx.globalAlpha = 1;
            }
            
            // Draw current shape being drawn
            if (isDrawing && currentShape) {
                ctx.strokeStyle = color;
                ctx.lineWidth = strokeWidth;
                
                const x = Math.min(currentShape.startX, currentShape.endX);
                const y = Math.min(currentShape.startY, currentShape.endY);
                const w = Math.abs(currentShape.endX - currentShape.startX);
                const h = Math.abs(currentShape.endY - currentShape.startY);
                
                if (activeTool === 'rect') {
                    ctx.strokeRect(x, y, w, h);
                } else if (activeTool === 'circle') {
                    ctx.beginPath();
                    const radius = Math.min(w, h) / 2;
                    ctx.arc(x + w/2, y + h/2, radius, 0, 2 * Math.PI);
                    ctx.stroke();
                } else if (activeTool === 'triangle') {
                    ctx.beginPath();
                    ctx.moveTo(x + w/2, y);
                    ctx.lineTo(x, y + h);
                    ctx.lineTo(x + w, y + h);
                    ctx.closePath();
                    ctx.stroke();
                } else if (activeTool === 'star') {
                    const centerX = x + w/2;
                    const centerY = y + h/2;
                    const outerRadius = Math.min(w, h) / 2;
                    const innerRadius = outerRadius / 2;
                    const numPoints = 5;
                    
                    ctx.beginPath();
                    for (let i = 0; i < numPoints * 2; i++) {
                        const radius = i % 2 === 0 ? outerRadius : innerRadius;
                        const angle = (i * Math.PI) / numPoints - Math.PI / 2;
                        const xPos = centerX + Math.cos(angle) * radius;
                        const yPos = centerY + Math.sin(angle) * radius;
                        
                        if (i === 0) {
                            ctx.moveTo(xPos, yPos);
                        } else {
                            ctx.lineTo(xPos, yPos);
                        }
                    }
                    ctx.closePath();
                    ctx.stroke();
                } else if (activeTool === 'heart') {
                    const width = w;
                    const height = h;
                    const topCurveHeight = height * 0.3;
                    
                    ctx.beginPath();
                    ctx.moveTo(x, y + topCurveHeight);
                    // Top left curve
                    ctx.bezierCurveTo(
                        x, y, 
                        x - width / 2, y, 
                        x - width / 2, y + topCurveHeight
                    );
                    // Bottom left curve
                    ctx.bezierCurveTo(
                        x - width / 2, y + (height + topCurveHeight) / 2, 
                        x, y + (height + topCurveHeight) / 2, 
                        x, y + height
                    );
                    // Bottom right curve
                    ctx.bezierCurveTo(
                        x, y + (height + topCurveHeight) / 2, 
                        x + width / 2, y + (height + topCurveHeight) / 2, 
                        x + width / 2, y + topCurveHeight
                    );
                    // Top right curve
                    ctx.bezierCurveTo(
                        x + width / 2, y, 
                        x, y, 
                        x, y + topCurveHeight
                    );
                    ctx.closePath();
                    ctx.stroke();
                } else if (activeTool === 'arrow' || activeTool === 'line') {
                    ctx.beginPath();
                    ctx.moveTo(currentShape.startX, currentShape.startY);
                    ctx.lineTo(currentShape.endX, currentShape.endY);
                    ctx.stroke();
                    
                    if (activeTool === 'arrow') {
                        const angle = Math.atan2(
                            currentShape.endY - currentShape.startY,
                            currentShape.endX - currentShape.startX
                        );
                        const arrowLength = 15;
                        
                        ctx.beginPath();
                        ctx.moveTo(currentShape.endX, currentShape.endY);
                        ctx.lineTo(
                            currentShape.endX - arrowLength * Math.cos(angle - Math.PI / 6),
                            currentShape.endY - arrowLength * Math.sin(angle - Math.PI / 6)
                        );
                        ctx.moveTo(currentShape.endX, currentShape.endY);
                        ctx.lineTo(
                            currentShape.endX - arrowLength * Math.cos(angle + Math.PI / 6),
                            currentShape.endY - arrowLength * Math.sin(angle + Math.PI / 6)
                        );
                        ctx.stroke();
                    }
                }
            }
        }
    }, [elements, numPages, isDrawing, currentPath, currentShape, color, strokeWidth, zoom, activeTool, showGrid, gridSize]);
    
    // Handle mouse down
    const handleMouseDown = (e: React.MouseEvent, pageIndex: number) => {
        const pageNum = pageIndex + 1;
        
        if (activeTool === 'hand') {
            setIsPanning(true);
            setPanStart({ x: e.clientX, y: e.clientY });
            if (scrollContainerRef.current) {
                setScrollPos({ 
                    left: scrollContainerRef.current.scrollLeft, 
                    top: scrollContainerRef.current.scrollTop 
                });
            }
            return;
        }
        
        if (activeTool === 'select') {
            // Clicking on empty canvas clears selection and hides inline controls
            setSelectedElementId(null);
            return;
        }
        
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
        
        if (activeTool === 'draw' || activeTool === 'highlight') {
            setCurrentPath([{ x, y }]);
        } else if (activeTool === 'rect' || activeTool === 'circle' || 
                  activeTool === 'triangle' || activeTool === 'star' || 
                  activeTool === 'heart' || activeTool === 'arrow' || 
                  activeTool === 'line') {
            setCurrentShape({ startX: x, startY: y, endX: x, endY: y });
        }
    };
    
    // Handle mouse move
    const handleMouseMove = (e: React.MouseEvent, pageIndex: number) => {
        if (isPanning && scrollContainerRef.current) {
            const dx = e.clientX - panStart.x;
            const dy = e.clientY - panStart.y;
            scrollContainerRef.current.scrollLeft = scrollPos.left - dx;
            scrollContainerRef.current.scrollTop = scrollPos.top - dy;
            return;
        }
        
        if (isResizing && selectedElementId) {
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
            
            const el = elements.find(e => e.id === selectedElementId);
            if (!el) return;
            
            const baseWidth = el.width ?? startSize.width ?? 10;
            const baseHeight = el.height ?? startSize.height ?? 10;
            let newWidth = baseWidth;
            let newHeight = baseHeight;
            let newX = el.x;
            let newY = el.y;
            
            if (resizeHandle?.includes('right')) {
                newWidth = Math.max(5, x - el.x);
            }
            if (resizeHandle?.includes('left')) {
                newWidth = Math.max(5, el.x + baseWidth - x);
                newX = el.x + baseWidth - newWidth;
            }
            if (resizeHandle?.includes('bottom')) {
                newHeight = Math.max(5, y - el.y);
            }
            if (resizeHandle?.includes('top')) {
                newHeight = Math.max(5, el.y + baseHeight - y);
                newY = el.y + baseHeight - newHeight;
            }
            
            setElements(prev => prev.map(element => 
                element.id === selectedElementId 
                    ? { ...element, x: newX, y: newY, width: newWidth, height: newHeight }
                    : element
            ));
            
            return;
        }
        
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
        
        if (activeTool === 'draw' || activeTool === 'highlight') {
            setCurrentPath(prev => [...prev, { x, y }]);
        } else if (currentShape) {
            setCurrentShape({ ...currentShape, endX: x, endY: y });
        }
    };
    
    // Handle mouse up
    const handleMouseUp = (pageIndex: number) => {
        if (isPanning) {
            setIsPanning(false);
            return;
        }
        
        if (isResizing) {
            setIsResizing(false);
            setResizeHandle(null);
            return;
        }
        
        if (!isDrawing) return;
        setIsDrawing(false);
        
        const pageNum = pageIndex + 1;
        
        if (activeTool === 'draw' || activeTool === 'highlight') {
            const id = Math.random().toString(36).substr(2, 9);
            setElements(prev => [
                ...prev,
                {
                    id,
                    type: 'path',
                    pathData: currentPath,
                    page: pageNum,
                    color: activeTool === 'highlight' ? '#FFFF00' : color,
                    strokeWidth: activeTool === 'highlight' ? 20 : strokeWidth,
                    opacity: activeTool === 'highlight' ? 0.4 : 1,
                    x: 0,
                    y: 0
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
            
            if (activeTool === 'rect') {
                setElements(prev => [
                    ...prev,
                    {
                        id,
                        type: 'shape',
                        shapeType: 'rectangle',
                        x,
                        y,
                        width,
                        height,
                        page: pageNum,
                        color: color,
                        strokeWidth: strokeWidth
                    }
                ]);
            } else if (activeTool === 'circle') {
                setElements(prev => [
                    ...prev,
                    {
                        id,
                        type: 'shape',
                        shapeType: 'circle',
                        x,
                        y,
                        width,
                        height,
                        page: pageNum,
                        color: color,
                        strokeWidth: strokeWidth
                    }
                ]);
            } else if (activeTool === 'triangle') {
                setElements(prev => [
                    ...prev,
                    {
                        id,
                        type: 'shape',
                        shapeType: 'triangle',
                        x,
                        y,
                        width,
                        height,
                        page: pageNum,
                        color: color,
                        strokeWidth: strokeWidth
                    }
                ]);
            } else if (activeTool === 'star') {
                setElements(prev => [
                    ...prev,
                    {
                        id,
                        type: 'shape',
                        shapeType: 'star',
                        x,
                        y,
                        width,
                        height,
                        page: pageNum,
                        color: color,
                        strokeWidth: strokeWidth
                    }
                ]);
            } else if (activeTool === 'heart') {
                setElements(prev => [
                    ...prev,
                    {
                        id,
                        type: 'shape',
                        shapeType: 'heart',
                        x,
                        y,
                        width,
                        height,
                        page: pageNum,
                        color: color,
                        strokeWidth: strokeWidth
                    }
                ]);
            } else if (activeTool === 'arrow') {
                setElements(prev => [
                    ...prev,
                    {
                        id,
                        type: 'arrow',
                        x: 0,
                        y: 0,
                        points: [
                            { x: currentShape.startX, y: currentShape.startY },
                            { x: currentShape.endX, y: currentShape.endY }
                        ],
                        page: pageNum,
                        color: color,
                        strokeWidth: strokeWidth
                    }
                ]);
            } else if (activeTool === 'line') {
                setElements(prev => [
                    ...prev,
                    {
                        id,
                        type: 'line',
                        x: 0,
                        y: 0,
                        points: [
                            { x: currentShape.startX, y: currentShape.startY },
                            { x: currentShape.endX, y: currentShape.endY }
                        ],
                        page: pageNum,
                        color: color,
                        strokeWidth: strokeWidth
                    }
                ]);
            }
            
            setCurrentShape(null);
        }
    };
    
    // Add text element
    const addTextElement = () => {
        const id = Math.random().toString(36).substr(2, 9);
        setElements(prev => [
            ...prev,
            {
                id,
                type: "text",
                x: 50, // Center
                y: 50, // Center
                page: currentPage,
                content: "Double click to edit",
                fontSize: fontSize,
                color: color,
                fontFamily: fontFamily,
                fontWeight: isBold ? 'bold' : 'normal',
                fontStyle: isItalic ? 'italic' : 'normal',
                textDecoration: isUnderline ? 'underline' : 'none',
                textAlign: textAlign,
                width: 20,
                height: 5,
                opacity: opacity,
                rotation: rotation
            },
        ]);
        setSelectedElementId(id);
        setActiveTool('select');
    };
    
    // Add image element
    const addImageElement = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const imgFile = e.target.files[0];
            const arrayBuffer = await imgFile.arrayBuffer();
            const id = Math.random().toString(36).substr(2, 9);
            
            setElements(prev => [
                ...prev,
                {
                    id,
                    type: "image",
                    x: 50,
                    y: 50,
                    page: currentPage,
                    imageBytes: arrayBuffer,
                    imageType: imgFile.type.includes("png") ? "png" : "jpg",
                    width: 20,
                    height: 15,
                    opacity: opacity,
                    rotation: rotation
                },
            ]);
            setSelectedElementId(id);
            setActiveTool('select');
        }
    };
    
    // Update element position
    const updateElementPosition = (id: string, x: number, y: number) => {
        setElements(prev => prev.map(el => el.id === id ? { ...el, x, y } : el));
    };
    
    // Remove element
    const removeElement = (id: string) => {
        saveToHistory();
        setElements(prev => prev.filter(el => el.id !== id));
        if (selectedElementId === id) setSelectedElementId(null);
    };
    
    // Duplicate element
    const duplicateElement = (id: string) => {
        const element = elements.find(el => el.id === id);
        if (!element) return;
        
        const newElement = {
            ...element,
            id: Math.random().toString(36).substr(2, 9),
            x: element.x + 5,
            y: element.y + 5
        };
        
        saveToHistory();
        setElements(prev => [...prev, newElement]);
        setSelectedElementId(newElement.id);
    };
    
    // Save PDF
    const savePdf = async () => {
        if (!file) return;
        setIsProcessing(true);
        
        try {
            const result = await pdfStrategyManager.execute('edit', [file], {
                elements
            });
            
            saveAs(result.blob, result.fileName || `edited-${file.name}`);
            
            toast.show({
                title: "Success",
                message: "PDF edited successfully!",
                variant: "success",
                position: "top-right",
            });
        } catch (error) {
            console.error("Error saving PDF:", error);
            toast.show({
                title: "Save Failed",
                message: "Failed to save PDF. Please try again.",
                variant: "error",
                position: "top-right",
            });
        } finally {
            setIsProcessing(false);
        }
    };
    
    // Handle resize start
    const handleResizeStart = (e: React.MouseEvent, handle: string, elementId: string) => {
        e.stopPropagation();
        setSelectedElementId(elementId);
        setIsResizing(true);
        setResizeHandle(handle);
        
        const element = elements.find(el => el.id === elementId);
        if (element) {
            setStartSize({ width: element.width || 0, height: element.height || 0 });
        }
    };
    
    // Handle element drag start
    const handleDragStart = (e: React.MouseEvent, elementId: string) => {
        if (activeTool !== 'select') return;
        
        e.stopPropagation();
        setSelectedElementId(elementId);
        
        const element = elements.find(el => el.id === elementId);
        if (!element) return;
        
        const canvas = canvasRefs.current[element.page - 1];
        if (!canvas) return;
        
        const rect = canvas.getBoundingClientRect();
        const startX = e.clientX;
        const startY = e.clientY;
        const startLeft = element.x;
        const startTop = element.y;
        
        const onMouseMove = (moveEvent: MouseEvent) => {
            const dx = moveEvent.clientX - startX;
            const dy = moveEvent.clientY - startY;
            
            const dxPercent = (dx / rect.width) * 100;
            const dyPercent = (dy / rect.height) * 100;
            
            let newX = startLeft + dxPercent;
            let newY = startTop + dyPercent;
            
            // Snap to grid if enabled
            if (snapToGrid) {
                newX = Math.round(newX / gridSize) * gridSize;
                newY = Math.round(newY / gridSize) * gridSize;
            }
            
            updateElementPosition(elementId, Math.max(0, Math.min(100, newX)), Math.max(0, Math.min(100, newY)));
        };
        
        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            saveToHistory();
        };
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };
    
    // If no file, show file upload
    if (!file) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] bg-linear-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
                <div className="max-w-md w-full p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl">
                    <div className="flex items-center justify-center mb-6">
                        <div className="p-4 bg-blue-100 dark:bg-blue-900 rounded-full">
                            <FileText className="h-12 w-12 text-blue-600 dark:text-blue-400" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-center mb-2 text-gray-900 dark:text-white">PDF Editor</h1>
                    <p className="text-center text-gray-600 dark:text-gray-400 mb-6">Upload a PDF to start editing</p>
                    <FileUpload
                        onFilesSelected={handleFileSelected}
                        maxFiles={1}
                        accept={{ "application/pdf": [".pdf"] }}
                        description="Drop a PDF file here or click to browse"
                    />
                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Edit, annotate, and enhance your PDFs with powerful tools
                        </p>
                    </div>
                </div>
            </div>
        );
    }
    
    // Render the editor
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
                    
                    {/* Tools */}
                    <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1 mr-2">
                        <Button 
                            variant={activeTool === 'select' ? 'secondary' : 'ghost'} 
                            size="icon" 
                            onClick={() => setActiveTool('select')}
                            title="Select"
                            className={cn("h-8 w-8", activeTool === 'select' && "bg-white dark:bg-gray-600 shadow-sm text-blue-600 dark:text-blue-400")}
                        >
                            <MousePointer2 className="h-4 w-4" />
                        </Button>
                        <Button 
                            variant={activeTool === 'hand' ? 'secondary' : 'ghost'} 
                            size="icon" 
                            onClick={() => setActiveTool('hand')}
                            title="Pan Tool"
                            className={cn("h-8 w-8", activeTool === 'hand' && "bg-white dark:bg-gray-600 shadow-sm text-blue-600 dark:text-blue-400")}
                        >
                            <Hand className="h-4 w-4" />
                        </Button>
                        <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={addTextElement}
                            title="Add Text"
                            className="h-8 w-8"
                        >
                            <Type className="h-4 w-4" />
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => fileInputRef.current?.click()}
                            title="Add Image"
                            className="h-8 w-8"
                        >
                            <ImageIcon className="h-4 w-4" />
                        </Button>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept="image/*" 
                            onChange={addImageElement} 
                        />
                        <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />
                        <Button 
                            variant={activeTool === 'draw' ? 'secondary' : 'ghost'} 
                            size="icon" 
                            onClick={() => setActiveTool('draw')}
                            title="Draw"
                            className={cn("h-8 w-8", activeTool === 'draw' && "bg-white dark:bg-gray-600 shadow-sm text-blue-600 dark:text-blue-400")}
                        >
                            <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                            variant={activeTool === 'highlight' ? 'secondary' : 'ghost'} 
                            size="icon" 
                            onClick={() => setActiveTool('highlight')}
                            title="Highlighter"
                            className={cn("h-8 w-8", activeTool === 'highlight' && "bg-white dark:bg-gray-600 shadow-sm text-blue-600 dark:text-blue-400")}
                        >
                            <Highlighter className="h-4 w-4" />
                        </Button>
                        <Button 
                            variant={activeTool === 'eraser' ? 'secondary' : 'ghost'} 
                            size="icon" 
                            onClick={() => setActiveTool('eraser')}
                            title="Eraser"
                            className={cn("h-8 w-8", activeTool === 'eraser' && "bg-white dark:bg-gray-600 shadow-sm text-blue-600 dark:text-blue-400")}
                        >
                            <Eraser className="h-4 w-4" />
                        </Button>
                        <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />
<Button
variant={activeTool === 'circle' ? 'secondary' : 'ghost'}
size="icon"
onClick={() => setActiveTool('circle')}
title="Circle"
className={cn("h-8 w-8", activeTool === 'circle' && "bg-white dark:bg-gray-600 shadow-sm text-blue-600 dark:text-blue-400")}
>
<Circle className="h-4 w-4" />
</Button>
<Button
variant={activeTool === 'triangle' ? 'secondary' : 'ghost'}
size="icon"
onClick={() => setActiveTool('triangle')}
title="Triangle"
className={cn("h-8 w-8", activeTool === 'triangle' && "bg-white dark:bg-gray-600 shadow-sm text-blue-600 dark:text-blue-400")}
>
<Triangle className="h-4 w-4" />
</Button>
<Button
variant={activeTool === 'star' ? 'secondary' : 'ghost'}
size="icon"
onClick={() => setActiveTool('star')}
title="Star"
className={cn("h-8 w-8", activeTool === 'star' && "bg-white dark:bg-gray-600 shadow-sm text-blue-600 dark:text-blue-400")}
>
<Star className="h-4 w-4" />
</Button>
<Button
variant={activeTool === 'heart' ? 'secondary' : 'ghost'}
size="icon"
onClick={() => setActiveTool('heart')}
title="Heart"
className={cn("h-8 w-8", activeTool === 'heart' && "bg-white dark:bg-gray-600 shadow-sm text-blue-600 dark:text-blue-400")}
>
<Heart className="h-4 w-4" />
</Button>
<Button
variant={activeTool === 'arrow' ? 'secondary' : 'ghost'}
size="icon"
onClick={() => setActiveTool('arrow')}
title="Arrow"
className={cn("h-8 w-8", activeTool === 'arrow' && "bg-white dark:bg-gray-600 shadow-sm text-blue-600 dark:text-blue-400")}
>
<ArrowRight className="h-4 w-4" />
</Button>
<Button
variant={activeTool === 'line' ? 'secondary' : 'ghost'}
size="icon"
onClick={() => setActiveTool('line')}
title="Line"
className={cn("h-8 w-8", activeTool === 'line' && "bg-white dark:bg-gray-600 shadow-sm text-blue-600 dark:text-blue-400")}
>
<Minus className="h-4 w-4" />
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
disabled={isProcessing}
className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white"
>
{isProcessing ? "Saving..." : <><Download className="h-4 w-4 mr-1" /> Save</>}
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
<h3 className="font-semibold text-gray-900 dark:text-white">Properties</h3>
<Button
variant="ghost"
size="icon"
className="h-6 w-6"
onClick={() => setShowProperties(false)}
>
<X className="h-4 w-4" />
</Button>
</div>

{/* Font Selection */}
<div className="mb-4">
<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Font Family</label>
<div className="relative">
<Button
variant="outline"
className="w-full justify-between h-10 text-left"
onClick={() => setShowFontDropdown(!showFontDropdown)}
>
<span style={{ fontFamily }}>{fontFamily}</span>
<ChevronDown className="h-4 w-4" />
</Button>

{showFontDropdown && (
<div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
<div className="p-2 border-b border-gray-200 dark:border-gray-600">
<input
type="text"
placeholder="Search fonts..."
className="w-full px-3 py-2 border border-gray-300 dark:border-gray-500 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
value={fontSearchQuery}
onChange={(e) => setFontSearchQuery(e.target.value)}
/>
</div>
<div className="p-2 border-b border-gray-200 dark:border-gray-600">
<select
className="w-full px-3 py-2 border border-gray-300 dark:border-gray-500 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
value={fontCategory}
onChange={(e) => setFontCategory(e.target.value)}
>
<option value="all">All Categories</option>
{FONT_CATEGORIES.map(category => (
<option key={category} value={category}>
{category.charAt(0).toUpperCase() + category.slice(1)}
</option>
))}
</select>
</div>
<div className="max-h-40 overflow-auto">
{isLoadingFonts ? (
<div className="p-4 text-center text-gray-500 dark:text-gray-400">
Loading fonts...
</div>
) : (
filteredFonts.map(font => (
<button
key={font.family}
className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center justify-between"
style={{ fontFamily: font.family }}
onClick={() => {
setFontFamily(font.family);
loadFont(font.family);
updateSelectedElement({ fontFamily: font.family });
setShowFontDropdown(false);
}}
>
<span>{font.family}</span>
{font.family === fontFamily && (
<Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
)}
</button>
))
)}
</div>
</div>
)}
</div>
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
updateSelectedElement({ fontWeight: newBold ? 'bold' : 'normal' });
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
const newItalic = !isItalic;
setIsItalic(newItalic);
updateSelectedElement({ fontStyle: newItalic ? 'italic' : 'normal' });
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
const newUnderline = !isUnderline;
setIsUnderline(newUnderline);
updateSelectedElement({ textDecoration: newUnderline ? 'underline' : 'none' });
}}
title="Underline"
>
<Underline className="h-4 w-4" />
</Button>
<div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
<Button
variant={textAlign === 'left' ? "secondary" : "ghost"}
size="icon"
className="h-8 w-8"
onClick={() => {
setTextAlign('left');
updateSelectedElement({ textAlign: 'left' });
}}
title="Align Left"
>
<AlignLeft className="h-4 w-4" />
</Button>
<Button
variant={textAlign === 'center' ? "secondary" : "ghost"}
size="icon"
className="h-8 w-8"
onClick={() => {
setTextAlign('center');
updateSelectedElement({ textAlign: 'center' });
}}
title="Align Center"
>
<AlignCenter className="h-4 w-4" />
</Button>
<Button
variant={textAlign === 'right' ? "secondary" : "ghost"}
size="icon"
className="h-8 w-8"
onClick={() => {
setTextAlign('right');
updateSelectedElement({ textAlign: 'right' });
}}
title="Align Right"
>
<AlignRight className="h-4 w-4" />
</Button>
</div>
</div>

{/* Font Size / Stroke Width */}
<div className="mb-4">
<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
{selectedElementId && elements.find(e => e.id === selectedElementId)?.type === 'text'
? 'Font Size'
: 'Stroke Width'}
</label>
<div className="flex items-center gap-2">
<input
type="number"
value={selectedElementId && elements.find(e => e.id === selectedElementId)?.type === 'text'
? fontSize
: strokeWidth}
onChange={(e) => {
const val = Number(e.target.value);
if (selectedElementId && elements.find(el => el.id === selectedElementId)?.type === 'text') {
setFontSize(val);
updateSelectedElement({ fontSize: val });
} else {
setStrokeWidth(val);
updateSelectedElement({ strokeWidth: val });
}
}}
className="w-20 h-10 rounded border border-gray-300 dark:border-gray-500 px-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
min="1"
max="100"
/>
<span className="text-sm text-gray-600 dark:text-gray-400">px</span>
</div>
</div>

{/* Color Picker */}
<div className="mb-4">
<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Color</label>
<div className="flex items-center gap-2">
{['#000000', '#FF0000', '#0000FF', '#008000', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500'].map(c => (
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

{/* Opacity */}
<div className="mb-4">
<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Opacity</label>
<div className="flex items-center gap-2">
<input
type="range"
min="0"
max="1"
step="0.1"
value={opacity}
onChange={(e) => {
const val = Number(e.target.value);
setOpacity(val);
updateSelectedElement({ opacity: val });
}}
className="flex-1"
/>
<span className="text-sm text-gray-600 dark:text-gray-400 w-10">{Math.round(opacity * 100)}%</span>
</div>
</div>

{/* Rotation */}
<div className="mb-4">
<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Rotation</label>
<div className="flex items-center gap-2">
<input
type="range"
min="-180"
max="180"
step="5"
value={rotation}
onChange={(e) => {
const val = Number(e.target.value);
setRotation(val);
updateSelectedElement({ rotation: val });
}}
className="flex-1"
/>
<span className="text-sm text-gray-600 dark:text-gray-400 w-12">{rotation}°</span>
</div>
</div>

{/* Layer Controls */}
{selectedElementId && (
<div className="mb-4">
<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Layer</label>
<div className="flex items-center gap-2">
<Button
variant="ghost"
size="sm"
className="h-8 px-2"
onClick={() => {
const el = elements.find(e => e.id === selectedElementId);
if (!el) return;

const currentIndex = elements.indexOf(el);
if (currentIndex > 0) {
const newElements = [...elements];
[newElements[currentIndex], newElements[currentIndex - 1]] =
[newElements[currentIndex - 1], newElements[currentIndex]];
setElements(newElements);
}
}}
title="Move Back"
>
<ChevronLeft className="h-4 w-4" />
</Button>
<Button
variant="ghost"
size="sm"
className="h-8 px-2"
onClick={() => {
const el = elements.find(e => e.id === selectedElementId);
if (!el) return;

const currentIndex = elements.indexOf(el);
if (currentIndex < elements.length - 1) {
const newElements = [...elements];
[newElements[currentIndex], newElements[currentIndex + 1]] =
[newElements[currentIndex + 1], newElements[currentIndex]];
setElements(newElements);
}
}}
title="Move Forward"
>
<ChevronRight className="h-4 w-4" />
</Button>
<Button
variant="ghost"
size="sm"
className="h-8 px-2"
onClick={() => {
const el = elements.find(e => e.id === selectedElementId);
if (!el) return;

const newElements = elements.filter(e => e.id !== selectedElementId);
newElements.push(el);
setElements(newElements);
}}
title="Bring to Front"
>
<ChevronRight className="h-4 w-4" />
<ChevronRight className="h-4 w-4" />
</Button>
<Button
variant="ghost"
size="sm"
className="h-8 px-2"
onClick={() => {
const el = elements.find(e => e.id === selectedElementId);
if (!el) return;

const newElements = elements.filter(e => e.id !== selectedElementId);
newElements.unshift(el);
setElements(newElements);
}}
title="Send to Back"
>
<ChevronLeft className="h-4 w-4" />
<ChevronLeft className="h-4 w-4" />
</Button>
</div>
</div>
)}
</div>

{/* Layers Panel */}
<div className={cn(
"fixed left-4 top-20 z-40 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 w-64 transition-all duration-300",
showLayers ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2 pointer-events-none"
)}>
<div className="flex items-center justify-between mb-4">
<h3 className="font-semibold text-gray-900 dark:text-white">Layers</h3>
<Button
variant="ghost"
size="icon"
className="h-6 w-6"
onClick={() => setShowLayers(false)}
>
<X className="h-4 w-4" />
</Button>
</div>

<div className="space-y-2 max-h-96 overflow-auto">
{elements.slice().reverse().map((el, index) => (
<div
key={el.id}
className={cn(
"flex items-center gap-2 p-2 rounded-md cursor-pointer",
selectedElementId === el.id ? "bg-blue-100 dark:bg-blue-900" : "hover:bg-gray-100 dark:hover:bg-gray-700"
)}
onClick={() => setSelectedElementId(el.id)}
>
<div className="flex-1 flex items-center gap-2">
{el.type === 'text' && <Type className="h-4 w-4 text-gray-600 dark:text-gray-400" />}
{el.type === 'image' && <ImageIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />}
{el.type === 'path' && <Pencil className="h-4 w-4 text-gray-600 dark:text-gray-400" />}
{el.type === 'shape' && <Square className="h-4 w-4 text-gray-600 dark:text-gray-400" />}
{el.type === 'arrow' && <ArrowRight className="h-4 w-4 text-gray-600 dark:text-gray-400" />}
{el.type === 'line' && <Minus className="h-4 w-4 text-gray-600 dark:text-gray-400" />}
<span className="text-sm truncate">
{el.type === 'text' ? el.content?.substring(0, 20) : `${el.type} ${elements.length - index}`}
</span>
</div>
<div className="flex items-center gap-1">
<Button
variant="ghost"
size="icon"
className="h-6 w-6"
onClick={(e) => {
e.stopPropagation();
const elIndex = elements.indexOf(el);
if (elIndex > 0) {
const newElements = [...elements];
[newElements[elIndex], newElements[elIndex - 1]] =
[newElements[elIndex - 1], newElements[elIndex]];
setElements(newElements);
}
}}
title="Move Up"
>
<ChevronLeft className="h-3 w-3" />
</Button>
<Button
variant="ghost"
size="icon"
className="h-6 w-6"
onClick={(e) => {
e.stopPropagation();
const elIndex = elements.indexOf(el);
if (elIndex < elements.length - 1) {
const newElements = [...elements];
[newElements[elIndex], newElements[elIndex + 1]] =
[newElements[elIndex + 1], newElements[elIndex]];
setElements(newElements);
}
}}
title="Move Down"
>
<ChevronRight className="h-3 w-3" />
</Button>
</div>
</div>
))}
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
<Button
variant="ghost"
size="icon"
className="h-8 w-8"
onClick={() => setShowLayers(!showLayers)}
title={showLayers ? "Hide Layers" : "Show Layers"}
>
<Layers className="h-4 w-4" />
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
<Button
variant="ghost"
size="icon"
className="h-8 w-8"
onClick={() => setContinuousScroll(!continuousScroll)}
title={continuousScroll ? "Disable Continuous Scroll" : "Enable Continuous Scroll"}
>
<Scan className={cn("h-4 w-4", continuousScroll && "text-blue-600 dark:text-blue-400")} />
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
className={cn(
"flex-1 bg-gray-50 dark:bg-gray-900 overflow-auto p-8 relative",
activeTool === 'hand' && "cursor-grab active:cursor-grabbing"
)}
>
<div className="flex flex-col items-center">
{Array.from({ length: numPages }, (_, i) => (
<div
key={i}
className="relative mb-8 shadow-2xl transition-transform duration-200 ease-out"
style={{
width: "fit-content",
height: "fit-content"
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

{/* DOM Overlay Layer for Text and Images */}
<div className="absolute inset-0">
{elements.filter(el => el.page === i + 1 && (el.type === 'text' || el.type === 'image')).map((el) => (
<div
key={el.id}
className={cn(
"absolute group",
selectedElementId === el.id && "ring-2 ring-blue-500 ring-offset-2"
)}
style={{
left: `${el.x}%`,
top: `${el.y}%`,
transform: `translate(-50%, -50%) rotate(${el.rotation || 0}deg)`,
maxWidth: el.type === 'image' ? `${el.width}%` : 'auto',
width: el.width ? `${el.width}%` : 'auto',
height: el.height ? `${el.height}%` : 'auto',
pointerEvents: activeTool === 'select' ? 'auto' : 'none',
cursor: activeTool === 'select' ? 'move' : 'default'
}}
onMouseDown={(e) => handleDragStart(e, el.id)}
>
{/* Resize Handles */}
{selectedElementId === el.id && (
<>
<div
className="absolute w-3 h-3 bg-blue-500 border border-white rounded-full -top-1 -left-1 cursor-nw-resize"
onMouseDown={(e) => handleResizeStart(e, 'top-left', el.id)}
/>
<div
className="absolute w-3 h-3 bg-blue-500 border border-white rounded-full -top-1 -right-1 cursor-ne-resize"
onMouseDown={(e) => handleResizeStart(e, 'top-right', el.id)}
/>
<div
className="absolute w-3 h-3 bg-blue-500 border border-white rounded-full -bottom-1 -left-1 cursor-sw-resize"
onMouseDown={(e) => handleResizeStart(e, 'bottom-left', el.id)}
/>
<div
className="absolute w-3 h-3 bg-blue-500 border border-white rounded-full -bottom-1 -right-1 cursor-se-resize"
onMouseDown={(e) => handleResizeStart(e, 'bottom-right', el.id)}
/>
</>
)}

{/* Element Controls */}
{selectedElementId === el.id && (
<div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex gap-1 bg-white dark:bg-gray-800 shadow-md rounded-md p-1 z-50">
<Button
variant="ghost"
size="icon"
className="h-6 w-6 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
onClick={(e) => {
e.stopPropagation();
removeElement(el.id);
}}
title="Delete"
>
<Trash2 className="h-3 w-3" />
</Button>
<Button
variant="ghost"
size="icon"
className="h-6 w-6 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
onClick={(e) => {
e.stopPropagation();
duplicateElement(el.id);
}}
title="Duplicate"
>
<Copy className="h-3 w-3" />
</Button>
<Button
variant="ghost"
size="icon"
className="h-6 w-6 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
onClick={(e) => {
e.stopPropagation();
updateSelectedElement({ locked: !el.locked });
}}
title={el.locked ? "Unlock" : "Lock"}
>
{el.locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
</Button>
</div>
)}

{el.type === 'text' ? (
<div
contentEditable={activeTool === 'select' && !el.locked}
suppressContentEditableWarning
onBlur={(e) => {
setElements(elements.map(item =>
item.id === el.id ? { ...item, content: e.currentTarget.innerText } : item
));
}}
style={{
fontSize: `${el.fontSize}px`,
color: el.color,
fontFamily: el.fontFamily,
fontWeight: el.fontWeight,
fontStyle: el.fontStyle,
textDecoration: el.textDecoration,
textAlign: el.textAlign,
whiteSpace: 'nowrap',
userSelect: 'none',
padding: '4px',
minWidth: '20px',
opacity: el.opacity,
width: el.width ? `${el.width}%` : 'auto',
height: el.height ? `${el.height}%` : 'auto'
}}
className="font-sans outline-none border border-transparent hover:border-dashed hover:border-gray-300 focus:border-blue-500 bg-transparent"
>
{el.content}
</div>
) : (
<img
src={URL.createObjectURL(new Blob([el.imageBytes!]))}
alt="element"
className="pointer-events-none select-none"
style={{
width: `${el.width}%`,
height: 'auto',
opacity: el.opacity
}}
draggable={false}
/>
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
title: "PDF Editor Help",
message: "Use the toolbar to add and edit elements. Right-click for more options.",
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