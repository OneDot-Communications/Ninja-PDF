"use client";

import { useState, useRef, useEffect, useCallback, memo } from "react";
import { saveAs } from "file-saver";
import { FileUpload } from "../ui/file-upload";
import { Button } from "../ui/button";
import {
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
    LayoutGrid,
    List,
    Eye,
    EyeOff,
    CheckSquare,
    RotateCw,
    Plus,
    Trash2,
    Copy,
    Sun,
    Moon,
    Monitor,
    Smartphone,
    Tablet,
    Sliders,
    HelpCircle,
    GripVertical
} from "lucide-react";
import { pdfApi } from "@/lib/services/pdf-api";
import { getPdfJs } from "@/lib/services/pdf-service";
import { toast } from "@/lib/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    DragStartEvent,
    DragEndEvent,
    defaultDropAnimationSideEffects,
    DropAnimation,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
    useSortable,
    verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { snapCenterToCursor } from '@dnd-kit/modifiers';

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

const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
        styles: {
            active: {
                opacity: '0.5',
            },
        },
    }),
};

// Component to render a single PDF page thumbnail
const PdfPageThumbnail = ({
    pdfProxy,
    pageIndex,
    zoom,
    rotation,
    isBlank
}: {
    pdfProxy: any;
    pageIndex: number;
    zoom: number;
    rotation: number;
    isBlank?: boolean;
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const renderTaskRef = useRef<any>(null);

    useEffect(() => {
        if (!pdfProxy || isBlank || !canvasRef.current) return;

        let isMounted = true;

        const renderPage = async () => {
            try {
                // Cancel previous render if any and WAIT for it to clean up
                if (renderTaskRef.current) {
                    try {
                        renderTaskRef.current.cancel();
                        await renderTaskRef.current.promise.catch(() => { });
                    } catch (e) {
                        // Ignore errors during cancellation
                    }
                }

                if (!isMounted) return;

                const page = await pdfProxy.getPage(pageIndex + 1);

                // Double check mount status after awaiting getPage
                if (!isMounted) return;

                // Calculate viewport with scale (zoom)
                const viewport = page.getViewport({ scale: zoom / 100 });
                const canvas = canvasRef.current!;

                // Ensure context is available
                const context = canvas.getContext("2d");
                if (!context) return;

                canvas.height = viewport.height;
                canvas.width = viewport.width;

                const renderContext = {
                    canvasContext: context,
                    viewport: viewport,
                };

                const renderTask = page.render(renderContext);
                renderTaskRef.current = renderTask;
                await renderTask.promise;
            } catch (error: any) {
                if (error.name !== 'RenderingCancelledException') {
                    // Suppress "canvas in use" errors if they slip through, as they are temporary
                    if (error.message && error.message.includes('same canvas')) {
                        return; // Retry logic could be added here if needed, but usually next effect run fixes it
                    }
                    console.error("Error rendering page:", error);
                }
            }
        };

        renderPage();

        return () => {
            isMounted = false;
            // Clean up on unmount
            if (renderTaskRef.current) {
                renderTaskRef.current.cancel();
            }
        };
    }, [pdfProxy, pageIndex, zoom, isBlank]);

    if (isBlank) {
        return (
            <div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-500 text-sm">
                Blank Page
            </div>
        );
    }

    return (
        <canvas
            ref={canvasRef}
            className="h-full w-full object-contain"
        />
    );
};

// Component for Sortable Item
const SortablePageItem = ({
    page,
    index,
    pdfProxy,
    selectedPages,
    toggleSelection,
    showPageNumbers,
    viewMode,
    zoom
}: {
    page: PageItem;
    index: number;
    pdfProxy: any;
    selectedPages: Set<string>;
    toggleSelection: (id: string) => void;
    showPageNumbers: boolean;
    viewMode: "grid" | "list";
    zoom: number;
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: page.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    if (viewMode === 'list') {
        return (
            <div
                ref={setNodeRef}
                style={style}
                id={page.id} // Add ID for sizing
                className={cn(
                    "flex items-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md transition-all duration-200",
                    selectedPages.has(page.id) && "ring-2 ring-blue-500 ring-offset-2",
                    isDragging && "z-50 shadow-xl scale-105"
                )}
                {...attributes}
                {...listeners}
            >
                {/* Drag Handle */}
                <div
                    className="mr-4 text-gray-400 cursor-grab active:cursor-grabbing hover:text-gray-600"
                >
                    <GripVertical className="h-5 w-5" />
                </div>

                {/* Page Thumbnail */}
                <div
                    className="flex-1 relative h-32 w-48 overflow-hidden rounded border border-gray-200 dark:border-gray-700 cursor-pointer"
                    onClick={() => toggleSelection(page.id)}
                >
                    <PdfPageThumbnail
                        key={`list-thumb-${page.id}`}
                        pdfProxy={pdfProxy}
                        pageIndex={page.originalIndex}
                        zoom={zoom}
                        rotation={page.rotation}
                        isBlank={page.isBlank}
                    />

                    {/* Page Number */}
                    {showPageNumbers && (
                        <div className="absolute bottom-2 right-2 bg-gray-800 bg-opacity-70 text-white px-2 py-1 rounded text-xs">
                            {index + 1}
                        </div>
                    )}

                    {/* Selection Indicator */}
                    {selectedPages.has(page.id) && (
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
                        {page.isBlank ? "Blank Page" : `Page ${page.originalIndex + 1}`}
                    </div>
                </div>
            </div>
        );
    }

    // Grid View
    return (
        <div
            ref={setNodeRef}
            style={style}
            id={page.id} // Add ID for sizing
            {...attributes}
            {...listeners}
            className={cn(
                "relative group transition-all duration-200 touch-none",
                selectedPages.has(page.id) && "ring-2 ring-blue-500 ring-offset-2",
                isDragging && "z-50"
            )}
        >
            <div
                className="relative aspect-[3/4] w-full overflow-hidden rounded-lg shadow-md bg-white cursor-pointer"
                onClick={(e) => {
                    // Prevent drag click from toggling if it was a drag?
                    // DnD kit handles this well usually.
                    // But listeners on parent might interfere with click?
                    // Actually, let listeners handle drag, onClick handle click.
                    // If simple click, onClick fires.
                    toggleSelection(page.id);
                }}
            >
                <div
                    className="relative h-full w-full"
                    style={{
                        transform: `scale(${zoom / 100}) rotate(${page.rotation}deg)`,
                        transformOrigin: 'center center'
                        // Note: Zoom scaling in grid view is applied to inner content or container?
                        // Original code applied it to outer transform.
                        // We will replicate that.
                    }}
                >
                    <PdfPageThumbnail
                        key={`grid-thumb-${page.id}`}
                        pdfProxy={pdfProxy}
                        pageIndex={page.originalIndex}
                        zoom={100}
                        rotation={page.rotation}
                        isBlank={page.isBlank}
                    />

                    {/* Page Number (Counter-rotated?) */}
                    {showPageNumbers && (
                        <div className="absolute bottom-2 right-2 bg-gray-800 bg-opacity-70 text-white px-2 py-1 rounded text-xs">
                            {index + 1}
                        </div>
                    )}

                    {/* Selection Indicator */}
                    {selectedPages.has(page.id) && (
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
                    {page.isBlank ? "Blank Page" : `Page ${page.originalIndex + 1}`}
                </div>
            </div>
        </div>
    );
};

export function OrganizePdfTool() {
    // File and PDF state
    const [file, setFile] = useState<File | null>(null);
    const [pdfProxy, setPdfProxy] = useState<any>(null);
    const [pages, setPages] = useState<PageItem[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [numPages, setNumPages] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [zoom, setZoom] = useState(100);

    // DnD Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Allow clicks for selection, drag only after movement
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const [activeId, setActiveId] = useState<string | null>(null);
    const [activeSize, setActiveSize] = useState<{ width: number, height: number } | null>(null);

    // Canvas refs (No longer needed globally, handled by sub-components)
    // const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]); 
    // containerRef and scrollContainerRef might be useful for scrolling
    const containerRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Selection state
    const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set());
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

    // UI state
    const [showToolbar, setShowToolbar] = useState(true);
    const [showProperties, setShowProperties] = useState(true);
    const [darkMode, setDarkMode] = useState(false);
    const [deviceView, setDeviceView] = useState<"desktop" | "tablet" | "mobile">("desktop");
    const [showGrid, setShowGrid] = useState(false);
    const [showPageNumbers, setShowPageNumbers] = useState(true);

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

    // Handle Drag End
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (over && active.id !== over.id) {
            saveToHistory();
            setPages((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);

                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const handleDragStart = (event: DragStartEvent) => {
        const id = event.active.id as string;
        setActiveId(id);

        // Capture dimensions of the dragged item
        const node = document.getElementById(id);
        if (node) {
            const rect = node.getBoundingClientRect();
            setActiveSize({ width: rect.width, height: rect.height });
        }
    };

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
    const toggleSelection = (id: string) => {
        const newSelection = new Set(selectedPages);
        if (newSelection.has(id)) {
            newSelection.delete(id);
        } else {
            newSelection.add(id);
        }
        setSelectedPages(newSelection);
    };

    // Rotate selected pages
    const rotateSelected = (angle: number) => {
        if (selectedPages.size === 0) return;

        saveToHistory();
        setPages(prev => prev.map(p => {
            if (selectedPages.has(p.id)) {
                return { ...p, rotation: (p.rotation + angle) % 360 };
            }
            return p;
        }));
    };

    // Delete selected pages
    const deleteSelected = () => {
        if (selectedPages.size === 0) return;

        saveToHistory();
        setPages(prev => prev.filter(p => !selectedPages.has(p.id)));
        setSelectedPages(new Set());
    };

    // Add blank page
    const addBlankPage = () => {
        saveToHistory();
        setPages(prev => [
            ...prev,
            {
                id: Math.random().toString(36).substr(2, 9),
                originalIndex: -1,
                rotation: 0,
                isBlank: true
            }
        ]);
    };

    // Duplicate selected pages
    const duplicateSelected = () => {
        if (selectedPages.size === 0) return;

        saveToHistory();
        const newPages: PageItem[] = [];

        pages.forEach(p => {
            if (selectedPages.has(p.id)) {
                newPages.push({
                    ...p,
                    id: Math.random().toString(36).substr(2, 9)
                });
            }
            newPages.push(p);
        });

        setPages(newPages);
    };

    // Reorder pages
    const movePage = (fromIndex: number, toIndex: number) => {
        saveToHistory();
        const newPages = [...pages];
        const [movedPage] = newPages.splice(fromIndex, 1);
        newPages.splice(toIndex, 0, movedPage);
        setPages(newPages);
    };

    // Save organized PDF
    const savePdf = async () => {
        if (!file || pages.length === 0) return;
        setIsProcessing(true);

        try {
            const result = await pdfApi.organize(file, {
                pages
            });

            saveAs(result.blob, result.fileName || `organized-${file.name}`);

            toast.show({
                title: "Success",
                message: "PDF organized successfully!",
                variant: "success",
                position: "top-right",
            });
        } catch (error: any) {
            console.error("Error organizing PDF:", error);

            let errorMessage = "Failed to organize PDF. Please try again.";
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

                    {/* View Mode */}
                    <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1 mr-2">
                        <Button
                            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setViewMode('grid')}
                            title="Grid View"
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setViewMode('list')}
                            title="List View"
                        >
                            <List className="h-4 w-4" />
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
                    <h3 className="font-semibold text-gray-900 dark:text-white">Page Properties</h3>
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
                        <div>Total Pages: {pages.length}</div>
                        <div>Selected Pages: {selectedPages.size}</div>
                        <div>Current Page: {currentPage}</div>
                    </div>
                </div>

                {/* Page Options */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Page Options</label>
                    <div className="grid grid-cols-2 gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => rotateSelected(90)}
                            disabled={selectedPages.size === 0}
                            className="h-10"
                        >
                            <RotateCw className="h-4 w-4 mr-2" />
                            Rotate Right
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => rotateSelected(-90)}
                            disabled={selectedPages.size === 0}
                            className="h-10"
                        >
                            <RotateCw className="h-4 w-4 mr-2 rotate-180" />
                            Rotate Left
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={deleteSelected}
                            disabled={selectedPages.size === 0}
                            className="h-10"
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Selected
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={duplicateSelected}
                            disabled={selectedPages.size === 0}
                            className="h-10"
                        >
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate Selected
                        </Button>
                    </div>
                </div>

                {/* View Options */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">View Options</label>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-sm">Show Page Numbers</span>
                            <Button
                                variant={showPageNumbers ? "secondary" : "ghost"}
                                size="sm"
                                onClick={() => setShowPageNumbers(!showPageNumbers)}
                            >
                                {showPageNumbers ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                            </Button>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm">Show Grid</span>
                            <Button
                                variant={showGrid ? "secondary" : "ghost"}
                                size="sm"
                                onClick={() => setShowGrid(!showGrid)}
                            >
                                {showGrid ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Canvas Area */}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div
                    ref={scrollContainerRef}
                    className="flex-1 bg-gray-50 dark:bg-gray-900 overflow-auto p-8 relative"
                >
                    <div className="flex flex-col items-center">
                        <SortableContext items={pages.map(p => p.id)} strategy={rectSortingStrategy}>
                            {viewMode === 'grid' ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 w-full">
                                    {pages.map((page, index) => (
                                        <SortablePageItem
                                            key={page.id}
                                            page={page}
                                            index={index}
                                            pdfProxy={pdfProxy}
                                            selectedPages={selectedPages}
                                            toggleSelection={toggleSelection}
                                            showPageNumbers={showPageNumbers}
                                            viewMode="grid"
                                            zoom={zoom}
                                        />
                                    ))}

                                    {/* Add Blank Page Button */}
                                    <div
                                        className="flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg aspect-[3/4] w-full cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                        onClick={addBlankPage}
                                    >
                                        <Plus className="h-8 w-8 text-gray-400" />
                                        <span className="text-sm text-gray-500 mt-2">Add Page</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full max-w-2xl space-y-4">
                                    {pages.map((page, index) => (
                                        <SortablePageItem
                                            key={page.id}
                                            page={page}
                                            index={index}
                                            pdfProxy={pdfProxy}
                                            selectedPages={selectedPages}
                                            toggleSelection={toggleSelection}
                                            showPageNumbers={showPageNumbers}
                                            viewMode="list"
                                            zoom={zoom}
                                        />
                                    ))}

                                    {/* Add Blank button for list view too */}
                                    <div
                                        className="flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg h-16 w-full cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                        onClick={addBlankPage}
                                    >
                                        <Plus className="h-6 w-6 text-gray-400 mr-2" />
                                        <span className="text-sm text-gray-500">Add Blank Page</span>
                                    </div>
                                </div>
                            )}
                        </SortableContext>
                    </div>
                </div>

                {/* Drag Indicator - Fixed position at top center */}
                {activeId && (
                    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-blue-600 text-white px-6 py-3 rounded-full shadow-lg font-medium text-sm animate-pulse">
                        Moving Page {(pages.find(p => p.id === activeId)?.originalIndex ?? 0) + 1}
                    </div>
                )}
            </DndContext>

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
                            title: "Organize PDF Help",
                            message: "Drag and drop pages to reorder. Select pages to rotate, duplicate, or delete. Add blank pages as needed.",
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