"use client";

import { useState, useRef, useEffect, useCallback, useMemo, createContext, useContext } from "react";
import { saveAs } from "file-saver";
import { FileUpload } from "../ui/file-upload";
import { Button } from "../ui/button";
import { 
    // Text & Typography
    Type, TypeOutline, Bold, Italic, Underline, Strikethrough, Superscript, Subscript,
    AlignLeft, AlignCenter, AlignRight, AlignJustify, List, ListOrdered, ListTodo,
    Indent, Outdent, Quote, Heading1, Heading2, Heading3, Heading4, Heading5, Heading6,
    
    // Shapes & Drawing
    Square, Circle, Triangle, Hexagon, Star, Heart, ArrowRight, ArrowUp, ArrowDown, ArrowLeft,
    PenTool, Highlighter, Eraser, Pencil, PaintBucket, Droplets, Move, Minus, Plus,
    
    // Media & Files
    Image as ImageIcon, ImagePlus, FileImage, FileText, FilePlus, FolderOpen, Upload, Download,
    Save, Copy, Clipboard, Trash2, Link, Paperclip, Camera, Video, Music,
    
    // Layout & Design
    Grid3x3, Layout, Layers, Group, Ungroup, BringToFront, SendToBack, FlipHorizontal,
    FlipVertical, RotateCw, RotateCcw, Maximize, Minimize, Expand, Shrink, Fullscreen,
    
    // Navigation & View
    ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ZoomIn, ZoomOut, Search, Eye, EyeOff,
    Monitor, Smartphone, Tablet, Sun, Moon, Scan, Ruler, Square as SquareIcon,
    
    // Actions & Tools
    Settings, Sliders, HelpCircle, Info, Command, History, Undo, Redo, RefreshCw,
    Check, X, MoreVertical, MoreHorizontal, Menu, Filter, Palette, Sparkles, MousePointer2, Hand, ScanBarcode,
    
    // Collaboration
    Users, UserPlus, MessageSquare, Share2, Lock, Unlock, Shield, Clock,
    
    // Advanced
    BarChart, PieChart, LineChart, Calendar, Map as MapIcon, MapPin, Phone, Mail, Globe,
    Code, Database, Cloud, Wifi, Battery, Bell, Mic, MicOff, Volume2, VolumeX,
    
    // Annotations
    MessageCircle, Stamp, Pen, Edit3, Highlighter as HighlighterIcon, StickyNote,
    
    // Forms & Signatures
    FileSignature, PenTool as SignatureTool, CheckSquare, Square as CheckSquareIcon,
    
    // Additional Icons
    Hash, ArrowRight as ArrowRightIcon, ArrowLeft as ArrowLeftIcon, ArrowUp as ArrowUpIcon,
    ArrowDown as ArrowDownIcon, Move as MoveIcon, Sliders as SlidersIcon,
    Settings as SettingsIcon, HelpCircle as HelpIcon
} from "lucide-react";
import { pdfStrategyManager, getPdfJs } from "../../lib/pdf-service";
import { toast } from "../../lib/use-toast";
import { cn } from "../../lib/utils";

// ================== INTERFACES & TYPES ==================

// Editor element interface
interface EditorElement {
    id: string;
    type: "text" | "image" | "path" | "shape" | "arrow" | "line" | "stamp" | "chart" | "form" | "signature" | "annotation" | "table" | "video" | "audio" | "code" | "map" | "calendar" | "contact" | "qr" | "barcode";
    x: number; // Percentage 0-100 relative to container
    y: number; // Percentage 0-100 relative to container
    page: number; // 1-based
    width?: number; // Percentage
    height?: number; // Percentage (aspect ratio maintained)
    content?: string; // for text
    imageBytes?: ArrayBuffer; // for image
    imageType?: "png" | "jpg" | "svg" | "gif" | "webp" | "mp4" | "mp3";
    fontSize?: number;
    color?: string;
    backgroundColor?: string;
    borderColor?: string;
    borderWidth?: number;
    pathData?: { x: number, y: number }[]; // for freehand
    shapeType?: "rectangle" | "circle" | "triangle" | "hexagon" | "star" | "heart" | "arrow" | "line" | "polygon" | "custom";
    strokeWidth?: number;
    opacity?: number;
    fontFamily?: string;
    fontWeight?: string;
    fontStyle?: string;
    textDecoration?: string;
    textAlign?: "left" | "center" | "right" | "justify";
    verticalAlign?: "top" | "middle" | "bottom";
    rotation?: number;
    locked?: boolean;
    zIndex?: number;
    groupId?: string;
    points?: { x: number, y: number }[]; // for arrow, line
    borderRadius?: number;
    shadowBlur?: number;
    shadowColor?: string;
    shadowOffsetX?: number;
    shadowOffsetY?: number;
    letterSpacing?: number;
    lineHeight?: number;
    paragraphSpacing?: number;
    textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
    textEffect?: "none" | "shadow" | "outline" | "emboss" | "engrave";
    gradient?: {
        type: "linear" | "radial";
        colors: string[];
        direction?: number; // for linear
        positions?: number[]; // for radial
    };
    pattern?: {
        type: "dots" | "lines" | "grid" | "diagonal" | "waves" | "custom";
        color: string;
        size: number;
    };
    animation?: {
        type: "none" | "pulse" | "bounce" | "fade" | "slide" | "rotate" | "zoom";
        duration: number;
        delay: number;
        repeat: "infinite" | "once" | number;
    };
    mask?: {
        type: "none" | "rectangle" | "circle" | "polygon" | "image";
        data?: any; // depends on type
    };
    blendMode?: "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion";
    filter?: string; // CSS filter string
    transform?: {
        perspective?: number;
        rotateX?: number;
        rotateY?: number;
        rotateZ?: number;
        scaleX?: number;
        scaleY?: number;
        skewX?: number;
        skewY?: number;
    };
    clipPath?: string; // SVG clip path
    data?: any; // Additional data for specific element types
    metadata?: {
        author?: string;
        created?: Date;
        modified?: Date;
        tags?: string[];
        notes?: string;
    };
    accessibility?: {
        alt?: string;
        title?: string;
        role?: string;
        tabIndex?: number;
        ariaLabel?: string;
    };
    constraints?: {
        minWidth?: number;
        maxWidth?: number;
        minHeight?: number;
        maxHeight?: number;
        aspectRatio?: number;
        snapToGrid?: boolean;
    };
    interactivity?: {
        clickable?: boolean;
        hoverable?: boolean;
        draggable?: boolean;
        resizable?: boolean;
        rotatable?: boolean;
        link?: string;
        action?: string;
        target?: "_blank" | "_self" | "_parent" | "_top";
    };
}

// History state for undo/redo
interface HistoryState {
    elements: EditorElement[];
    currentPage: number;
    timestamp: number;
    description?: string;
}

// Font interface
interface Font {
    family: string;
    category: string;
    variants: string[];
    weights: string[];
    styles: string[];
    preview?: string;
    googleFonts?: boolean;
    local?: boolean;
}

// Template interface
interface Template {
    id: string;
    name: string;
    description: string;
    category: string;
    thumbnail: string;
    elements: EditorElement[];
    pageSettings: {
        width: number;
        height: number;
        orientation: "portrait" | "landscape";
        margins: {
            top: number;
            right: number;
            bottom: number;
            left: number;
        };
    };
    metadata?: {
        author?: string;
        license?: string;
        tags?: string[];
    };
}

// Collaboration interface
interface Collaboration {
    id: string;
    users: User[];
    comments: Comment[];
    changes: Change[];
    status: "active" | "inactive";
    permissions: {
        canEdit: boolean;
        canComment: boolean;
        canShare: boolean;
        canExport: boolean;
    };
}

// User interface
interface User {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    color: string;
    cursor?: {
        x: number;
        y: number;
        page: number;
    };
    selection?: {
        elementIds: string[];
        range?: {
            start: number;
            end: number;
        };
    };
}

// Comment interface
interface Comment {
    id: string;
    userId: string;
    elementId?: string;
    page: number;
    x: number;
    y: number;
    text: string;
    timestamp: Date;
    resolved: boolean;
    replies?: Comment[];
}

// Change interface
interface Change {
    id: string;
    userId: string;
    timestamp: Date;
    type: "add" | "modify" | "delete" | "move" | "resize" | "rotate" | "style";
    elementId?: string;
    data?: any;
    description?: string;
}

// Page interface
interface Page {
    id: number;
    width: number;
    height: number;
    orientation: "portrait" | "landscape";
    backgroundColor?: string;
    backgroundImage?: string;
    margins: {
        top: number;
        right: number;
        bottom: number;
        left: number;
    };
    grid?: {
        enabled: boolean;
        size: number;
        color: string;
        opacity: number;
        subdivisions?: number;
    };
    guides?: {
        horizontal: number[];
        vertical: number[];
        color: string;
        opacity: number;
    };
}

// Keyboard shortcut interface
interface KeyboardShortcut {
    key: string;
    ctrl?: boolean;
    alt?: boolean;
    shift?: boolean;
    action: string;
    description: string;
}

// ================== CONTEXT ==================

interface EditorContextType {
    // State
    elements: EditorElement[];
    currentPage: number;
    pages: Page[];
    selectedElementIds: string[];
    activeTool: string;
    zoom: number;
    
    // Actions
    addElement: (element: EditorElement) => void;
    updateElement: (id: string, updates: Partial<EditorElement>) => void;
    deleteElement: (id: string) => void;
    selectElement: (id: string, multi?: boolean) => void;
    deselectAll: () => void;
    setCurrentPage: (page: number) => void;
    setActiveTool: (tool: string) => void;
    setZoom: (zoom: number) => void;
    
    // History
    undo: () => void;
    redo: () => void;
    saveToHistory: (description?: string) => void;
    
    // Clipboard
    copy: () => void;
    paste: () => void;
    cut: () => void;
    
    // File operations
    save: () => void;
    export: (format: string) => void;
    import: (file: File) => void;
    
    // UI
    showGrid: boolean;
    setShowGrid: (show: boolean) => void;
    darkMode: boolean;
    setDarkMode: (dark: boolean) => void;
}

const EditorContext = createContext<EditorContextType | null>(null);

// ================== CONSTANTS ==================

// Google Fonts API key
const GOOGLE_FONTS_API_KEY = "AIzaSyCvA2n2RkY5h8K8vQj6p9Z2s6t7u8v9w0x";

// Keyboard shortcuts
const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
    { key: "c", ctrl: true, action: "copy", description: "Copy" },
    { key: "v", ctrl: true, action: "paste", description: "Paste" },
    { key: "x", ctrl: true, action: "cut", description: "Cut" },
    { key: "z", ctrl: true, action: "undo", description: "Undo" },
    { key: "z", ctrl: true, shift: true, action: "redo", description: "Redo" },
    { key: "a", ctrl: true, action: "selectAll", description: "Select All" },
    { key: "s", ctrl: true, action: "save", description: "Save" },
    { key: "Delete", action: "delete", description: "Delete" },
    { key: "d", ctrl: true, action: "duplicate", description: "Duplicate" },
    { key: "g", ctrl: true, action: "toggleGrid", description: "Toggle Grid" },
    { key: "+", ctrl: true, action: "zoomIn", description: "Zoom In" },
    { key: "-", ctrl: true, action: "zoomOut", description: "Zoom Out" },
    { key: "0", ctrl: true, action: "resetZoom", description: "Reset Zoom" },
    { key: "f", ctrl: true, action: "search", description: "Search" },
    { key: "h", ctrl: true, action: "help", description: "Help" },
];

// Default page settings
const DEFAULT_PAGE_SETTINGS: Page = {
    id: 1,
    width: 210, // A4 width in mm
    height: 297, // A4 height in mm
    orientation: "portrait",
    margins: {
        top: 20,
        right: 20,
        bottom: 20,
        left: 20
    },
    grid: {
        enabled: false,
        size: 10,
        color: "#e0e0e0",
        opacity: 0.5
    },
    guides: {
        horizontal: [],
        vertical: [],
        color: "#ff0000",
        opacity: 0.5
    }
};

