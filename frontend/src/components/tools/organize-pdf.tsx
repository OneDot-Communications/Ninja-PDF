"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { saveAs } from "file-saver";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    rectSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import FileUploadHero from "../ui/file-upload-hero";
import { Button } from "../ui/button";
import {
    RotateCw,
    RotateCcw,
    Plus,
    Trash2,
    Copy,
    Download,
    RefreshCcw,
    FilePlus2,
    LayoutGrid,
    FileText,
    ArrowDownAZ,
    ArrowUpAZ,
    ListRestart
} from "lucide-react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { pdfApi } from "@/lib/services/pdf-api";
import { getPdfJs } from "@/lib/services/pdf-service";
import { toast } from "@/lib/hooks/use-toast";
import { cn } from "@/lib/utils";

// Page item interface
interface PageItem {
    id: string;
    fileId: string;
    originalIndex: number; // 0-based index in original file
    rotation: number;
    isBlank?: boolean;
    fileName?: string;
    fileSize?: number;
}

// History state
interface HistoryState {
    pages: PageItem[];
    currentPage: number;
}

export function OrganizePdfTool() {
    const [fileMap, setFileMap] = useState<Record<string, { file: File, proxy: any }>>({});
    const [pages, setPages] = useState<PageItem[]>([]);
    const [initialPages, setInitialPages] = useState<PageItem[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [isProcessing, setIsProcessing] = useState(false);

    // UI state
    const [viewMode, setViewMode] = useState<"file" | "page">("page");
    const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set());

    // History
    const [history, setHistory] = useState<HistoryState[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    // Refs
    const fileInputRef = useRef<HTMLInputElement>(null);
    const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);

    // DnD Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleFileSelected = async (selectedFiles: File[]) => {
        if (selectedFiles.length > 0) {
            setIsProcessing(true);
            const newFileMap = { ...fileMap };
            const newAddedPages: PageItem[] = [];

            try {
                const pdfjsLib = await getPdfJs();

                for (const selectedFile of selectedFiles) {
                    const fileId = selectedFile.name; // Simple ID using filename

                    let pdf = newFileMap[fileId]?.proxy;

                    if (!pdf) {
                        const arrayBuffer = await selectedFile.arrayBuffer();
                        pdf = await (pdfjsLib as any).getDocument({
                            data: new Uint8Array(arrayBuffer),
                            verbosity: 0
                        }).promise;

                        newFileMap[fileId] = { file: selectedFile, proxy: pdf };
                    }

                    for (let i = 0; i < pdf.numPages; i++) {
                        newAddedPages.push({
                            id: Math.random().toString(36).substr(2, 9),
                            fileId: fileId,
                            originalIndex: i,
                            rotation: 0,
                            fileName: selectedFile.name,
                            fileSize: selectedFile.size
                        });
                    }
                }

                setFileMap(newFileMap);
                const resultPages = [...pages, ...newAddedPages];
                setPages(resultPages);

                if (pages.length === 0) {
                    setInitialPages([...newAddedPages]);
                    setHistory([{ pages: resultPages, currentPage: 1 }]);
                    setHistoryIndex(0);
                    if (Object.keys(newFileMap).length > 1) setViewMode("file");
                } else {
                    saveToHistory();
                }

                // Reset canvas refs
                canvasRefs.current = Array(resultPages.length).fill(null);

            } catch (error: any) {
                console.error("Error loading PDF:", error);
                toast.show({
                    title: "Load Failed",
                    message: "Failed to load PDF. Please try again.",
                    variant: "error",
                    position: "top-right",
                });
            } finally {
                setIsProcessing(false);
            }
        }
    };

    // --- Actions ---

    const saveToHistory = useCallback(() => {
        const newState = { pages: [...pages], currentPage };
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(newState);
        if (newHistory.length > 20) newHistory.shift();
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    }, [pages, currentPage, history, historyIndex]);

    const undo = () => {
        if (historyIndex > 0) {
            const prevState = history[historyIndex - 1];
            setPages(prevState.pages);
            setHistoryIndex(historyIndex - 1);
        }
    };

    const redo = () => {
        if (historyIndex < history.length - 1) {
            const nextState = history[historyIndex + 1];
            setPages(nextState.pages);
            setHistoryIndex(historyIndex + 1);
        }
    };

    const toggleSelection = (id: string, isShiftKey: boolean = false) => {
        const newSelection = new Set(selectedPages);
        if (newSelection.has(id)) {
            newSelection.delete(id);
        } else {
            // Additive selection
            newSelection.add(id);
        }
        setSelectedPages(newSelection);
    };

    const rotateSelected = (angle: number) => {
        if (selectedPages.size === 0) return;
        saveToHistory();
        setPages(prev => prev.map(p =>
            selectedPages.has(p.id) ? { ...p, rotation: (p.rotation + angle) % 360 } : p
        ));
    };

    const deleteSelected = () => {
        if (selectedPages.size === 0) return;
        saveToHistory();
        setPages(prev => prev.filter(p => !selectedPages.has(p.id)));
        setSelectedPages(new Set());
    };

    const addBlankPage = () => {
        saveToHistory();
        const newPage: PageItem = {
            id: Math.random().toString(36).substr(2, 9),
            fileId: "blank",
            originalIndex: -1,
            rotation: 0,
            isBlank: true,
            fileName: "Blank Page"
        };
        setPages(prev => [...prev, newPage]);
    };

    const cloneSelected = () => {
        if (selectedPages.size === 0) return;
        saveToHistory();
        const newPages: PageItem[] = [];
        pages.forEach(p => {
            newPages.push(p);
            if (selectedPages.has(p.id)) {
                newPages.push({ ...p, id: Math.random().toString(36).substr(2, 9) });
            }
        });
        setPages(newPages);
    };

    const sortPages = (direction: 'asc' | 'desc') => {
        saveToHistory();
        const sorted = [...pages].sort((a, b) => {
            const nameA = a.fileName || "";
            const nameB = b.fileName || "";
            return direction === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
        });
        setPages(sorted);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (active.id !== over?.id) {
            saveToHistory();
            setPages((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over?.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const resetChanges = () => {
        if (initialPages.length > 0) {
            saveToHistory();
            setPages([...initialPages]);
            setSelectedPages(new Set());
            toast.show({
                title: "Reset",
                message: "Changes have been reset to original state.",
                variant: "success",
                position: "top-right",
            });
        }
    };

    const clearAll = () => {
        setFileMap({});
        setPages([]);
        setSelectedPages(new Set());
        setHistory([]);
        setHistoryIndex(-1);
    };

    const savePdf = async () => {
        const files = Object.values(fileMap).map(f => f.file);
        if (files.length === 0 || pages.length === 0) return;
        setIsProcessing(true);

        try {
            const result = await pdfApi.organize(files, { pages });
            saveAs(result.blob, result.fileName || `organized-document.pdf`);
            toast.show({
                title: "Success",
                message: "PDF organized successfully!",
                variant: "success",
                position: "top-right",
            });
        } catch (error: any) {
            console.error("Error organizing PDF:", error);
            toast.show({
                title: "Operation Failed",
                message: "Failed to organize PDF. Please try again.",
                variant: "error",
                position: "top-right",
            });
        } finally {
            setIsProcessing(false);
        }
    };

    // --- Rendering Helpers ---

    const formatFileSize = (bytes?: number) => {
        if (!bytes) return "0 B";
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
        return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    };

    useEffect(() => {
        if (Object.keys(fileMap).length === 0) return;

        const renderThumbnails = async () => {
            const scale = 0.5;

            for (let i = 0; i < pages.length; i++) {
                const pageItem = pages[i];
                if (pageItem.isBlank) continue;
                const fileInfo = fileMap[pageItem.fileId];
                if (!fileInfo || !fileInfo.proxy) continue;

                const canvas = canvasRefs.current[i];
                if (!canvas) continue;

                try {
                    const page = await fileInfo.proxy.getPage(pageItem.originalIndex + 1);
                    const viewport = page.getViewport({ scale });

                    const context = canvas.getContext("2d");
                    if (!context) continue;

                    canvas.height = viewport.height;
                    canvas.width = viewport.width;

                    await page.render({
                        canvasContext: context,
                        viewport: viewport,
                        canvas: canvas,
                    }).promise;
                } catch (e) {
                    console.error("Render error", e);
                }
            }
        };

        const timeout = setTimeout(renderThumbnails, 100);
        return () => clearTimeout(timeout);
    }, [pages, fileMap]);


    const uniqueFiles = Array.from(new Set(pages.map(p => p.fileId)))
        .map(fileId => {
            const page = pages.find(p => p.fileId === fileId);
            return {
                id: fileId,
                name: page?.fileName || "Unknown",
                size: page?.fileSize || 0,
                pageCount: pages.filter(p => p.fileId === fileId).length,
                previewPage: page
            };
        }).filter(f => f.id !== "blank");


    if (Object.keys(fileMap).length === 0) {
        return (
            <div className="min-h-[calc(100vh-120px)] flex items-center justify-center">
                <FileUploadHero
                    title="Organize PDF"
                    onFilesSelected={handleFileSelected}
                    maxFiles={10}
                    accept={{ "application/pdf": [".pdf"] }}
                />
            </div>
        );
    }

    return (
        <div className="bg-[#f8f9fa] min-h-screen pb-8">
            <div className="max-w-[1800px] mx-auto px-6 py-4">
                <div className="flex flex-col lg:flex-row gap-8">

                    {/* Main Content Area */}
                    <div className="flex-1 lg:max-w-[calc(100%-460px)]">

                        {/* Toolbar */}
                        <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-2 mb-8 flex items-center justify-between min-h-[72px]">
                            <div className="flex items-center gap-4">
                                {/* View Toggle */}
                                <div className="bg-[#f1f5f9] p-1 rounded-xl flex items-center">
                                    <button
                                        onClick={() => setViewMode("file")}
                                        className={cn(
                                            "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                                            viewMode === "file" ? "bg-white text-[#111418] shadow-sm" : "text-[#64748b] hover:text-[#111418]"
                                        )}
                                    >
                                        File View
                                    </button>
                                    <button
                                        onClick={() => setViewMode("page")}
                                        className={cn(
                                            "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                                            viewMode === "page" ? "bg-white text-[#111418] shadow-sm" : "text-[#64748b] hover:text-[#111418]"
                                        )}
                                    >
                                        Page View
                                    </button>
                                </div>

                                <div className="w-px h-10 bg-gray-200 mx-1" />

                                {/* Actions Group */}
                                <div className="flex items-center gap-1">
                                    <ToolbarButton
                                        onClick={addBlankPage}
                                        icon={<FilePlus2 className="w-5 h-5" />}
                                        label="BLANK"
                                    />
                                    <ToolbarButton
                                        onClick={cloneSelected}
                                        icon={<Copy className="w-5 h-5" />}
                                        label={`CLONE ${selectedPages.size > 0 ? `(${selectedPages.size})` : ''}`}
                                        active={selectedPages.size > 0}
                                    />
                                    <ToolbarButton
                                        onClick={deleteSelected}
                                        icon={<Trash2 className="w-5 h-5" />}
                                        label="DELETE"
                                        disabled={selectedPages.size === 0}
                                    />
                                </div>

                                <div className="w-px h-10 bg-gray-200 mx-1" />

                                {/* Rotation Group */}
                                <div className="flex items-center gap-1">
                                    <ToolbarButton
                                        onClick={() => rotateSelected(-90)}
                                        icon={<RotateCcw className="w-5 h-5" />}
                                        label="LEFT"
                                        disabled={selectedPages.size === 0}
                                    />
                                    <ToolbarButton
                                        onClick={() => rotateSelected(90)}
                                        icon={<RotateCw className="w-5 h-5" />}
                                        label="RIGHT"
                                        disabled={selectedPages.size === 0}
                                    />
                                </div>
                            </div>

                            {/* Right Side Tools */}
                            <div className="flex items-center gap-4">
                                <div className="flex items-center bg-[#f1f5f9] rounded-xl p-1 gap-1">
                                    <button onClick={() => sortPages('asc')} className="p-2 hover:bg-white rounded-lg transition-all text-[#64748b] hover:text-[#111418]" title="Sort A-Z">
                                        <ArrowDownAZ className="h-5 w-5" />
                                    </button>
                                    <button onClick={() => sortPages('desc')} className="p-2 hover:bg-white rounded-lg transition-all text-[#64748b] hover:text-[#111418]" title="Sort Z-A">
                                        <ArrowUpAZ className="h-5 w-5" />
                                    </button>
                                </div>

                                <div className="w-px h-10 bg-gray-200 mx-1" />

                                <button
                                    onClick={clearAll}
                                    className="flex items-center gap-2 px-3 py-2 text-[#64748b] hover:text-red-500 transition-colors rounded-lg font-bold text-sm"
                                >
                                    <ListRestart className="w-5 h-5" />
                                    Clear All
                                </button>
                            </div>
                        </div>

                        {/* Content Grid */}
                        {viewMode === "file" ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {uniqueFiles.map((file, index) => (
                                    <div key={file.id} className="relative group">
                                        <div className="absolute -top-3 -left-3 z-10 w-8 h-8 bg-[#4b5563] text-white rounded-full flex items-center justify-center text-xs font-bold shadow-md border-2 border-white">
                                            {index + 1}
                                        </div>

                                        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all cursor-pointer h-full">
                                            <div className="aspect-[4/5] bg-gray-50 flex items-center justify-center relative p-4 border-b border-gray-100">
                                                <div className="relative w-full h-full shadow-md bg-white rounded-lg overflow-hidden">
                                                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                                                        <FileText className="w-16 h-16 text-gray-300" />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="p-4">
                                                <h3 className="font-bold text-[#111418] text-sm truncate mb-1" title={file.name}>{file.name}</h3>
                                                <p className="text-[#64748b] text-xs font-medium">
                                                    {file.pageCount} Pages • {formatFileSize(file.size)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="bg-[#eef6ff] border-2 border-dashed border-[#136dec] rounded-2xl aspect-[4/5] flex flex-col items-center justify-center gap-4 hover:bg-[#e0f0ff] transition-all group"
                                >
                                    <div className="bg-[#136dec] rounded-full w-12 h-12 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform">
                                        <Plus className="h-6 w-6 text-white stroke-[3]" />
                                    </div>
                                    <div className="text-center px-4">
                                        <div className="text-[#136dec] text-sm font-bold mb-1">Add more files</div>
                                        <div className="text-[#136dec]/60 text-xs">or drag & drop here</div>
                                    </div>
                                </button>
                            </div>
                        ) : (
                            /* Page View with dnd-kit (Grid Support) */
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext
                                    items={pages.map(p => p.id)}
                                    strategy={rectSortingStrategy}
                                >
                                    <div className="flex flex-wrap gap-6">
                                        {pages.map((page, index) => (
                                            <SortablePageCard
                                                key={page.id}
                                                page={page}
                                                index={index}
                                                isSelected={selectedPages.has(page.id)}
                                                toggleSelection={toggleSelection}
                                                setCanvasRef={(el) => { canvasRefs.current[index] = el; }}
                                            />
                                        ))}

                                        {/* Add Pages Button as last item (not sortable, but visually in grid) */}
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="bg-[#f8fbff] border-2 border-dashed border-[#136dec] rounded-2xl flex flex-col items-center justify-center gap-3 hover:bg-[#f0f7ff] transition-all min-h-[300px] w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] xl:w-[calc(25%-18px)]"
                                        >
                                            <div className="bg-[#136dec]/10 p-3 rounded-full">
                                                <Plus className="h-6 w-6 text-[#136dec]" />
                                            </div>
                                            <span className="text-[#136dec] text-sm font-bold">Add Pages</span>
                                        </button>
                                    </div>
                                </SortableContext>
                            </DndContext>
                        )}
                    </div>

                    {/* Right Sidebar - Sticky */}
                    <div className="lg:w-[420px] lg:fixed lg:right-6 lg:top-24">
                        <div className="bg-white rounded-[32px] border border-[#e2e8f0] p-8 shadow-xl flex flex-col h-[calc(100vh-140px)]">
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-[#111418] font-black text-xl tracking-tight">Organize Settings</h2>
                                <button
                                    onClick={resetChanges}
                                    className="flex items-center gap-2 text-[#64748b] hover:text-[#136dec] text-sm font-bold transition-colors"
                                >
                                    <RefreshCcw className="w-4 h-4" />
                                    Reset
                                </button>
                            </div>

                            <div className="flex-1">
                                {selectedPages.size > 0 ? (
                                    <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100">
                                        <h3 className="text-[#136dec] font-bold mb-2">{selectedPages.size} Page{selectedPages.size > 1 ? 's' : ''} Selected</h3>
                                        <p className="text-sm text-blue-700/80 mb-4">
                                            You can rotate, delete, or clone these pages using the toolbar above.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="text-center text-gray-400 mt-20">
                                        <p className="text-sm">Select pages to see options</p>
                                    </div>
                                )}
                            </div>

                            <div className="mt-8 space-y-4">
                                <button
                                    onClick={savePdf}
                                    disabled={isProcessing || pages.length === 0}
                                    className="w-full bg-[#136dec] hover:bg-[#0e5bc7] text-white rounded-2xl h-[64px] flex items-center justify-center gap-3 font-bold text-lg shadow-xl shadow-[#136dec]/20 disabled:opacity-50 transition-all active:scale-[0.98]"
                                >
                                    <span>Download Document</span>
                                    <Download className="h-5 w-5 stroke-[3]" />
                                </button>

                                <p className="text-[#94a3b8] text-xs font-bold text-center">
                                    Don&apos;t worry, we didn&apos;t make you dizzy.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                multiple
                className="hidden"
                onChange={(e) => {
                    if (e.target.files) {
                        handleFileSelected(Array.from(e.target.files));
                    }
                }}
            />
        </div>
    );
}

function ToolbarButton({ onClick, icon, label, disabled = false, active = false }: { onClick: () => void, icon: React.ReactNode, label: string, disabled?: boolean, active?: boolean }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={cn(
                "flex flex-col items-center justify-center gap-1 min-w-[60px] p-2 rounded-xl transition-all",
                disabled ? "opacity-30 cursor-not-allowed" : "hover:bg-gray-50 active:bg-gray-100",
                active ? "text-[#136dec]" : "text-[#64748b]"
            )}
        >
            <div className={cn(
                "w-8 h-8 flex items-center justify-center rounded-lg transition-colors",
                active ? "bg-[#136dec]/10" : "bg-transparent"
            )}>
                {icon}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wide">{label}</span>
        </button>
    );
}

// Sub-component for Sortable item to keep main file clean-ish and use hooks properly
function SortablePageCard({
    page,
    index,
    isSelected,
    toggleSelection,
    setCanvasRef
}: {
    page: PageItem,
    index: number,
    isSelected: boolean,
    toggleSelection: (id: string, shift: boolean) => void,
    setCanvasRef: (el: HTMLCanvasElement | null) => void
}) {
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
        zIndex: isDragging ? 50 : undefined,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={cn(
                "relative group cursor-pointer w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] xl:w-[calc(25%-18px)] outline-none",
                isDragging && "opacity-50"
            )}
            onClick={(e) => toggleSelection(page.id, e.shiftKey)}
        >
            {/* Number Badge */}
            <div className="absolute top-4 left-4 z-10 w-6 h-6 bg-[#4b5563] text-white rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm">
                {index + 1}
            </div>

            {/* Card */}
            <div className={cn(
                "bg-white rounded-2xl border overflow-hidden transition-all hover:shadow-md h-full",
                isSelected ? "border-[#136dec] ring-4 ring-[#136dec]/10" : "border-gray-200",
                isDragging && "shadow-2xl ring-4 ring-[#136dec]/30"
            )}>
                <div className="bg-[#f8fafc] h-[240px] flex items-center justify-center p-4">
                    <div
                        className="relative shadow-md bg-white transition-transform duration-200 origin-center"
                        style={{
                            transform: `rotate(${page.rotation}deg)`,
                            width: 'auto',
                            height: '100%',
                            maxWidth: '100%',
                            aspectRatio: '0.7'
                        }}
                    >
                        {page.isBlank ? (
                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                                <FileText className="h-12 w-12 mb-2 opacity-50" />
                                <span className="text-[10px] font-black uppercase tracking-wider">Blank</span>
                            </div>
                        ) : (
                            <canvas
                                ref={setCanvasRef}
                                className="w-full h-full object-contain"
                            />
                        )}
                    </div>
                </div>
                <div className="p-4 border-t border-gray-100">
                    <div className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wide truncate">
                        {page.fileName || "Unknown"}
                    </div>
                </div>
            </div>

            {/* Selection Checkmark */}
            {isSelected && (
                <div className="absolute top-4 right-4 z-10 w-6 h-6 bg-[#136dec] text-white rounded-full flex items-center justify-center shadow-sm">
                    <div className="w-2 h-2 bg-white rounded-full" />
                </div>
            )}
        </div>
    );
}