"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { FileUpload } from "../ui/file-upload";
import { Button } from "../ui/button";
import {
    MousePointer,
    Square,
    Copy,
    Eraser,
    Search,
    X,
    ZoomIn,
    ZoomOut,
    ChevronDown,
    RotateCw,
    Download,
    FileText,
    Plus,
    Trash2
} from "lucide-react";
import { getPdfJs } from "@/lib/services/pdf-service";
import { PDFDocument, rgb } from "pdf-lib";
import { toast } from "@/lib/hooks/use-toast";
import { cn } from "@/lib/utils";

interface RedactionMark {
    id: string;
    text: string;
    page: number;
    x: number;
    y: number;
    width: number;
    height: number;
}

export function RedactPdfTool() {
    // File state
    const [file, setFile] = useState<File | null>(null);
    const [numPages, setNumPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [zoom, setZoom] = useState(100);
    const [isProcessing, setIsProcessing] = useState(false);

    // Redaction state
    const [redactionMarks, setRedactionMarks] = useState<RedactionMark[]>([]);
    const [searchText, setSearchText] = useState("");
    const [activeTool, setActiveTool] = useState<"select" | "redact" | "text" | "erase">("select");

    // Drawing state for manual redaction
    const [isDrawing, setIsDrawing] = useState(false);
    const [drawStart, setDrawStart] = useState<{ x: number; y: number; page: number } | null>(null);
    const [currentDraw, setCurrentDraw] = useState<{ x: number; y: number } | null>(null);

    // Canvas refs
    const mainCanvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
    const thumbnailCanvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Track render tasks to cancel previous renders
    const renderTasksRef = useRef<any[]>([]);
    const isRenderingRef = useRef(false);

    // Handle file selection
    const handleFileSelected = async (files: File[]) => {
        if (files.length > 0) {
            setFile(files[0]);
            setRedactionMarks([]);
            setCurrentPage(1);
            setSearchText("");

            const pdfjsLib = await getPdfJs();
            const arrayBuffer = await files[0].arrayBuffer();
            const pdf = await (pdfjsLib as any).getDocument(new Uint8Array(arrayBuffer)).promise;
            setNumPages(pdf.numPages);
            mainCanvasRefs.current = Array(pdf.numPages).fill(null);
            thumbnailCanvasRefs.current = Array(pdf.numPages).fill(null);
        }
    };

    // Render main PDF pages
    useEffect(() => {
        if (!file || numPages === 0) return;

        // Cancel any ongoing render tasks
        renderTasksRef.current.forEach(task => {
            if (task && task.cancel) {
                task.cancel();
            }
        });
        renderTasksRef.current = [];

        // Debounce to avoid rapid re-renders
        const timeoutId = setTimeout(async () => {
            if (isRenderingRef.current) return;
            isRenderingRef.current = true;

            try {
                const pdfjsLib = await getPdfJs();
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await (pdfjsLib as any).getDocument(new Uint8Array(arrayBuffer)).promise;
                const scale = zoom / 100;

                for (let i = 1; i <= numPages; i++) {
                    const page = await pdf.getPage(i);
                    const viewport = page.getViewport({ scale });
                    const canvas = mainCanvasRefs.current[i - 1];
                    if (!canvas) continue;

                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    const ctx = canvas.getContext("2d")!;

                    // Clear canvas before rendering
                    ctx.clearRect(0, 0, canvas.width, canvas.height);

                    const renderTask = page.render({ canvasContext: ctx, viewport });
                    renderTasksRef.current.push(renderTask);

                    try {
                        await renderTask.promise;
                    } catch (e: any) {
                        if (e.name === 'RenderingCancelledException') {
                            continue; // Skip if cancelled
                        }
                        throw e;
                    }

                    // Draw redaction marks on this page
                    const pageMarks = redactionMarks.filter(m => m.page === i);
                    ctx.fillStyle = "rgba(255, 0, 0, 0.3)";
                    ctx.strokeStyle = "#ff0000";
                    ctx.lineWidth = 2;
                    pageMarks.forEach(mark => {
                        const x = (mark.x / 100) * canvas.width;
                        const y = (mark.y / 100) * canvas.height;
                        const w = (mark.width / 100) * canvas.width;
                        const h = (mark.height / 100) * canvas.height;
                        ctx.fillRect(x, y, w, h);
                        ctx.strokeRect(x, y, w, h);
                    });

                    // Draw current drawing rectangle
                    if (isDrawing && drawStart && currentDraw && drawStart.page === i) {
                        const startX = (drawStart.x / 100) * canvas.width;
                        const startY = (drawStart.y / 100) * canvas.height;
                        const endX = (currentDraw.x / 100) * canvas.width;
                        const endY = (currentDraw.y / 100) * canvas.height;
                        ctx.fillStyle = "rgba(255, 0, 0, 0.3)";
                        ctx.strokeStyle = "#ff0000";
                        ctx.lineWidth = 2;
                        ctx.fillRect(Math.min(startX, endX), Math.min(startY, endY), Math.abs(endX - startX), Math.abs(endY - startY));
                        ctx.strokeRect(Math.min(startX, endX), Math.min(startY, endY), Math.abs(endX - startX), Math.abs(endY - startY));
                    }
                }
            } catch (error) {
                console.error("Render error:", error);
            } finally {
                isRenderingRef.current = false;
            }
        }, 50); // Small debounce

        return () => {
            clearTimeout(timeoutId);
            renderTasksRef.current.forEach(task => {
                if (task && task.cancel) {
                    task.cancel();
                }
            });
        };
    }, [file, numPages, zoom, redactionMarks, isDrawing, drawStart, currentDraw]);

    // Render thumbnails
    useEffect(() => {
        if (!file || numPages === 0) return;

        const renderThumbnails = async () => {
            const pdfjsLib = await getPdfJs();
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await (pdfjsLib as any).getDocument(new Uint8Array(arrayBuffer)).promise;

            for (let i = 1; i <= numPages; i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 0.15 });
                const canvas = thumbnailCanvasRefs.current[i - 1];
                if (!canvas) continue;

                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const ctx = canvas.getContext("2d")!;
                await page.render({ canvasContext: ctx, viewport }).promise;
            }
        };

        renderThumbnails();
    }, [file, numPages]);

    // Handle mouse events for drawing redaction boxes
    const handleMouseDown = (e: React.MouseEvent, pageIndex: number) => {
        if (activeTool !== "redact") return;
        const canvas = mainCanvasRefs.current[pageIndex];
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        setIsDrawing(true);
        setDrawStart({ x, y, page: pageIndex + 1 });
        setCurrentDraw({ x, y });
    };

    const handleMouseMove = (e: React.MouseEvent, pageIndex: number) => {
        if (!isDrawing || activeTool !== "redact") return;
        const canvas = mainCanvasRefs.current[pageIndex];
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setCurrentDraw({ x, y });
    };

    const handleMouseUp = (pageIndex: number) => {
        if (!isDrawing || !drawStart || !currentDraw) return;
        setIsDrawing(false);

        const x = Math.min(drawStart.x, currentDraw.x);
        const y = Math.min(drawStart.y, currentDraw.y);
        const width = Math.abs(currentDraw.x - drawStart.x);
        const height = Math.abs(currentDraw.y - drawStart.y);

        if (width < 1 || height < 1) {
            setDrawStart(null);
            setCurrentDraw(null);
            return;
        }

        const newMark: RedactionMark = {
            id: Math.random().toString(36).substr(2, 9),
            text: `Area ${redactionMarks.length + 1}`,
            page: drawStart.page,
            x, y, width, height
        };

        setRedactionMarks(prev => [...prev, newMark]);
        setDrawStart(null);
        setCurrentDraw(null);
    };

    // Search and mark text for redaction
    const searchAndMark = async () => {
        if (!file || !searchText.trim()) return;
        setIsProcessing(true);

        try {
            const pdfjsLib = await getPdfJs();
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await (pdfjsLib as any).getDocument(new Uint8Array(arrayBuffer)).promise;
            const newMarks: RedactionMark[] = [];

            for (let i = 1; i <= numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const viewport = page.getViewport({ scale: 1.0 });

                for (const item of textContent.items) {
                    const text = item.str;
                    if (!text) continue;

                    const regex = new RegExp(searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
                    if (regex.test(text)) {
                        const transform = item.transform;
                        // PDF coordinates: origin at bottom-left
                        // Canvas coordinates: origin at top-left
                        // Transform: [scaleX, skewY, skewX, scaleY, translateX, translateY]
                        const tx = transform[4];
                        const ty = transform[5];
                        const itemHeight = item.height || Math.abs(transform[3]) || 12;
                        const itemWidth = item.width || 50;

                        // Add padding for better coverage
                        const padding = 2;
                        const x = ((tx - padding) / viewport.width) * 100;
                        const y = ((viewport.height - ty - itemHeight - padding) / viewport.height) * 100;
                        const width = ((itemWidth + padding * 2) / viewport.width) * 100;
                        const height = ((itemHeight + padding * 2) / viewport.height) * 100;

                        newMarks.push({
                            id: Math.random().toString(36).substr(2, 9),
                            text: text,
                            page: i,
                            x: Math.max(0, x),
                            y: Math.max(0, y),
                            width: Math.min(100 - x, width),
                            height: Math.min(100 - y, height)
                        });
                    }
                }
            }

            setRedactionMarks(prev => [...prev, ...newMarks]);
            toast.show({
                title: "Search Complete",
                message: `Found ${newMarks.length} matches for "${searchText}"`,
                variant: "success",
                position: "top-right"
            });
        } catch (error) {
            console.error("Search error:", error);
            toast.show({
                title: "Search Failed",
                message: "Failed to search text in PDF",
                variant: "error",
                position: "top-right"
            });
        } finally {
            setIsProcessing(false);
        }
    };

    // Remove a redaction mark
    const removeMark = (id: string) => {
        setRedactionMarks(prev => prev.filter(m => m.id !== id));
    };

    // Clear all marks
    const clearAllMarks = () => {
        setRedactionMarks([]);
    };

    // Apply redactions and download (frontend-only using pdf-lib)
    const applyRedactions = async () => {
        if (!file || redactionMarks.length === 0) return;
        setIsProcessing(true);

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdfDoc = await PDFDocument.load(arrayBuffer);
            const pages = pdfDoc.getPages();

            for (const mark of redactionMarks) {
                const page = pages[mark.page - 1];
                if (!page) continue;

                const { width, height } = page.getSize();
                const x = (mark.x / 100) * width;
                const y = height - (mark.y / 100) * height - (mark.height / 100) * height;
                const w = (mark.width / 100) * width;
                const h = (mark.height / 100) * height;

                // Draw black rectangle over the redacted area
                page.drawRectangle({
                    x, y, width: w, height: h,
                    color: rgb(0, 0, 0),
                });
            }

            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `redacted-${file.name}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast.show({
                title: "Success",
                message: "PDF redacted and downloaded!",
                variant: "success",
                position: "top-right"
            });
        } catch (error) {
            console.error("Redaction error:", error);
            toast.show({
                title: "Redaction Failed",
                message: "Failed to apply redactions",
                variant: "error",
                position: "top-right"
            });
        } finally {
            setIsProcessing(false);
        }
    };

    // Scroll to page when thumbnail clicked
    const scrollToPage = (pageNum: number) => {
        setCurrentPage(pageNum);
        const canvas = mainCanvasRefs.current[pageNum - 1];
        if (canvas && scrollContainerRef.current) {
            canvas.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    // If no file, show file upload
    if (!file) {
        return (
            <div className="container mx-auto px-4 py-12 max-w-5xl">
                <div className="text-center mb-12 space-y-4">
                    <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">
                        Redact PDF
                    </h1>
                    <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
                        Redact text and graphics to permanently remove sensitive information from a PDF.
                    </p>
                </div>
                <div className="mx-auto max-w-2xl">
                    <FileUpload
                        onFilesSelected={handleFileSelected}
                        maxFiles={1}
                        accept={{ "application/pdf": [".pdf"] }}
                        description="Drop a PDF file here or click to browse"
                    />
                </div>
            </div>
        );
    }

    // Group marks by page for sidebar
    const marksByPage: { [key: number]: RedactionMark[] } = {};
    redactionMarks.forEach(mark => {
        if (!marksByPage[mark.page]) marksByPage[mark.page] = [];
        marksByPage[mark.page].push(mark);
    });

    return (
        <div className="flex h-[calc(100vh-64px)] bg-slate-100">
            {/* LEFT SIDEBAR - Page Thumbnails */}
            <div className="w-24 bg-white border-r border-slate-200 overflow-y-auto flex flex-col items-center py-4 gap-3">
                {Array.from({ length: numPages }, (_, i) => (
                    <button
                        key={i}
                        onClick={() => scrollToPage(i + 1)}
                        className={cn(
                            "relative rounded-lg overflow-hidden border-2 transition-all",
                            currentPage === i + 1 ? "border-blue-500 shadow-lg" : "border-slate-200 hover:border-slate-400"
                        )}
                    >
                        <canvas
                            ref={el => { thumbnailCanvasRefs.current[i] = el; }}
                            className="w-16"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs text-center py-0.5">
                            {i + 1}
                        </div>
                        {marksByPage[i + 1]?.length > 0 && (
                            <div className="absolute top-1 right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                                {marksByPage[i + 1].length}
                            </div>
                        )}
                    </button>
                ))}
            </div>

            {/* CENTER - Main PDF Viewer */}
            <div className="flex-1 flex flex-col">
                {/* Top Toolbar */}
                <div className="h-12 bg-white border-b border-slate-200 flex items-center justify-between px-4">
                    <div className="flex items-center gap-1">
                        <Button
                            variant={activeTool === "select" ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => setActiveTool("select")}
                            className="gap-1"
                        >
                            <MousePointer className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={activeTool === "redact" ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => setActiveTool("redact")}
                            className={cn("gap-1", activeTool === "redact" && "bg-red-100 text-red-600")}
                        >
                            <Square className="h-4 w-4" />
                            Redact
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setActiveTool("text")}
                            className="gap-1"
                        >
                            <FileText className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setActiveTool("erase")}
                            className="gap-1"
                        >
                            <Eraser className="h-4 w-4" />
                        </Button>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => setZoom(Math.max(50, zoom - 25))}>
                            <ZoomOut className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-medium w-16 text-center">{zoom}%</span>
                        <Button variant="ghost" size="icon" onClick={() => setZoom(Math.min(200, zoom + 25))}>
                            <ZoomIn className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* PDF Canvas Area */}
                <div
                    ref={scrollContainerRef}
                    className="flex-1 overflow-auto bg-slate-200 p-6"
                >
                    <div className="flex flex-col items-center gap-6">
                        {Array.from({ length: numPages }, (_, i) => (
                            <div
                                key={i}
                                className="relative shadow-xl bg-white"
                                onMouseDown={(e) => handleMouseDown(e, i)}
                                onMouseMove={(e) => handleMouseMove(e, i)}
                                onMouseUp={() => handleMouseUp(i)}
                                onMouseLeave={() => isDrawing && handleMouseUp(i)}
                                style={{ cursor: activeTool === "redact" ? "crosshair" : "default" }}
                            >
                                <canvas
                                    ref={el => { mainCanvasRefs.current[i] = el; }}
                                    className="block"
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bottom Bar - Zoom & File Info */}
                <div className="h-10 bg-white border-t border-slate-200 flex items-center justify-between px-4 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                        <select
                            value={zoom}
                            onChange={e => setZoom(Number(e.target.value))}
                            className="border border-slate-200 rounded px-2 py-1 text-xs"
                        >
                            {[50, 75, 100, 125, 150, 200].map(z => (
                                <option key={z} value={z}>{z}%</option>
                            ))}
                        </select>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                            <RotateCw className="h-3 w-3" />
                        </Button>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                        <FileText className="h-3 w-3" />
                        <span className="truncate max-w-[200px]">{file.name}</span>
                    </div>
                </div>
            </div>

            {/* RIGHT SIDEBAR - Search & Redaction List */}
            <div className="w-72 bg-white border-l border-slate-200 flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-slate-200">
                    <h2 className="text-lg font-bold text-slate-900">Redact PDF</h2>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-slate-200">
                    <div className="relative">
                        <input
                            type="text"
                            value={searchText}
                            onChange={e => setSearchText(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && searchAndMark()}
                            placeholder="Search text"
                            className="w-full h-10 border border-slate-200 rounded-lg px-3 pr-10 text-sm"
                        />
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1 h-8 w-8"
                            onClick={searchAndMark}
                            disabled={isProcessing || !searchText.trim()}
                        >
                            <Search className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Marked for Redaction */}
                <div className="flex-1 overflow-auto">
                    <div className="p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-slate-700">Marked for redaction</h3>
                            {redactionMarks.length > 0 && (
                                <button
                                    onClick={clearAllMarks}
                                    className="text-xs text-blue-600 hover:underline"
                                >
                                    Clear all
                                </button>
                            )}
                        </div>

                        {redactionMarks.length === 0 ? (
                            <div className="bg-red-50 border border-red-100 rounded-lg p-4 text-sm text-red-800">
                                Select and search text or pages to start redacting sensitive content.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {Object.keys(marksByPage).sort((a, b) => Number(a) - Number(b)).map(pageNum => (
                                    <div key={pageNum}>
                                        <div className="text-xs font-medium text-slate-500 mb-2">Page {pageNum}</div>
                                        <div className="space-y-1">
                                            {marksByPage[Number(pageNum)].map(mark => (
                                                <div
                                                    key={mark.id}
                                                    className="flex items-center gap-2 p-2 bg-slate-50 rounded hover:bg-slate-100 group"
                                                >
                                                    <div className="w-5 h-5 bg-red-100 rounded flex items-center justify-center flex-shrink-0">
                                                        <span className="text-red-600 text-xs font-bold">T</span>
                                                    </div>
                                                    <span className="text-sm flex-1 truncate">{mark.text}</span>
                                                    <button
                                                        onClick={() => removeMark(mark.id)}
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <X className="h-4 w-4 text-slate-400 hover:text-red-500" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Redact Button */}
                <div className="p-4 border-t border-slate-200">
                    <Button
                        onClick={applyRedactions}
                        disabled={isProcessing || redactionMarks.length === 0}
                        className="w-full h-12 bg-red-500 hover:bg-red-600 text-white font-bold text-lg rounded-lg"
                    >
                        {isProcessing ? "Processing..." : (
                            <>
                                Redact
                                <Download className="h-5 w-5 ml-2" />
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}