// Default font settings
const DEFAULT_FONT_SETTINGS = {
    family: "Roboto",
    size: 12,
    weight: "normal",
    style: "normal",
    color: "#000000",
    backgroundColor: "transparent",
    letterSpacing: 0,
    lineHeight: 1.5,
    paragraphSpacing: 0,
    textTransform: "none",
    textAlign: "left",
    verticalAlign: "top",
    textDecoration: "none",
    textEffect: "none",
    opacity: 1,
    rotation: 0,
    borderRadius: 0,
    borderWidth: 0,
    borderColor: "#000000",
    shadowBlur: 0,
    shadowColor: "#000000",
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    gradient: null,
    pattern: null,
    animation: null,
    mask: null,
    blendMode: "normal",
    filter: "none",
    transform: {
        perspective: 0,
        rotateX: 0,
        rotateY: 0,
        rotateZ: 0,
        scaleX: 1,
        scaleY: 1,
        skewX: 0,
        skewY: 0
    },
    clipPath: null,
    constraints: {
        minWidth: 10,
        maxWidth: 100,
        minHeight: 10,
        maxHeight: 100,
        aspectRatio: null,
        snapToGrid: false
    },
    interactivity: {
        clickable: false,
        hoverable: false,
        draggable: true,
        resizable: true,
        rotatable: true,
        link: "",
        action: "",
        target: "_blank"
    }
};

// ================== MAIN COMPONENT ==================

export function AdvancedPdfEditor() {
    // ================== STATE ==================
    
    // File and PDF state
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [numPages, setNumPages] = useState(0);
    const [pages, setPages] = useState<Page[]>([DEFAULT_PAGE_SETTINGS]);
    const [pageTextContent, setPageTextContent] = useState<any[]>([]); // Store extracted text content
    
    // Elements state
    const [elements, setElements] = useState<EditorElement[]>([]);
    const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
    const [activeTool, setActiveTool] = useState("select");
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
    const [text, setText] = useState("New Text");
    const [fontSize, setFontSize] = useState(24);
    const [color, setColor] = useState("#000000");
    const [backgroundColor, setBackgroundColor] = useState("transparent");
    const [strokeWidth, setStrokeWidth] = useState(3);
    const [fontFamily, setFontFamily] = useState("Roboto");
    const [isBold, setIsBold] = useState(false);
    const [isItalic, setIsItalic] = useState(false);
    const [isUnderline, setIsUnderline] = useState(false);
    const [textAlign, setTextAlign] = useState<"left" | "center" | "right" | "justify">("left");
    const [verticalAlign, setVerticalAlign] = useState<"top" | "middle" | "bottom">("top");
    const [opacity, setOpacity] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [borderRadius, setBorderRadius] = useState(0);
    const [borderWidth, setBorderWidth] = useState(0);
    const [borderColor, setBorderColor] = useState("#000000");
    const [letterSpacing, setLetterSpacing] = useState(0);
    const [lineHeight, setLineHeight] = useState(1.5);
    const [paragraphSpacing, setParagraphSpacing] = useState(0);
    const [textTransform, setTextTransform] = useState<"none" | "uppercase" | "lowercase" | "capitalize">("none");
    const [textEffect, setTextEffect] = useState<"none" | "shadow" | "outline" | "emboss" | "engrave">("none");
    const [shadowBlur, setShadowBlur] = useState(0);
    const [shadowColor, setShadowColor] = useState("#000000");
    const [shadowOffsetX, setShadowOffsetX] = useState(0);
    const [shadowOffsetY, setShadowOffsetY] = useState(0);
    const [blendMode, setBlendMode] = useState("normal");
    const [filter, setFilter] = useState("none");
    
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
    const [googleFonts, setGoogleFonts] = useState<Font[]>([]);
    const [localFonts, setLocalFonts] = useState<Font[]>([]);
    const [fontSearchQuery, setFontSearchQuery] = useState("");
    const [fontCategory, setFontCategory] = useState("all");
    const [isLoadingFonts, setIsLoadingFonts] = useState(false);
    const [showFontDropdown, setShowFontDropdown] = useState(false);
    const [pendingEditId, setPendingEditId] = useState<string | null>(null); // For auto-editing new elements
    
    // Templates state
    const [templates, setTemplates] = useState<Template[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
    const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
    
    // UI state
    const [showToolbar, setShowToolbar] = useState(true);
    const [showProperties, setShowProperties] = useState(true);
    const [showLayers, setShowLayers] = useState(false);
    const [showTemplates, setShowTemplates] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
    const [darkMode, setDarkMode] = useState(false);
    const [viewMode, setViewMode] = useState<"desktop" | "tablet" | "mobile">("desktop");
    const [continuousScroll, setContinuousScroll] = useState(true);
    const [showGrid, setShowGrid] = useState(false);
    const [snapToGrid, setSnapToGrid] = useState(false);
    const [gridSize, setGridSize] = useState(10);
    const [showRulers, setShowRulers] = useState(false);
    const [showGuides, setShowGuides] = useState(false);
    const [guides, setGuides] = useState({ horizontal: [], vertical: [] });
    
    // Collaboration state
    const [collaboration, setCollaboration] = useState<Collaboration | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [showComments, setShowComments] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    
    // Export state
    const [exportFormat, setExportFormat] = useState("pdf");
    const [exportQuality, setExportQuality] = useState("high");
    const [exportOptions, setExportOptions] = useState({
        includeComments: true,
        includeGuides: false,
        includeGrid: false,
        compressImages: true,
        embedFonts: true
    });
    
    // Performance state
    const [renderMode, setRenderMode] = useState<"canvas" | "svg" | "webgl">("canvas");
    const [performanceMode, setPerformanceMode] = useState<"quality" | "balanced" | "performance">("balanced");
    
    // Accessibility state
    const [highContrast, setHighContrast] = useState(false);
    const [reducedMotion, setReducedMotion] = useState(false);
    const [screenReader, setScreenReader] = useState(false);
    
    // ================== EFFECTS ==================
    
    // Load Google Fonts on mount
    useEffect(() => {
        loadGoogleFonts();
        loadLocalFonts();
        loadTemplates();
    }, []);
    
    // Load Google Fonts from API
    const loadGoogleFonts = async () => {
        setIsLoadingFonts(true);
        try {
            // First, load popular fonts directly
            const popularFontsList = [
                "Roboto", "Open Sans", "Lato", "Montserrat", "Oswald", 
                "Raleway", "Poppins", "Roboto Slab", "Nunito", "Ubuntu",
                "Playfair Display", "Merriweather", "PT Sans", "Roboto Mono", "Source Sans Pro",
                "Dancing Script", "Bebas Neue", "Righteous", "Bangers", "Pacifico",
                "Caveat", "Kalam", "Permanent Marker", "Shadows Into Light", "Lobster",
                "Amatic SC", "Indie Flower", "Gloria Hallelujah", "Satisfy", "Caveat Brush",
                "Anton", "Francois One", "Fredoka One", "Luckiest Guy",
                "Lobster Two", "ZCOOL KuangLe"
            ].map(font => ({
                family: font,
                category: "popular",
                variants: ["regular", "italic", "bold", "bolditalic"],
                weights: ["400", "700"],
                styles: ["normal", "italic"],
                googleFonts: true,
                local: false
            }));
            
            // Then try to fetch from Google Fonts API
            try {
                const response = await fetch(`https://www.googleapis.com/webfonts/v1/webfonts?key=${GOOGLE_FONTS_API_KEY}&sort=popularity`);
                if (response.ok) {
                    const data = await response.json();
                    const allFonts = data.items.map((font: any) => ({
                        family: font.family,
                        category: font.category,
                        variants: font.variants,
                        weights: font.variants.filter((v: string) => /^\d+$/.test(v)),
                        styles: [...new Set(font.variants.filter((v: string) => /italic|regular/.test(v)))],
                        googleFonts: true,
                        local: false
                    }));
                    
                    // Combine popular fonts with API results, removing duplicates
                    const uniqueFontsMap = new Map();
                    [...popularFontsList, ...allFonts].forEach(font => {
                        if (!uniqueFontsMap.has(font.family)) {
                            uniqueFontsMap.set(font.family, font);
                        }
                    });
                    setGoogleFonts(Array.from(uniqueFontsMap.values()));
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
    
    // Load local fonts
    const loadLocalFonts = async () => {
        try {
            const fontFaces = await document.fonts.ready;
            const localFontFamilies = Array.from(fontFaces).map(face => face.family);
            
            const localFontsList = localFontFamilies.map(font => ({
                family: font,
                category: "local",
                variants: ["regular", "italic", "bold", "bolditalic"],
                weights: ["400", "700"],
                styles: ["normal", "italic"],
                googleFonts: false,
                local: true
            }));
            
            setLocalFonts(localFontsList);
        } catch (error) {
            console.error("Error loading local fonts:", error);
        }
    };
    
    // Load templates
    const loadTemplates = async () => {
        setIsLoadingTemplates(true);
        try {
            // Load default templates
            const mockTemplates: Template[] = [
                {
                    id: "1",
                    name: "Business Report",
                    description: "Professional business report template",
                    category: "Business",
                    thumbnail: "/templates/business-report.jpg",
                    elements: [],
                    pageSettings: {
                        width: 210,
                        height: 297,
                        orientation: "portrait",
                        margins: { top: 20, right: 20, bottom: 20, left: 20 }
                    }
                },
                {
                    id: "2",
                    name: "Newsletter",
                    description: "Modern newsletter template",
                    category: "Marketing",
                    thumbnail: "/templates/newsletter.jpg",
                    elements: [],
                    pageSettings: {
                        width: 210,
                        height: 297,
                        orientation: "portrait",
                        margins: { top: 15, right: 15, bottom: 15, left: 15 }
                    }
                },
                {
                    id: "3",
                    name: "Invoice",
                    description: "Professional invoice template",
                    category: "Finance",
                    thumbnail: "/templates/invoice.jpg",
                    elements: [],
                    pageSettings: {
                        width: 210,
                        height: 297,
                        orientation: "portrait",
                        margins: { top: 20, right: 20, bottom: 20, left: 20 }
                    }
                }
            ];
            
            setTemplates(mockTemplates);
        } catch (error) {
            console.error("Error loading templates:", error);
        } finally {
            setIsLoadingTemplates(false);
        }
    };
    
    // Filter fonts based on search and category
    const filteredFonts = useMemo(() => {
        // Merge and deduplicate fonts
        const uniqueFontsMap = new Map<string, Font>();
        [...googleFonts, ...localFonts].forEach(font => {
            if (!uniqueFontsMap.has(font.family)) {
                uniqueFontsMap.set(font.family, font);
            }
        });
        
        let filtered = Array.from(uniqueFontsMap.values());
        
        if (fontCategory !== "all") {
            filtered = filtered.filter(font => font.category === fontCategory);
        }
        
        if (fontSearchQuery) {
            filtered = filtered.filter(font => 
                font.family.toLowerCase().includes(fontSearchQuery.toLowerCase())
            );
        }
        
        return filtered.slice(0, 100); // Limit to 100 for performance
    }, [googleFonts, localFonts, fontCategory, fontSearchQuery]);
    
    // Load a specific font
    const loadFont = (fontFamily: string) => {
        const font = filteredFonts.find(f => f.family === fontFamily);
        if (!font) return;
        
        if (font.googleFonts) {
            const link = document.createElement('link');
            link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, '+')}:wght@100;200;300;400;500;600;700;800;900&display=swap`;
            link.rel = 'stylesheet';
            document.head.appendChild(link);
            
            // Set a timeout to remove the link after loading
            setTimeout(() => {
                if (document.head.contains(link)) {
                    document.head.removeChild(link);
                }
            }, 5000);
        }
    };
    
    // Sync properties when selection changes
    useEffect(() => {
        if (selectedElementIds.length === 1) {
            const el = elements.find(e => e.id === selectedElementIds[0]);
            if (el) {
                if (el.color) setColor(el.color);
                if (el.backgroundColor) setBackgroundColor(el.backgroundColor);
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
                if (el.verticalAlign) setVerticalAlign(el.verticalAlign);
                if (el.opacity !== undefined) setOpacity(el.opacity);
                if (el.rotation !== undefined) setRotation(el.rotation);
                if (el.borderRadius !== undefined) setBorderRadius(el.borderRadius);
                if (el.borderWidth !== undefined) setBorderWidth(el.borderWidth);
                if (el.borderColor !== undefined) setBorderColor(el.borderColor);
                if (el.letterSpacing !== undefined) setLetterSpacing(el.letterSpacing);
                if (el.lineHeight !== undefined) setLineHeight(el.lineHeight);
                if (el.paragraphSpacing !== undefined) setParagraphSpacing(el.paragraphSpacing);
                if (el.textTransform) setTextTransform(el.textTransform);
                if (el.textEffect) setTextEffect(el.textEffect);
                if (el.shadowBlur !== undefined) setShadowBlur(el.shadowBlur);
                if (el.shadowColor) setShadowColor(el.shadowColor);
                if (el.shadowOffsetX !== undefined) setShadowOffsetX(el.shadowOffsetX);
                if (el.shadowOffsetY !== undefined) setShadowOffsetY(el.shadowOffsetY);
                if (el.blendMode) setBlendMode(el.blendMode);
                if (el.filter) setFilter(el.filter);
            }
        }
    }, [selectedElementIds, elements]);

    // Auto-trigger edit mode for new elements
    useEffect(() => {
        if (pendingEditId) {
            const element = elements.find(el => el.id === pendingEditId);
            if (element) {
                handleElementDoubleClick(pendingEditId);
                setPendingEditId(null);
            }
        }
    }, [pendingEditId, elements]);
    
    // Save current state to history
    const saveToHistory = useCallback((description?: string) => {
        const newState = {
            elements: [...elements],
            currentPage,
            timestamp: Date.now(),
            description
        };
        
        // Remove any states after the current index
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(newState);
        
        // Limit history to 100 states
        if (newHistory.length > 100) {
            newHistory.shift();
        }
        
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    }, [elements, currentPage, history, historyIndex]);
    
    // Undo
    const undo = useCallback(() => {
        if (historyIndex > 0) {
            const prevState = history[historyIndex - 1];
            setElements(prevState.elements);
            setCurrentPage(prevState.currentPage);
            setHistoryIndex(historyIndex - 1);
        }
    }, [historyIndex, history]);
    
    // Redo
    const redo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            const nextState = history[historyIndex + 1];
            setElements(nextState.elements);
            setCurrentPage(nextState.currentPage);
            setHistoryIndex(historyIndex + 1);
        }
    }, [historyIndex, history]);
    
    // Fit to page
    const fitToPage = async () => {
        if (!file || !scrollContainerRef.current) return;
        
        try {
            const pdfjsLib = await getPdfJs();
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await (pdfjsLib as any).getDocument(new Uint8Array(arrayBuffer)).promise;
            const page = await pdf.getPage(currentPage);
            const unscaledViewport = page.getViewport({ scale: 1.5 }); // Base scale 1.5
            
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

            // Extract text content for editing
            const textContentArray = [];
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                const viewport = page.getViewport({ scale: 1.0 });
                textContentArray.push({ page: i, items: content.items, styles: content.styles, viewport });
            }
            setPageTextContent(textContentArray);
            
            // Initialize canvas refs
            canvasRefs.current = Array(pdf.numPages).fill(null);
            overlayCanvasRefs.current = Array(pdf.numPages).fill(null);
            renderTaskRefs.current = Array(pdf.numPages).fill(null);
            
            // Initialize pages
            const newPages: Page[] = [];
            for (let i = 1; i <= pdf.numPages; i++) {
                newPages.push({
                    ...DEFAULT_PAGE_SETTINGS,
                    id: i
                });
            }
            setPages(newPages);
            
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
            const scale = 1.5 * (zoom / 100);
            
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
            
            // Draw guides if enabled
            if (showGuides) {
                ctx.strokeStyle = "#ff0000";
                ctx.lineWidth = 1;
                ctx.setLineDash([5, 5]);
                
                // Horizontal guides
                guides.horizontal.forEach(y => {
                    const yPos = (y / 100) * height;
                    ctx.beginPath();
                    ctx.moveTo(0, yPos);
                    ctx.lineTo(width, yPos);
                    ctx.stroke();
                });
                
                // Vertical guides
                guides.vertical.forEach(x => {
                    const xPos = (x / 100) * width;
                    ctx.beginPath();
                    ctx.moveTo(xPos, 0);
                    ctx.lineTo(xPos, height);
                    ctx.stroke();
                });
                
                ctx.setLineDash([]);
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
                
                // Apply blend mode
                ctx.globalCompositeOperation = (el.blendMode as GlobalCompositeOperation) || 'source-over';
                
                // Apply filter
                if (el.filter) {
                    ctx.filter = el.filter;
                }
                
                // Apply shadow
                if (el.shadowBlur || el.shadowOffsetX || el.shadowOffsetY) {
                    ctx.shadowBlur = el.shadowBlur || 0;
                    ctx.shadowColor = el.shadowColor || 'transparent';
                    ctx.shadowOffsetX = el.shadowOffsetX || 0;
                    ctx.shadowOffsetY = el.shadowOffsetY || 0;
                }
                
                // Draw based on element type
                if (el.type === 'text') {
                    // Apply text styles
                    ctx.font = `${el.fontWeight || 'normal'} ${el.fontStyle || 'normal'} ${el.fontSize || 12}px ${el.fontFamily || 'Arial'}`;
                    ctx.fillStyle = el.color || '#000000';
                    ctx.textAlign = (el.textAlign === 'justify' ? 'left' : el.textAlign) as CanvasTextAlign || 'left';
                    ctx.textBaseline = 'top';
                    
                    // Apply letter spacing
                    if (el.letterSpacing) {
                        ctx.letterSpacing = `${el.letterSpacing}px`;
                    }
                    
                    // Apply text effects
                    if (el.textEffect === 'outline') {
                        ctx.strokeStyle = el.color || '#000000';
                        ctx.lineWidth = 1;
                    }
                    
                    const x = (el.x / 100) * width;
                    const y = (el.y / 100) * height;
                    
                    if (el.textEffect === 'shadow') {
                        // Draw shadow first
                        ctx.fillStyle = el.shadowColor || '#888888';
                        ctx.fillText(el.content || '', x + (el.shadowOffsetX || 0), y + (el.shadowOffsetY || 0));
                    }
                    
                    // Draw main text
                    ctx.fillStyle = el.color || '#000000';
                    ctx.fillText(el.content || '', x, y);
                    
                    if (el.textEffect === 'outline') {
                        ctx.strokeText(el.content || '', x, y);
                    }
                } else if (el.type === 'image') {
                    if (el.imageBytes) {
                        const img = new Image();
                        img.onload = () => {
                            const x = (el.x / 100) * width;
                            const y = (el.y / 100) * height;
                            const imgWidth = ((el.width || 0) / 100) * width;
                            const imgHeight = ((el.height || 0) / 100) * height;
                            
                            // Apply border radius if needed
                            if (el.borderRadius) {
                                ctx.beginPath();
                                ctx.roundRect(x, y, imgWidth, imgHeight, el.borderRadius);
                                ctx.clip();
                            }
                            
                            ctx.drawImage(img, x, y, imgWidth, imgHeight);
                        };
                        img.src = URL.createObjectURL(new Blob([el.imageBytes]));
                    }
                } else if (el.type === 'path' && el.pathData) {
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
                    ctx.fillStyle = el.backgroundColor || 'transparent';
                    ctx.lineWidth = el.strokeWidth || 2;
                    const x = (el.x / 100) * width;
                    const y = (el.y / 100) * height;
                    const w = ((el.width || 0) / 100) * width;
                    const h = ((el.height || 0) / 100) * height;
                    
                    if (el.shapeType === 'rectangle') {
                        if (el.borderRadius) {
                            // Draw rounded rectangle
                            ctx.beginPath();
                            ctx.roundRect(x, y, w, h, el.borderRadius);
                            ctx.fill();
                            ctx.stroke();
                        } else {
                            // Draw regular rectangle
                            ctx.fillRect(x, y, w, h);
                            ctx.strokeRect(x, y, w, h);
                        }
                    } else if (el.shapeType === 'circle') {
                        ctx.beginPath();
                        const radius = Math.min(w, h) / 2;
                        ctx.arc(x + w/2, y + h/2, radius, 0, 2 * Math.PI);
                        ctx.fill();
                        ctx.stroke();
                    } else if (el.shapeType === 'triangle') {
                        ctx.beginPath();
                        ctx.moveTo(x + w/2, y);
                        ctx.lineTo(x, y + h);
                        ctx.lineTo(x + w, y + h);
                        ctx.closePath();
                        ctx.fill();
                        ctx.stroke();
                    } else if (el.shapeType === 'hexagon') {
                        ctx.beginPath();
                        const size = Math.min(w, h) / 2;
                        const centerX = x + w/2;
                        const centerY = y + h/2;
                        
                        for (let i = 0; i < 6; i++) {
                            const angle = (Math.PI / 3) * i;
                            const xPos = centerX + size * Math.cos(angle);
                            const yPos = centerY + size * Math.sin(angle);
                            
                            if (i === 0) {
                                ctx.moveTo(xPos, yPos);
                            } else {
                                ctx.lineTo(xPos, yPos);
                            }
                        }
                        
                        ctx.closePath();
                        ctx.fill();
                        ctx.stroke();
                    } else if (el.shapeType === 'star') {
                        ctx.beginPath();
                        const centerX = x + w/2;
                        const centerY = y + h/2;
                        const outerRadius = Math.min(w, h) / 2;
                        const innerRadius = outerRadius / 2;
                        const numPoints = 5;
                        
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
                        ctx.fill();
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
                        ctx.fill();
                        ctx.stroke();
                    } else if (el.shapeType === 'arrow' && el.points && el.points.length >= 2) {
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
                    } else if (el.shapeType === 'line' && el.points && el.points.length >= 2) {
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
                } else if (activeTool === 'hexagon') {
                    ctx.beginPath();
                    const size = Math.min(w, h) / 2;
                    const centerX = x + w/2;
                    const centerY = y + h/2;
                    
                    for (let i = 0; i < 6; i++) {
                        const angle = (Math.PI / 3) * i;
                        const xPos = centerX + size * Math.cos(angle);
                        const yPos = centerY + size * Math.sin(angle);
                        
                        if (i === 0) {
                            ctx.moveTo(xPos, yPos);
                        } else {
                            ctx.lineTo(xPos, yPos);
                        }
                    }
                    
                    ctx.closePath();
                    ctx.stroke();
                } else if (activeTool === 'star') {
                    ctx.beginPath();
                    const centerX = x + w/2;
                    const centerY = y + h/2;
                    const outerRadius = Math.min(w, h) / 2;
                    const innerRadius = outerRadius / 2;
                    const numPoints = 5;
                    
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
    }, [elements, numPages, isDrawing, currentPath, currentShape, color, strokeWidth, activeTool, zoom, showGrid, gridSize, showGuides, guides]);
    
    // Handle keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const shortcut = KEYBOARD_SHORTCUTS.find(s => 
                s.key === e.key && 
                s.ctrl === e.ctrlKey && 
                s.alt === e.altKey && 
                s.shift === e.shiftKey
            );
            
            if (!shortcut) return;
            
            e.preventDefault();
            
            switch (shortcut.action) {
                case 'copy':
                    copySelectedElements();
                    break;
                case 'paste':
                    pasteElements();
                    break;
                case 'cut':
                    cutSelectedElements();
                    break;
                case 'undo':
                    undo();
                    break;
                case 'redo':
                    redo();
                    break;
                case 'selectAll':
                    selectAllElementsOnPage();
                    break;
                case 'save':
                    savePdf();
                    break;
                case 'delete':
                    deleteSelectedElements();
                    break;
                case 'duplicate':
                    duplicateSelectedElements();
                    break;
                case 'toggleGrid':
                    setShowGrid(!showGrid);
                    break;
                case 'zoomIn':
                    setZoom(Math.min(200, zoom + 10));
                    break;
                case 'zoomOut':
                    setZoom(Math.max(25, zoom - 10));
                    break;
                case 'resetZoom':
                    setZoom(100);
                    break;
                case 'search':
                    // Focus search input
                    break;
                case 'help':
                    setShowHelp(true);
                    break;
            }
        };
        
        document.addEventListener('keydown', handleKeyDown);
        
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [zoom, showGrid]);
    
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
            // Check if clicking on an element
            const canvas = canvasRefs.current[pageIndex];
            if (!canvas) return;
            
            const rect = canvas.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            
            // Find element at position
            const clickedElement = elements.find(el => {
                if (el.page !== pageNum) return false;
                
                const elX = (el.x / 100) * rect.width;
                const elY = (el.y / 100) * rect.height;
                const elWidth = ((el.width || 0) / 100) * rect.width;
                const elHeight = ((el.height || 0) / 100) * rect.height;
                
                return x >= elX && x <= elX + elWidth && y >= elY && y <= elY + elHeight;
            });
            
            if (clickedElement) {
                if (e.shiftKey) {
                    // Add to selection
                    setSelectedElementIds(prev => [...prev, clickedElement.id]);
                } else {
                    // Select only this element
                    setSelectedElementIds([clickedElement.id]);
                }
            } else {
                // Clicking on empty canvas clears selection
                if (!e.shiftKey) {
                    setSelectedElementIds([]);

                    // Check if we clicked on PDF text to edit it
                    const pageContent = pageTextContent.find(p => p.page === pageNum);
                    if (pageContent) {
                        // Check each text item
                        for (const item of pageContent.items) {
                            // Skip empty strings
                            if (!item.str || item.str.trim() === '') continue;
                            
                            // item.transform is [scaleX, skewY, skewX, scaleY, tx, ty]
                            const tx = item.transform[4];
                            const ty = item.transform[5];
                            
                            // Use transform[3] (scaleY) as approximate height/font size if height is missing
                            const itemHeight = item.height || Math.abs(item.transform[3]); 
                            const itemWidth = item.width;
                            
                            // Convert PDF point coordinates to Viewport pixels
                            const [vx, vy] = pageContent.viewport.convertToViewportPoint(tx, ty);
                            
                            // Calculate bounds in percentage
                            // vy is the baseline, so top is vy - itemHeight
                            const itemXPct = (vx / pageContent.viewport.width) * 100;
                            const itemYPct = ((vy - itemHeight) / pageContent.viewport.height) * 100;
                            const itemWidthPct = (itemWidth / pageContent.viewport.width) * 100;
                            const itemHeightPct = (itemHeight / pageContent.viewport.height) * 100;
                            
                            // Check intersection with some padding (1% tolerance)
                            if (x >= itemXPct - 1 && x <= itemXPct + itemWidthPct + 1 &&
                                y >= itemYPct - 1 && y <= itemYPct + itemHeightPct + 1) {
                                
                                // Found clicked text item!
                                // Now find all items on the same line to group them
                                const baselineY = item.transform[5];
                                const fontHeight = item.height || Math.abs(item.transform[3]);
                                const yTolerance = fontHeight * 0.5; // 50% tolerance
                                
                                const sameLineItems = pageContent.items.filter((otherItem: any) => {
                                    if (!otherItem.str || otherItem.str.trim() === '') return false;
                                    const otherY = otherItem.transform[5];
                                    return Math.abs(otherY - baselineY) < yTolerance;
                                });
                                
                                // Sort by X coordinate
                                sameLineItems.sort((a: any, b: any) => a.transform[4] - b.transform[4]);
                                
                                // Combine text and calculate group bounds
                                let combinedText = "";
                                let minX = Infinity;
                                let maxX = -Infinity;
                                let minY = Infinity;
                                let maxY = -Infinity;
                                
                                sameLineItems.forEach((lineItem: any, index: number) => {
                                    // Add space if gap is detected (simple heuristic)
                                    if (index > 0) {
                                        const prevItem = sameLineItems[index - 1];
                                        const gap = lineItem.transform[4] - (prevItem.transform[4] + prevItem.width);
                                        const spaceWidth = fontHeight * 0.3; // Approx space width
                                        if (gap > spaceWidth) {
                                            combinedText += " ";
                                        }
                                    }
                                    combinedText += lineItem.str;
                                    
                                    // Update bounds
                                    const [vx, vy] = pageContent.viewport.convertToViewportPoint(lineItem.transform[4], lineItem.transform[5]);
                                    const itemH = lineItem.height || Math.abs(lineItem.transform[3]);
                                    const itemW = lineItem.width;
                                    
                                    minX = Math.min(minX, vx);
                                    maxX = Math.max(maxX, vx + itemW);
                                    minY = Math.min(minY, vy - itemH);
                                    maxY = Math.max(maxY, vy);
                                });
                                
                                // Convert group bounds to percentage
                                const groupXPct = (minX / pageContent.viewport.width) * 100;
                                const groupYPct = (minY / pageContent.viewport.height) * 100;
                                const groupWidthPct = ((maxX - minX) / pageContent.viewport.width) * 100;
                                const groupHeightPct = ((maxY - minY) / pageContent.viewport.height) * 100;

                                // Try to determine font family and style from the clicked item (representative of the line)
                                let detectedFontFamily = "sans-serif";
                                let detectedFontWeight = "normal";
                                let detectedFontStyle = "normal";
                                
                                if (pageContent.styles && item.fontName && pageContent.styles[item.fontName]) {
                                    const fontData = pageContent.styles[item.fontName];
                                    if (fontData.fontFamily) {
                                        let rawFont = fontData.fontFamily.replace(/['"]/g, '');
                                        
                                        // Check for Bold/Italic in the name
                                        if (rawFont.toLowerCase().includes('bold')) detectedFontWeight = 'bold';
                                        if (rawFont.toLowerCase().includes('italic') || rawFont.toLowerCase().includes('oblique')) detectedFontStyle = 'italic';
                                        
                                        // Clean up font name
                                        // Remove subset tag (e.g. ABCDE+Roboto-Bold -> Roboto-Bold)
                                        if (rawFont.includes('+')) {
                                            rawFont = rawFont.split('+')[1];
                                        }
                                        
                                        // Remove style suffixes for the family name
                                        detectedFontFamily = rawFont.replace(/-?Bold/i, '').replace(/-?Italic/i, '').replace(/-?Regular/i, '').replace(/-?Oblique/i, '').trim();
                                        
                                        // Map common PDF fonts to web safe fonts
                                        if (detectedFontFamily.includes('Times')) detectedFontFamily = 'Times New Roman';
                                        else if (detectedFontFamily.includes('Arial')) detectedFontFamily = 'Arial';
                                        else if (detectedFontFamily.includes('Courier')) detectedFontFamily = 'Courier New';
                                        else if (detectedFontFamily.includes('Helvetica')) detectedFontFamily = 'Helvetica';
                                        else if (detectedFontFamily.includes('Roboto')) detectedFontFamily = 'Roboto';
                                        else if (detectedFontFamily.includes('Verdana')) detectedFontFamily = 'Verdana';
                                        else if (detectedFontFamily.includes('Georgia')) detectedFontFamily = 'Georgia';
                                        else if (detectedFontFamily.includes('Tahoma')) detectedFontFamily = 'Tahoma';
                                        else if (detectedFontFamily.includes('Trebuchet')) detectedFontFamily = 'Trebuchet MS';
                                        else if (detectedFontFamily.includes('Impact')) detectedFontFamily = 'Impact';
                                        else if (detectedFontFamily.includes('Comic')) detectedFontFamily = 'Comic Sans MS';
                                        else if (detectedFontFamily.includes('Segoe')) detectedFontFamily = 'Segoe UI';
                                        else if (detectedFontFamily.includes('Open Sans')) detectedFontFamily = 'Open Sans';
                                        else if (detectedFontFamily.includes('Lato')) detectedFontFamily = 'Lato';
                                        else if (detectedFontFamily.includes('Montserrat')) detectedFontFamily = 'Montserrat';
                                        
                                        // Try to find a match in our loaded fonts (Google + Local)
                                        const allFonts = [...googleFonts, ...localFonts];
                                        const exactMatch = allFonts.find(f => f.family.toLowerCase() === detectedFontFamily.toLowerCase());
                                        if (exactMatch) {
                                            detectedFontFamily = exactMatch.family;
                                            // Ensure it's loaded
                                            loadFont(detectedFontFamily);
                                        } else {
                                            // Fuzzy match
                                            const fuzzyMatch = allFonts.find(f => f.family.toLowerCase().includes(detectedFontFamily.toLowerCase()) || detectedFontFamily.toLowerCase().includes(f.family.toLowerCase()));
                                            if (fuzzyMatch) {
                                                detectedFontFamily = fuzzyMatch.family;
                                                loadFont(detectedFontFamily);
                                            }
                                        }
                                    }
                                }

                                const newId = Math.random().toString(36).substr(2, 9);
                                const whiteoutId = Math.random().toString(36).substr(2, 9);
                                
                                // Create whiteout element to cover original text
                                const whiteoutElement: EditorElement = {
                                    id: whiteoutId,
                                    type: "shape",
                                    shapeType: "rectangle",
                                    x: groupXPct - 0.5,
                                    y: groupYPct - 0.5,
                                    width: groupWidthPct + 1,
                                    height: groupHeightPct + 1,
                                    page: pageNum,
                                    backgroundColor: "#ffffff",
                                    borderColor: "transparent",
                                    borderWidth: 0,
                                    opacity: 1
                                };
                                
                                // Create text element
                                const textElement: EditorElement = {
                                    id: newId,
                                    type: "text",
                                    x: groupXPct,
                                    y: groupYPct,
                                    page: pageNum,
                                    width: Math.max(groupWidthPct + 2, 10),
                                    height: groupHeightPct,
                                    content: combinedText,
                                    fontSize: fontHeight * 1.33, // Convert points to pixels approx
                                    fontFamily: detectedFontFamily,
                                    fontWeight: detectedFontWeight,
                                    fontStyle: detectedFontStyle,
                                    color: "#000000",
                                    textAlign: "left",
                                    verticalAlign: "top"
                                };
                                
                                setElements(prev => [...prev, whiteoutElement, textElement]);
                                setSelectedElementIds([newId]);
                                
                                // Trigger auto-edit via state
                                setPendingEditId(newId);
                                
                                return; // Stop searching
                            }
                        }
                    }
                }
            }
            
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
        
        if (activeTool === 'draw' || activeTool === 'highlight' || activeTool === 'eraser') {
            setCurrentPath([{ x, y }]);
        } else if (activeTool === 'rect' || activeTool === 'circle' || 
                  activeTool === 'triangle' || activeTool === 'hexagon' || 
                  activeTool === 'star' || activeTool === 'heart' || 
                  activeTool === 'arrow' || activeTool === 'line') {
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
        
        if (isResizing && selectedElementIds.length === 1) {
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
            
            const el = elements.find(e => e.id === selectedElementIds[0]);
            if (!el) return;
            
            let newWidth = startSize.width;
            let newHeight = startSize.height;
            let newX = el.x;
            let newY = el.y;
            
            if (resizeHandle?.includes('right')) {
                newWidth = Math.max(5, x - el.x);
            }
            if (resizeHandle?.includes('left')) {
                newWidth = Math.max(5, el.x + el.width! - x);
                newX = el.x + el.width! - newWidth;
            }
            if (resizeHandle?.includes('bottom')) {
                newHeight = Math.max(5, y - el.y);
            }
            if (resizeHandle?.includes('top')) {
                newHeight = Math.max(5, el.y + el.height! - y);
                newY = el.y + el.height! - newHeight;
            }
            
            setElements(prev => prev.map(element => 
                element.id === selectedElementIds[0] 
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
        
        if (activeTool === 'draw' || activeTool === 'highlight' || activeTool === 'eraser') {
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
            saveToHistory('Resize element');
            return;
        }
        
        if (!isDrawing) return;
        setIsDrawing(false);
        
        const pageNum = pageIndex + 1;
        
        if (activeTool === 'draw' || activeTool === 'highlight' || activeTool === 'eraser') {
            const id = Math.random().toString(36).substr(2, 9);
            setElements(prev => [
                ...prev,
                {
                    id,
                    type: activeTool === 'eraser' ? 'path' : activeTool === 'highlight' ? 'path' : 'path',
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
            saveToHistory(`Add ${activeTool}`);
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
            
            let shapeType: EditorElement['shapeType'] = 'rectangle';
            if (activeTool === 'rect') shapeType = 'rectangle';
            else if (activeTool === 'circle') shapeType = 'circle';
            else if (activeTool === 'triangle') shapeType = 'triangle';
            else if (activeTool === 'hexagon') shapeType = 'hexagon';
            else if (activeTool === 'star') shapeType = 'star';
            else if (activeTool === 'heart') shapeType = 'heart';
            else if (activeTool === 'arrow') shapeType = 'arrow';
            else if (activeTool === 'line') shapeType = 'line';
            
            setElements(prev => [
                ...prev,
                {
                    id,
                    type: shapeType === 'arrow' || shapeType === 'line' ? shapeType : 'shape',
                    shapeType,
                    x,
                    y,
                    width,
                    height,
                    page: pageNum,
                    color: color,
                    strokeWidth: strokeWidth,
                    points: shapeType === 'arrow' || shapeType === 'line' ? [
                        { x: currentShape.startX, y: currentShape.startY },
                        { x: currentShape.endX, y: currentShape.endY }
                    ] : undefined
                }
            ]);
            setCurrentShape(null);
            saveToHistory(`Add ${shapeType}`);
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
                verticalAlign: verticalAlign,
                width: 20,
                height: 5,
                opacity: opacity,
                rotation: rotation,
                borderRadius: borderRadius,
                borderWidth: borderWidth,
                borderColor: borderColor,
                letterSpacing: letterSpacing,
                lineHeight: lineHeight,
                paragraphSpacing: paragraphSpacing,
                textTransform: textTransform,
                textEffect: textEffect,
                shadowBlur: shadowBlur,
                shadowColor: shadowColor,
                shadowOffsetX: shadowOffsetX,
                shadowOffsetY: shadowOffsetY,
                blendMode: blendMode as EditorElement['blendMode'],
                filter: filter
            },
        ]);
        setSelectedElementIds([id]);
        setActiveTool('select');
        saveToHistory('Add text');
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
                    imageType: imgFile.type.includes("png") ? "png" : 
                              imgFile.type.includes("jpg") ? "jpg" : 
                              imgFile.type.includes("svg") ? "svg" : 
                              imgFile.type.includes("gif") ? "gif" : "webp",
                    width: 20,
                    height: 15,
                    opacity: opacity,
                    rotation: rotation,
                    borderRadius: borderRadius,
                    borderWidth: borderWidth,
                    borderColor: borderColor,
                    shadowBlur: shadowBlur,
                    shadowColor: shadowColor,
                    shadowOffsetX: shadowOffsetX,
                    shadowOffsetY: shadowOffsetY,
                    blendMode: blendMode as EditorElement['blendMode'],
                    filter: filter
                },
            ]);
            setSelectedElementIds([id]);
            setActiveTool('select');
            saveToHistory('Add image');
        }
    };
    
    // Update selected element properties
    const updateSelectedElements = (updates: Partial<EditorElement>) => {
        if (selectedElementIds.length === 0) return;
        
        saveToHistory('Update elements');
        
        setElements(prev => prev.map(el => 
            selectedElementIds.includes(el.id) ? { ...el, ...updates } : el
        ));
    };
    
    // Delete selected elements
    const deleteSelectedElements = () => {
        if (selectedElementIds.length === 0) return;
        
        saveToHistory('Delete elements');
        
        setElements(prev => prev.filter(el => !selectedElementIds.includes(el.id)));
        setSelectedElementIds([]);
    };
    
    // Copy selected elements
    const copySelectedElements = async () => {
        if (selectedElementIds.length === 0) return;
        
        const selectedElementsData = elements.filter(el => selectedElementIds.includes(el.id));
        
        // Save to internal clipboard
        localStorage.setItem('copiedElements', JSON.stringify(selectedElementsData));
        
        // Also try to save to system clipboard
        try {
            await navigator.clipboard.writeText(JSON.stringify(selectedElementsData));
        } catch (e) {
            // Ignore clipboard errors
        }
        
        toast.show({
            title: "Copied",
            message: `${selectedElementIds.length} element(s) copied to clipboard`,
            variant: "success",
            position: "top-right",
        });
    };
    
    // Paste elements from clipboard
    const pasteElements = () => {
        try {
            const copiedElementsData = localStorage.getItem('copiedElements');
            if (!copiedElementsData) return;
            
            const copiedElements = JSON.parse(copiedElementsData) as EditorElement[];
            
            // Generate new IDs for pasted elements
            const newElements = copiedElements.map(el => ({
                ...el,
                id: Math.random().toString(36).substr(2, 9),
                x: el.x + 5, // Offset slightly
                y: el.y + 5,
                page: currentPage
            }));
            
            setElements(prev => [...prev, ...newElements]);
            setSelectedElementIds(newElements.map(el => el.id));
            saveToHistory('Paste elements');
            
            toast.show({
                title: "Pasted",
                message: `${newElements.length} element(s) pasted`,
                variant: "success",
                position: "top-right",
            });
        } catch (error) {
            console.error("Error pasting elements:", error);
            toast.show({
                title: "Paste Failed",
                message: "Failed to paste elements",
                variant: "error",
                position: "top-right",
            });
        }
    };
    
    // Cut selected elements
    const cutSelectedElements = () => {
        if (selectedElementIds.length === 0) return;
        
        copySelectedElements();
        deleteSelectedElements();
    };
    
    // Select all elements on current page
    const selectAllElementsOnPage = () => {
        const elementsOnPage = elements.filter(el => el.page === currentPage);
        setSelectedElementIds(elementsOnPage.map(el => el.id));
    };
    
    // Duplicate selected elements
    const duplicateSelectedElements = () => {
        if (selectedElementIds.length === 0) return;
        
        const selectedElementsData = elements.filter(el => selectedElementIds.includes(el.id));
        
        // Generate new elements with offset
        const newElements = selectedElementsData.map(el => ({
            ...el,
            id: Math.random().toString(36).substr(2, 9),
            x: el.x + 5, // Offset slightly
            y: el.y + 5,
            page: currentPage
        }));
        
        setElements(prev => [...prev, ...newElements]);
        setSelectedElementIds(newElements.map(el => el.id));
        saveToHistory('Duplicate elements');
    };
    
    // Group selected elements
    const groupSelectedElements = () => {
        if (selectedElementIds.length < 2) return;
        
        saveToHistory('Group elements');
        
        // Create group
        const groupId = Math.random().toString(36).substr(2, 9);
        
        setElements(prev => prev.map(el => 
            selectedElementIds.includes(el.id) 
                ? { ...el, groupId } 
                : el
        ));
        
        setSelectedElementIds([groupId]);
    };
    
    // Ungroup selected element
    const ungroupSelectedElement = () => {
        if (selectedElementIds.length !== 1) return;
        
        const selectedElement = elements.find(el => el.id === selectedElementIds[0]);
        if (!selectedElement || !selectedElement.groupId) return;
        
        saveToHistory('Ungroup elements');
        
        // Remove group information
        setElements(prev => prev.map(el => 
            el.id === selectedElementIds[0] 
                ? { ...el, groupId: undefined } 
                : el
        ));
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
                message: "PDF saved successfully!",
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
    
    // Export to different format
    const exportToFormat = async (format: string) => {
        if (!file) return;
        setIsProcessing(true);
        
        try {
            // Export to the specified format
            // For now, we'll just save as PDF
            const result = await pdfStrategyManager.execute('edit', [file], {
                elements,
                exportFormat: format,
                ...exportOptions
            });
            
            const extension = format === 'pdf' ? 'pdf' : 
                            format === 'png' ? 'png' : 
                            format === 'jpg' ? 'jpg' : 
                            format === 'svg' ? 'svg' : 'pdf';
            
            saveAs(result.blob, result.fileName || `exported.${extension}`);
            
            toast.show({
                title: "Success",
                message: `Exported to ${format.toUpperCase()} successfully!`,
                variant: "success",
                position: "top-right",
            });
        } catch (error) {
            console.error("Error exporting:", error);
            toast.show({
                title: "Export Failed",
                message: `Failed to export to ${format.toUpperCase()}. Please try again.`,
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
        setSelectedElementIds([elementId]);
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
        setSelectedElementIds([elementId]);
        
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
            
            // Apply constraints
            if (element.constraints) {
                newX = Math.max(0, Math.min(100 - (element.width || 0), newX));
                newY = Math.max(0, Math.min(100 - (element.height || 0), newY));
            }
            
            setElements(prev => prev.map(el => 
                el.id === elementId ? { ...el, x: newX, y: newY } : el
            ));
        };
        
        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            saveToHistory('Move element');
        };
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };
    
    // Handle element double click for text editing
    const handleElementDoubleClick = (elementId: string) => {
        const element = elements.find(el => el.id === elementId);
        if (!element || element.type !== 'text') return;
        
        // Calculate current scale factor based on zoom
        // Base scale is 1.5 at 100% zoom
        const currentScale = 1.5 * (zoom / 100);
        // We stored fontSize as (pointSize * 1.33)
        // We want displayed pixel size = pointSize * currentScale
        // So displayed pixel size = (element.fontSize / 1.33) * currentScale
        const scaledFontSize = (element.fontSize || 12) / 1.33 * currentScale;

        // Create editable text input
        const input = document.createElement('input');
        input.type = 'text';
        input.value = element.content || '';
        input.style.position = 'absolute';
        input.style.fontFamily = element.fontFamily || 'Arial';
        input.style.fontWeight = element.fontWeight || 'normal';
        input.style.fontStyle = element.fontStyle || 'normal';
        input.style.fontSize = `${scaledFontSize}px`;
        input.style.color = element.color || '#000000';
        input.style.background = 'transparent';
        input.style.border = 'none';
        input.style.outline = 'none';
        input.style.zIndex = '10000';
        input.style.padding = '0';
        input.style.margin = '0';
        
        const canvas = canvasRefs.current[element.page - 1];
        if (!canvas) return;
        
        const rect = canvas.getBoundingClientRect();
        input.style.left = `${rect.left + (element.x / 100) * rect.width}px`;
        // Adjust top position to account for baseline difference
        // PDF y is baseline, HTML y is top-left
        // We might need to shift it up slightly
        input.style.top = `${rect.top + (element.y / 100) * rect.height}px`;
        
        // Match width
        input.style.width = `${(element.width || 10) / 100 * rect.width}px`;
        
        document.body.appendChild(input);
        input.focus();
        input.select();
        
        const handleInputBlur = () => {
            updateSelectedElements({ content: input.value });
            if (document.body.contains(input)) {
                document.body.removeChild(input);
            }
        };
        
        const handleInputKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                handleInputBlur();
            } else if (e.key === 'Escape') {
                if (document.body.contains(input)) {
                    document.body.removeChild(input);
                }
            }
        };
        
        input.addEventListener('blur', handleInputBlur);
        input.addEventListener('keydown', handleInputKeyDown);
    };
    
    // Add comment to element
    const addCommentToElement = (elementId: string, text: string) => {
        const newComment: Comment = {
            id: Math.random().toString(36).substr(2, 9),
            userId: 'current-user',
            elementId,
            page: currentPage,
            x: 50,
            y: 50,
            text,
            timestamp: new Date(),
            resolved: false
        };
        
        setComments(prev => [...prev, newComment]);
        saveToHistory('Add comment');
        
        toast.show({
            title: "Comment Added",
            message: "Comment added successfully",
            variant: "success",
            position: "top-right",
        });
    };
    
    // Resolve comment
    const resolveComment = (commentId: string) => {
        setComments(prev => prev.map(comment => 
            comment.id === commentId ? { ...comment, resolved: true } : comment
        ));
        saveToHistory('Resolve comment');
    };
    
    // Delete comment
    const deleteComment = (commentId: string) => {
        setComments(prev => prev.filter(comment => comment.id !== commentId));
        saveToHistory('Delete comment');
    };
    
    // Share document
    const shareDocument = async () => {
        setIsSharing(true);
        
        try {
            // Generate a shareable link
            const shareableLink = `https://your-app.com/shared/${Math.random().toString(36).substr(2, 9)}`;
            
            // Copy to clipboard
            await navigator.clipboard.writeText(shareableLink);
            
            toast.show({
                title: "Document Shared",
                message: "Shareable link copied to clipboard",
                variant: "success",
                position: "top-right",
            });
        } catch (error) {
            console.error("Error sharing document:", error);
            toast.show({
                title: "Share Failed",
                message: "Failed to share document",
                variant: "error",
                position: "top-right",
            });
        } finally {
            setIsSharing(false);
        }
    };
    
    // Apply template
    const applyTemplate = (template: Template) => {
        setElements(template.elements);
        setPages([{
            ...DEFAULT_PAGE_SETTINGS,
            ...template.pageSettings
        }]);
        saveToHistory(`Apply template: ${template.name}`);
        
        toast.show({
            title: "Template Applied",
            message: `Template "${template.name}" applied successfully`,
            variant: "success",
            position: "top-right",
        });
    };
    
    // Save as template
    const saveAsTemplate = () => {
        const newTemplate: Template = {
            id: Math.random().toString(36).substr(2, 9),
            name: `Custom Template ${new Date().toLocaleDateString()}`,
            description: "Custom template created from current document",
            category: "Custom",
            thumbnail: "/templates/custom.jpg",
            elements: elements,
            pageSettings: pages[0] || DEFAULT_PAGE_SETTINGS
        };
        
        setTemplates(prev => [...prev, newTemplate]);
        
        toast.show({
            title: "Template Saved",
            message: "Current document saved as template",
            variant: "success",
            position: "top-right",
        });
    };
    
    // Export document
    const exportDocument = async () => {
        if (!file) return;
        setIsProcessing(true);
        
        try {
            const result = await pdfStrategyManager.execute('edit', [file], {
                elements,
                exportFormat,
                exportQuality,
                ...exportOptions
            });
            
            const extension = exportFormat === 'pdf' ? 'pdf' : 
                            exportFormat === 'png' ? 'png' : 
                            exportFormat === 'jpg' ? 'jpg' : 
                            exportFormat === 'svg' ? 'svg' : 'pdf';
            
            saveAs(result.blob, result.fileName || `exported.${extension}`);
            
            toast.show({
                title: "Export Successful",
                message: `Document exported as ${exportFormat.toUpperCase()} successfully`,
                variant: "success",
                position: "top-right",
            });
        } catch (error) {
            console.error("Error exporting document:", error);
            toast.show({
                title: "Export Failed",
                message: "Failed to export document",
                variant: "error",
                position: "top-right",
            });
        } finally {
            setIsProcessing(false);
        }
    };
    
    // Print document
    const printDocument = () => {
        if (!file) return;
        
        window.print();
        
        toast.show({
            title: "Print",
            message: "Document sent to printer",
            variant: "default",
            position: "top-right",
        });
    };
    
    // Search and replace
    const searchAndReplace = (searchText: string, replaceText: string, options?: {
        matchCase?: boolean;
        wholeWord?: boolean;
        regex?: boolean;
    }) => {
        if (!searchText) return;
        
        const searchRegex = options?.regex 
            ? new RegExp(searchText, options?.matchCase ? 'g' : 'gi')
            : new RegExp(searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), options?.matchCase ? 'g' : 'gi');
        
        setElements(prev => prev.map(el => {
            if (el.type === 'text' && el.content) {
                const newContent = el.content.replace(searchRegex, replaceText);
                if (newContent !== el.content) {
                    return { ...el, content: newContent };
                }
            }
            return el;
        }));
        
        saveToHistory(`Search and replace: "${searchText}" -> "${replaceText}"`);
        
        toast.show({
            title: "Search and Replace",
            message: `Replaced all occurrences of "${searchText}"`,
            variant: "success",
            position: "top-right",
        });
    };
    
    // Add QR code
    const addQRCode = async (text: string) => {
        try {
            const qrCodeDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(text)}`;
            
            const response = await fetch(qrCodeDataUrl);
            const blob = await response.blob();
            const arrayBuffer = await blob.arrayBuffer();
            
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
                    imageType: "png",
                    width: 20,
                    height: 20,
                    opacity: 1,
                    rotation: 0,
                    data: { text, type: 'qrcode' }
                },
            ]);
            setSelectedElementIds([id]);
            saveToHistory('Add QR code');
            
            toast.show({
                title: "QR Code Added",
                message: "QR code generated successfully",
                variant: "success",
                position: "top-right",
            });
        } catch (error) {
            console.error("Error generating QR code:", error);
            toast.show({
                title: "QR Code Failed",
                message: "Failed to generate QR code",
                variant: "error",
                position: "top-right",
            });
        }
    };
    
    // Add barcode
    const addBarcode = async (text: string) => {
        try {
            const barcodeDataUrl = `https://barcode.tec-it.com/barcode.php?text=${encodeURIComponent(text)}&code=code128&size=200`;
            
            const response = await fetch(barcodeDataUrl);
            const blob = await response.blob();
            const arrayBuffer = await blob.arrayBuffer();
            
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
                    imageType: "png",
                    width: 30,
                    height: 10,
                    opacity: 1,
                    rotation: 0,
                    data: { text, type: 'barcode' }
                },
            ]);
            setSelectedElementIds([id]);
            saveToHistory('Add barcode');
            
            toast.show({
                title: "Barcode Added",
                message: "Barcode generated successfully",
                variant: "success",
                position: "top-right",
            });
        } catch (error) {
            console.error("Error generating barcode:", error);
            toast.show({
                title: "Barcode Failed",
                message: "Failed to generate barcode",
                variant: "error",
                position: "top-right",
            });
        }
    };
    
    // Add signature
    const addSignature = async (signatureData: string) => {
        try {
            const id = Math.random().toString(36).substr(2, 9);
            setElements(prev => [
                ...prev,
                {
                    id,
                    type: "signature",
                    x: 50,
                    y: 50,
                    page: currentPage,
                    content: signatureData,
                    width: 30,
                    height: 15,
                    opacity: 1,
                    rotation: 0,
                    data: { type: 'handwritten' }
                },
            ]);
            setSelectedElementIds([id]);
            saveToHistory('Add signature');
            
            toast.show({
                title: "Signature Added",
                message: "Signature added successfully",
                variant: "success",
                position: "top-right",
            });
        } catch (error) {
            console.error("Error adding signature:", error);
            toast.show({
                title: "Signature Failed",
                message: "Failed to add signature",
                variant: "error",
                position: "top-right",
            });
        }
    };
    
    // Add table
    const addTable = (rows: number, cols: number) => {
        const id = Math.random().toString(36).substr(2, 9);
        const tableData = {
            rows,
            cols,
            cells: Array(rows).fill(null).map(() => Array(cols).fill(''))
        };
        
        setElements(prev => [
            ...prev,
            {
                id,
                type: "table",
                x: 50,
                y: 50,
                page: currentPage,
                width: 50,
                height: 30,
                data: tableData,
                fontSize: 12,
                color: "#000000",
                backgroundColor: "#ffffff",
                borderWidth: 1,
                borderColor: "#000000",
                opacity: 1,
                rotation: 0
            },
        ]);
        setSelectedElementIds([id]);
        saveToHistory('Add table');
        
        toast.show({
            title: "Table Added",
            message: `${rows}×${cols} table added successfully`,
            variant: "success",
            position: "top-right",
        });
    };
    
    // Add chart
    const addChart = (type: "bar" | "line" | "pie" | "area", data: number[]) => {
        const id = Math.random().toString(36).substr(2, 9);
        setElements(prev => [
            ...prev,
            {
                id,
                type: "chart",
                x: 50,
                y: 50,
                page: currentPage,
                width: 40,
                height: 30,
                data: { type, data },
                backgroundColor: "#ffffff",
                borderWidth: 1,
                borderColor: "#000000",
                opacity: 1,
                rotation: 0
            },
        ]);
        setSelectedElementIds([id]);
        saveToHistory('Add chart');
        
        toast.show({
            title: "Chart Added",
            message: `${type} chart added successfully`,
            variant: "success",
            position: "top-right",
        });
    };
    
    // Add form field
    const addFormField = (type: "text" | "checkbox" | "radio" | "dropdown" | "textarea" | "date" | "signature") => {
        const id = Math.random().toString(36).substr(2, 9);
        setElements(prev => [
            ...prev,
            {
                id,
                type: "form",
                x: 50,
                y: 50,
                page: currentPage,
                width: type === "signature" ? 40 : 30,
                height: type === "signature" ? 20 : 10,
                data: { fieldType: type, label: `New ${type} field` },
                backgroundColor: "#ffffff",
                borderWidth: 1,
                borderColor: "#000000",
                opacity: 1,
                rotation: 0
            },
        ]);
        setSelectedElementIds([id]);
        saveToHistory('Add form field');
        
        toast.show({
            title: "Form Field Added",
            message: `${type} field added successfully`,
            variant: "success",
            position: "top-right",
        });
    };
    
    // Add annotation
    const addAnnotation = (type: "note" | "highlight" | "strikeout" | "underline") => {
        const id = Math.random().toString(36).substr(2, 9);
        setElements(prev => [
            ...prev,
            {
                id,
                type: "annotation",
                x: 50,
                y: 50,
                page: currentPage,
                width: 20,
                height: 10,
                data: { annotationType: type, content: "New annotation" },
                backgroundColor: type === "highlight" ? "#ffff00" : "transparent",
                borderWidth: type === "strikeout" || type === "underline" ? 2 : 0,
                borderColor: type === "strikeout" || type === "underline" ? "#ff0000" : "transparent",
                opacity: type === "highlight" ? 0.3 : 1,
                rotation: 0
            },
        ]);
        setSelectedElementIds([id]);
        saveToHistory('Add annotation');
        
        toast.show({
            title: "Annotation Added",
            message: `${type} annotation added successfully`,
            variant: "success",
            position: "top-right",
        });
    };
    
    // Add video element
    const addVideoElement = async (videoFile: File) => {
        try {
            const arrayBuffer = await videoFile.arrayBuffer();
            const id = Math.random().toString(36).substr(2, 9);
            setElements(prev => [
                ...prev,
                {
                    id,
                    type: "video",
                    x: 50,
                    y: 50,
                    page: currentPage,
                    imageBytes: arrayBuffer,
                    imageType: "mp4",
                    width: 40,
                    height: 30,
                    opacity: 1,
                    rotation: 0,
                    data: { 
                        fileName: videoFile.name,
                        duration: 0,
                        thumbnail: URL.createObjectURL(videoFile)
                    }
                },
            ]);
            setSelectedElementIds([id]);
            saveToHistory('Add video');
            
            toast.show({
                title: "Video Added",
                message: "Video added successfully",
                variant: "success",
                position: "top-right",
            });
        } catch (error) {
            console.error("Error adding video:", error);
            toast.show({
                title: "Video Failed",
                message: "Failed to add video",
                variant: "error",
                position: "top-right",
            });
        }
    };
    
    // Add audio element
    const addAudioElement = async (audioFile: File) => {
        try {
            const arrayBuffer = await audioFile.arrayBuffer();
            const id = Math.random().toString(36).substr(2, 9);
            setElements(prev => [
                ...prev,
                {
                    id,
                    type: "audio",
                    x: 50,
                    y: 50,
                    page: currentPage,
                    imageBytes: arrayBuffer,
                    imageType: "mp3",
                    width: 30,
                    height: 10,
                    opacity: 1,
                    rotation: 0,
                    data: { 
                        fileName: audioFile.name,
                        duration: 0,
                        thumbnail: "/audio-icon.png" // Default audio icon
                    }
                },
            ]);
            setSelectedElementIds([id]);
            saveToHistory('Add audio');
            
            toast.show({
                title: "Audio Added",
                message: "Audio added successfully",
                variant: "success",
                position: "top-right",
            });
        } catch (error) {
            console.error("Error adding audio:", error);
            toast.show({
                title: "Audio Failed",
                message: "Failed to add audio",
                variant: "error",
                position: "top-right",
            });
        }
    };
    
    // Add map element
    const addMapElement = async (location: { lat: number, lng: number, address?: string }) => {
        try {
            // Generate a map image
            const mapDataUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${location.lat},${location.lng}&zoom=14&size=400x300&markers=color:red|${location.lat},${location.lng}`;
            
            const response = await fetch(mapDataUrl);
            const blob = await response.blob();
            const arrayBuffer = await blob.arrayBuffer();
            
            const id = Math.random().toString(36).substr(2, 9);
            setElements(prev => [
                ...prev,
                {
                    id,
                    type: "map",
                    x: 50,
                    y: 50,
                    page: currentPage,
                    imageBytes: arrayBuffer,
                    imageType: "png",
                    width: 50,
                    height: 40,
                    opacity: 1,
                    rotation: 0,
                    data: { location, address: location.address || '' }
                },
            ]);
            setSelectedElementIds([id]);
            saveToHistory('Add map');
            
            toast.show({
                title: "Map Added",
                message: "Map added successfully",
                variant: "success",
                position: "top-right",
            });
        } catch (error) {
            console.error("Error adding map:", error);
            toast.show({
                title: "Map Failed",
                message: "Failed to add map",
                variant: "error",
                position: "top-right",
            });
        }
    };
    
    // Add calendar element
    const addCalendarElement = (date: Date, type: "monthly" | "weekly" | "daily") => {
        const id = Math.random().toString(36).substr(2, 9);
        setElements(prev => [
            ...prev,
            {
                id,
                type: "calendar",
                x: 50,
                y: 50,
                page: currentPage,
                width: type === "monthly" ? 60 : type === "weekly" ? 50 : 40,
                height: type === "monthly" ? 50 : type === "weekly" ? 40 : 30,
                data: { date, type },
                backgroundColor: "#ffffff",
                borderWidth: 1,
                borderColor: "#000000",
                opacity: 1,
                rotation: 0
            },
        ]);
        setSelectedElementIds([id]);
        saveToHistory('Add calendar');
        
        toast.show({
            title: "Calendar Added",
            message: `${type} calendar added successfully`,
            variant: "success",
            position: "top-right",
        });
    };
    
    // Add contact element
    const addContactElement = (contact: {
        name: string;
        email?: string;
        phone?: string;
        address?: string;
        company?: string;
        title?: string;
    }) => {
        const id = Math.random().toString(36).substr(2, 9);
        setElements(prev => [
            ...prev,
            {
                id,
                type: "contact",
                x: 50,
                y: 50,
                page: currentPage,
                width: 40,
                height: 30,
                data: contact,
                backgroundColor: "#ffffff",
                borderWidth: 1,
                borderColor: "#000000",
                opacity: 1,
                rotation: 0
            },
        ]);
        setSelectedElementIds([id]);
        saveToHistory('Add contact');
        
        toast.show({
            title: "Contact Added",
            message: "Contact added successfully",
            variant: "success",
            position: "top-right",
        });
    };
    
    // Add code element
    const addCodeElement = (code: string, language: string) => {
        const id = Math.random().toString(36).substr(2, 9);
        setElements(prev => [
            ...prev,
            {
                id,
                type: "code",
                x: 50,
                y: 50,
                page: currentPage,
                width: 50,
                height: 40,
                content: code,
                data: { language },
                backgroundColor: "#f8f8f8",
                borderWidth: 1,
                borderColor: "#000000",
                opacity: 1,
                rotation: 0
            },
        ]);
        setSelectedElementIds([id]);
        saveToHistory('Add code');
        
        toast.show({
            title: "Code Added",
            message: "Code added successfully",
            variant: "success",
            position: "top-right",
        });
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
                    <h1 className="text-2xl font-bold text-center mb-2 text-gray-900 dark:text-white">Advanced PDF Editor</h1>
                    <p className="text-center text-gray-600 dark:text-gray-400 mb-6">Upload a PDF to start editing</p>
                    <FileUpload
                        onFilesSelected={handleFileSelected}
                        maxFiles={1}
                        accept={{ "application/pdf": [".pdf"] }}
                        description="Drop a PDF file here or click to browse"
                    />
                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Professional-grade PDF editing with advanced features
                        </p>
                    </div>
                </div>
            </div>
        );
    }
    
    // ================== RENDER MAIN EDITOR ==================
    
    return (
        <EditorContext.Provider value={{
            // State
            elements,
            currentPage,
            pages,
            selectedElementIds,
            activeTool,
            zoom,
            
            // Actions
            addElement: (element: EditorElement) => setElements(prev => [...prev, element]),
            updateElement: (id: string, updates: Partial<EditorElement>) => setElements(prev => prev.map(el => el.id === id ? { ...el, ...updates } : el)),
            deleteElement: (id: string) => setElements(prev => prev.filter(el => el.id !== id)),
            selectElement: (id: string, multi?: boolean) => setSelectedElementIds(prev => multi ? [...prev, id] : [id]),
            deselectAll: () => setSelectedElementIds([]),
            setCurrentPage,
            setActiveTool,
            setZoom,
            
            // History
            undo,
            redo,
            saveToHistory,
            
            // Clipboard
            copy: copySelectedElements,
            paste: pasteElements,
            cut: cutSelectedElements,
            
            // File operations
            save: savePdf,
            export: exportDocument,
            import: (file: File) => handleFileSelected([file]),
            
            // UI
            showGrid,
            setShowGrid,
            darkMode,
            setDarkMode
        }}>
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
                                variant={activeTool === 'rect' ? 'secondary' : 'ghost'} 
                                size="icon" 
                                onClick={() => setActiveTool('rect')}
                                title="Rectangle"
                                className={cn("h-8 w-8", activeTool === 'rect' && "bg-white dark:bg-gray-600 shadow-sm text-blue-600 dark:text-blue-400")}
                            >
                                <Square className="h-4 w-4" />
                            </Button>
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
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8" 
                                onClick={copySelectedElements}
                                disabled={selectedElementIds.length === 0}
                                title="Copy"
                            >
                                <Copy className="h-4 w-4" />
                            </Button>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8" 
                                onClick={pasteElements}
                                title="Paste"
                            >
                                <Clipboard className="h-4 w-4" />
                            </Button>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8" 
                                onClick={deleteSelectedElements}
                                disabled={selectedElementIds.length === 0}
                                title="Delete"
                            >
                                <Trash2 className="h-4 w-4" />
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
                                            <option value="serif">Serif</option>
                                            <option value="sans-serif">Sans-serif</option>
                                            <option value="display">Display</option>
                                            <option value="handwriting">Handwriting</option>
                                            <option value="monospace">Monospace</option>
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
                                                        updateSelectedElements({ fontFamily: font.family });
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
                                    updateSelectedElements({ fontWeight: newBold ? 'bold' : 'normal' });
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
                                    updateSelectedElements({ fontStyle: newItalic ? 'italic' : 'normal' });
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
                                    updateSelectedElements({ textDecoration: newUnderline ? 'underline' : 'none' });
                                }}
                                title="Underline"
                            >
                                <Underline className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={textAlign === 'left' ? "secondary" : "ghost"}
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                    setTextAlign('left');
                                    updateSelectedElements({ textAlign: 'left' });
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
                                    updateSelectedElements({ textAlign: 'center' });
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
                                    updateSelectedElements({ textAlign: 'right' });
                                }}
                                title="Align Right"
                            >
                                <AlignRight className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={textAlign === 'justify' ? "secondary" : "ghost"}
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                    setTextAlign('justify');
                                    updateSelectedElements({ textAlign: 'justify' });
                                }}
                                title="Justify"
                            >
                                <AlignJustify className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                    
                    {/* Font Size / Stroke Width */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {selectedElementIds.length === 1 && elements.find(e => e.id === selectedElementIds[0])?.type === 'text' 
                                ? 'Font Size' 
                                : 'Stroke Width'}
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                value={selectedElementIds.length === 1 && elements.find(e => e.id === selectedElementIds[0])?.type === 'text' 
                                    ? fontSize 
                                    : strokeWidth}
                                onChange={(e) => {
                                    const val = Number(e.target.value);
                                    if (selectedElementIds.length === 1 && elements.find(el => el.id === selectedElementIds[0])?.type === 'text') {
                                        setFontSize(val);
                                        updateSelectedElements({ fontSize: val });
                                    } else {
                                        setStrokeWidth(val);
                                        updateSelectedElements({ strokeWidth: val });
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
                                        updateSelectedElements({ color: c });
                                    }}
                                    title={c}
                                />
                            ))}
                            <input
                                type="color"
                                value={color}
                                onChange={(e) => {
                                    setColor(e.target.value);
                                    updateSelectedElements({ color: e.target.value });
                                }}
                                className="h-8 w-8 rounded border border-gray-300 dark:border-gray-500 cursor-pointer bg-transparent p-0"
                                title="Custom Color"
                            />
                        </div>
                    </div>
                    
                    {/* Background Color */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Background Color</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="color"
                                value={backgroundColor}
                                onChange={(e) => {
                                    setBackgroundColor(e.target.value);
                                    updateSelectedElements({ backgroundColor: e.target.value });
                                }}
                                className="h-8 w-8 rounded border border-gray-300 dark:border-gray-500 cursor-pointer bg-transparent p-0"
                                title="Background Color"
                            />
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                    setBackgroundColor('transparent');
                                    updateSelectedElements({ backgroundColor: 'transparent' });
                                }}
                                title="Transparent"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                    
                    {/* Opacity */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Opacity: {Math.round(opacity * 100)}%</label>
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
                                    updateSelectedElements({ opacity: val });
                                }}
                                className="flex-1"
                            />
                            <span className="text-sm text-gray-600 dark:text-gray-400 w-10">{Math.round(opacity * 100)}%</span>
                        </div>
                    </div>
                    
                    {/* Rotation */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Rotation: {rotation}°</label>
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
                                    updateSelectedElements({ rotation: val });
                                }}
                                className="flex-1"
                            />
                            <span className="text-sm text-gray-600 dark:text-gray-400 w-12">{rotation}°</span>
                        </div>
                    </div>
                    
                    {/* Border */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Border</label>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Width</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="20"
                                    value={borderWidth}
                                    onChange={(e) => {
                                        const val = Number(e.target.value);
                                        setBorderWidth(val);
                                        updateSelectedElements({ borderWidth: val });
                                    }}
                                    className="w-full h-10 rounded border border-gray-300 dark:border-gray-500 px-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Color</label>
                                <input
                                    type="color"
                                    value={borderColor}
                                    onChange={(e) => {
                                        setBorderColor(e.target.value);
                                        updateSelectedElements({ borderColor: e.target.value });
                                    }}
                                    className="w-full h-10 rounded border border-gray-300 dark:border-gray-500 cursor-pointer bg-transparent p-0"
                                />
                            </div>
                        </div>
                    </div>
                    
                    {/* Shadow */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Shadow</label>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Blur</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="50"
                                    value={shadowBlur}
                                    onChange={(e) => {
                                        const val = Number(e.target.value);
                                        setShadowBlur(val);
                                        updateSelectedElements({ shadowBlur: val });
                                    }}
                                    className="w-full h-10 rounded border border-gray-300 dark:border-gray-500 px-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Color</label>
                                <input
                                    type="color"
                                    value={shadowColor}
                                    onChange={(e) => {
                                        setShadowColor(e.target.value);
                                        updateSelectedElements({ shadowColor: e.target.value });
                                    }}
                                    className="w-full h-10 rounded border border-gray-300 dark:border-gray-500 cursor-pointer bg-transparent p-0"
                                />
                            </div>
                        </div>
                    </div>
                    
                    {/* Text Effects */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Text Effects</label>
                        <div className="flex items-center gap-2">
                            <Button
                                variant={textEffect === 'shadow' ? "secondary" : "ghost"}
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                    setTextEffect('shadow');
                                    updateSelectedElements({ textEffect: 'shadow' });
                                }}
                                title="Text Shadow"
                            >
                                <TypeOutline className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={textEffect === 'outline' ? "secondary" : "ghost"}
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                    setTextEffect('outline');
                                    updateSelectedElements({ textEffect: 'outline' });
                                }}
                                title="Text Outline"
                            >
                                <Type className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={textEffect === 'emboss' ? "secondary" : "ghost"}
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                    setTextEffect('emboss');
                                    updateSelectedElements({ textEffect: 'emboss' });
                                }}
                                title="Emboss"
                            >
                                <Type className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={textEffect === 'engrave' ? "secondary" : "ghost"}
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                    setTextEffect('engrave');
                                    updateSelectedElements({ textEffect: 'engrave' });
                                }}
                                title="Engrave"
                            >
                                <Type className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                    
                    {/* Transform */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Transform</label>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Scale X</label>
                                <input
                                    type="number"
                                    min="0.1"
                                    max="5"
                                    step="0.1"
                                    value={1}
                                    onChange={(e) => {
                                        const val = Number(e.target.value);
                                        updateSelectedElements({ 
                                            transform: { 
                                                ...elements.find(el => el.id === selectedElementIds[0])?.transform,
                                                scaleX: val 
                                            }
                                        });
                                    }}
                                    className="w-full h-10 rounded border border-gray-300 dark:border-gray-500 px-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Scale Y</label>
                                <input
                                    type="number"
                                    min="0.1"
                                    max="5"
                                    step="0.1"
                                    value={1}
                                    onChange={(e) => {
                                        const val = Number(e.target.value);
                                        updateSelectedElements({ 
                                            transform: { 
                                                ...elements.find(el => el.id === selectedElementIds[0])?.transform,
                                                scaleY: val 
                                            }
                                        });
                                    }}
                                    className="w-full h-10 rounded border border-gray-300 dark:border-gray-500 px-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                />
                            </div>
                        </div>
                    </div>
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
                        {elements.length === 0 ? (
                            <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                                No elements added yet
                            </div>
                        ) : (
                            elements.slice().reverse().map((el) => (
                                <div
                                    key={el.id}
                                    className={cn(
                                        "flex items-center gap-2 p-2 rounded-md cursor-pointer",
                                        selectedElementIds.includes(el.id) ? "bg-blue-100 dark:bg-blue-900" : "hover:bg-gray-100 dark:hover:bg-gray-700"
                                    )}
                                    onClick={() => setSelectedElementIds([el.id])}
                                >
                                    <div className="flex-1 flex items-center gap-2">
                                        {el.type === 'text' && <Type className="h-4 w-4 text-gray-600 dark:text-gray-400" />}
                                        {el.type === 'image' && <ImageIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />}
                                        {el.type === 'path' && <Pencil className="h-4 w-4 text-gray-600 dark:text-gray-400" />}
                                        {el.type === 'shape' && <Square className="h-4 w-4 text-gray-600 dark:text-gray-400" />}
                                        {el.type === 'arrow' && <ArrowRight className="h-4 w-4 text-gray-600 dark:text-gray-400" />}
                                        {el.type === 'line' && <Minus className="h-4 w-4 text-gray-600 dark:text-gray-400" />}
                                        {el.type === 'chart' && <BarChart className="h-4 w-4 text-gray-600 dark:text-gray-400" />}
                                        {el.type === 'form' && <CheckSquare className="h-4 w-4 text-gray-600 dark:text-gray-400" />}
                                        {el.type === 'signature' && <FileSignature className="h-4 w-4 text-gray-600 dark:text-gray-400" />}
                                        {el.type === 'annotation' && <MessageCircle className="h-4 w-4 text-gray-600 dark:text-gray-400" />}
                                        {el.type === 'table' && <Grid3x3 className="h-4 w-4 text-gray-600 dark:text-gray-400" />}
                                        {el.type === 'video' && <Video className="h-4 w-4 text-gray-600 dark:text-gray-400" />}
                                        {el.type === 'audio' && <Music className="h-4 w-4 text-gray-600 dark:text-gray-400" />}
                                        {el.type === 'map' && <MapIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />}
                                        {el.type === 'calendar' && <Calendar className="h-4 w-4 text-gray-600 dark:text-gray-400" />}
                                        {el.type === 'contact' && <Users className="h-4 w-4 text-gray-600 dark:text-gray-400" />}
                                        {el.type === 'code' && <Code className="h-4 w-4 text-gray-600 dark:text-gray-400" />}
                                        {el.type === 'qr' && <Hash className="h-4 w-4 text-gray-600 dark:text-gray-400" />}
                                        {el.type === 'barcode' && <ScanBarcode className="h-4 w-4 text-gray-600 dark:text-gray-400" />}
                                        <span className="text-sm truncate">
                                            {el.type === 'text' ? el.content?.substring(0, 20) : `${el.type} ${el.id.substring(0, 8)}`}
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
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const newElements = elements.filter(element => element.id !== el.id);
                                                newElements.push(el);
                                                setElements(newElements);
                                            }}
                                            title="Bring to Front"
                                        >
                                            <ChevronRight className="h-3 w-3" />
                                            <ChevronRight className="h-3 w-3" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const newElements = elements.filter(element => element.id !== el.id);
                                                newElements.unshift(el);
                                                setElements(newElements);
                                            }}
                                            title="Send to Back"
                                        >
                                            <ChevronLeft className="h-3 w-3" />
                                            <ChevronLeft className="h-3 w-3" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const newElements = elements.filter(element => element.id !== el.id);
                                                setElements(newElements);
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
                
                {/* Templates Panel */}
                <div className={cn(
                    "fixed left-4 top-20 z-40 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 w-80 transition-all duration-300",
                    showTemplates ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2 pointer-events-none"
                )}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-900 dark:text-white">Templates</h3>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6" 
                            onClick={() => setShowTemplates(false)}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                    
                    <div className="space-y-2 max-h-96 overflow-auto">
                        {isLoadingTemplates ? (
                            <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                                Loading templates...
                            </div>
                        ) : (
                            templates.map((template) => (
                                <div
                                    key={template.id}
                                    className={cn(
                                        "flex items-center gap-2 p-2 rounded-md cursor-pointer",
                                        selectedTemplate?.id === template.id ? "bg-blue-100 dark:bg-blue-900" : "hover:bg-gray-100 dark:hover:bg-gray-700"
                                    )}
                                    onClick={() => {
                                        setSelectedTemplate(template);
                                        applyTemplate(template);
                                    }}
                                >
                                    <div className="flex-1">
                                        <div className="text-sm font-medium">{template.name}</div>
                                        <div className="text-xs text-gray-600 dark:text-gray-400">{template.description}</div>
                                    </div>
                                    <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
                                        <ImageIcon className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    
                    <Button
                        variant="outline"
                        className="w-full mt-4"
                        onClick={saveAsTemplate}
                    >
                        Save as Template
                    </Button>
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
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setShowTemplates(!showTemplates)}
                            title={showTemplates ? "Hide Templates" : "Show Templates"}
                        >
                            <Layout className="h-4 w-4" />
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
                            onClick={() => setShowRulers(!showRulers)}
                            title={showRulers ? "Hide Rulers" : "Show Rulers"}
                        >
                            <Ruler className={cn("h-4 w-4", showRulers && "text-blue-600 dark:text-blue-400")} />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setShowGuides(!showGuides)}
                            title={showGuides ? "Hide Guides" : "Show Guides"}
                        >
                            <Command className={cn("h-4 w-4", showGuides && "text-blue-600 dark:text-blue-400")} />
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
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                                if (performanceMode === 'quality') setPerformanceMode('balanced');
                                else if (performanceMode === 'balanced') setPerformanceMode('performance');
                                else setPerformanceMode('quality');
                            }}
                            title={`Performance: ${performanceMode}`}
                        >
                            <Sparkles className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                                if (renderMode === 'canvas') setRenderMode('svg');
                                else if (renderMode === 'svg') setRenderMode('webgl');
                                else setRenderMode('canvas');
                            }}
                            title={`Render: ${renderMode}`}
                        >
                            <Command className="h-4 w-4" />
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
                                
                                {/* Rulers */}
                                {showRulers && (
                                    <>
                                        <div className="absolute top-0 left-0 right-0 h-6 bg-gray-800 text-white text-xs flex items-center justify-center">
                                            <div className="flex-1 text-center">
                                                {Array.from({ length: 20 }, (_, j) => (
                                                    <span key={j} className="inline-block w-12 text-center">
                                                        {j * 50}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="absolute top-0 left-0 bottom-0 w-6 bg-gray-800 text-white text-xs flex flex-col items-center justify-center">
                                            <div className="flex-1 text-center">
                                                {Array.from({ length: 20 }, (_, j) => (
                                                    <span key={j} className="inline-block h-6 text-center">
                                                        {j * 50}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                                
                                {/* Page Number */}
                                <div className="absolute bottom-4 right-4 bg-gray-800 bg-opacity-70 text-white px-2 py-1 rounded text-sm">
                                    Page {i + 1} of {numPages}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                
                {/* Comments Panel */}
                {showComments && (
                    <div className="fixed right-4 bottom-20 z-40 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 w-80 transition-all duration-300">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-gray-900 dark:text-white">Comments</h3>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6" 
                                onClick={() => setShowComments(false)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        
                        <div className="space-y-2 max-h-96 overflow-auto">
                            {comments.length === 0 ? (
                                <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                                    No comments yet
                                </div>
                            ) : (
                                comments.map((comment) => (
                                    <div
                                        key={comment.id}
                                        className={cn(
                                            "p-2 rounded-md",
                                            comment.resolved ? "bg-gray-100 dark:bg-gray-700" : "bg-blue-50 dark:bg-blue-900"
                                        )}
                                    >
                                        <div className="flex items-start gap-2">
                                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                                {comment.userId.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1">
                                                <div className="text-sm text-gray-900 dark:text-white">{comment.text}</div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                    {new Date(comment.timestamp).toLocaleString()}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={() => resolveComment(comment.id)}
                                                    title="Resolve"
                                                >
                                                    <Check className="h-3 w-3" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={() => deleteComment(comment.id)}
                                                    title="Delete"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
                
                {/* Help Button */}
                <div className="fixed bottom-4 right-4 z-40">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-full bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700"
                        onClick={() => {
                            toast.show({
                                title: "PDF Editor Help",
                                message: "Use the toolbar to add and edit elements. Press Ctrl+H for keyboard shortcuts.",
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
        </EditorContext.Provider>
    );
}