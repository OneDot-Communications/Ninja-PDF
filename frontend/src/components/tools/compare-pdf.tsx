"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { saveAs } from "file-saver";
import FileUploadHero from "../ui/file-upload-hero";
import { Button } from "../ui/button";
import { Input } from "@/components/ui/input";
import {
    ChevronLeft,
    ChevronRight,
    ZoomIn,
    ZoomOut,
    Download,
    RefreshCcw,
    SlidersHorizontal,
    Search,
    FileText,
    Layers,
    ArrowRightCircle,
    CheckCircle2
} from "lucide-react";
import { pdfStrategyManager, getPdfJs } from "@/lib/services/pdf-service";
import { toast } from "@/lib/hooks/use-toast";
import { cn } from "@/lib/utils";
import { computeDiff, computeGenericDiff, DiffResult } from "@/lib/diff-utils";

interface TextItem {
    str: string;
    transform: number[]; // [scaleX, skewY, skewX, scaleY, x, y]
    width: number;
    height: number;
    hasEOL: boolean;
}

interface PageTextData {
    items: TextItem[];
    fullText: string;
}

export function ComparePdfTool() {
    // File state
    const [file1, setFile1] = useState<File | null>(null);
    const [file2, setFile2] = useState<File | null>(null);
    const [numPages, setNumPages] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [zoom, setZoom] = useState(100);

    // UI state
    const [compareMode, setCompareMode] = useState<"overlay" | "text">("text");
    const [syncScroll, setSyncScroll] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Refs
    const canvas1Refs = useRef<(HTMLCanvasElement | null)[]>([]);
    const canvas2Refs = useRef<(HTMLCanvasElement | null)[]>([]);

    // Scroll Refs for Synchronization
    const leftScrollRef = useRef<HTMLDivElement>(null);
    const rightScrollRef = useRef<HTMLDivElement>(null);
    const isScrollingRef = useRef<"left" | "right" | null>(null);

    // Text Comparison State
    const [diffResults, setDiffResults] = useState<DiffResult<string>[]>([]);
    const [isComparing, setIsComparing] = useState(false);

    // We don't strictly need state for full text items if we process diffs per page during render,
    // but keeping it for sidebar logic is good.
    const [textData1, setTextData1] = useState<PageTextData[]>([]);
    const [textData2, setTextData2] = useState<PageTextData[]>([]);

    // Handle initial file selection
    const handleFilesSelected = async (files: File[]) => {
        if (files.length === 0) return;

        if (files.length >= 2) {
            setFile1(files[0]);
            setFile2(files[1]);
        } else if (files.length === 1) {
            if (!file1) setFile1(files[0]);
            else if (!f2IsDifferent(files[0], file2)) setFile2(files[0]);
        }
    };

    const f2IsDifferent = (newFile: File, currentFile2: File | null) => {
        if (!currentFile2) return true;
        return newFile !== currentFile2;
    }

    // Effect 1: Determine Number of Pages
    useEffect(() => {
        if (!file1 && !file2) return;

        const loadMetadata = async () => {
            const pdfjsLib = await getPdfJs();
            let maxPages = 0;

            if (file1) {
                try {
                    const ab = await file1.arrayBuffer();
                    const pdf = await (pdfjsLib as any).getDocument(new Uint8Array(ab)).promise;
                    maxPages = Math.max(maxPages, pdf.numPages);
                } catch (e) {
                    console.error("Error loading file 1 metadata", e);
                }
            }
            if (file2) {
                try {
                    const ab = await file2.arrayBuffer();
                    const pdf = await (pdfjsLib as any).getDocument(new Uint8Array(ab)).promise;
                    maxPages = Math.max(maxPages, pdf.numPages);
                } catch (e) {
                    console.error("Error loading file 2 metadata", e);
                }
            }

            setNumPages(maxPages);
            if (maxPages > canvas1Refs.current.length) {
                canvas1Refs.current = Array(maxPages).fill(null);
                canvas2Refs.current = Array(maxPages).fill(null);
            }
        };

        loadMetadata();
    }, [file1, file2]);


    // Effect 2: Render Content, Extract Text & Highlight Differences
    useEffect(() => {
        if (!file1 && !file2) return;
        if (numPages === 0) return;

        let isCanceled = false;
        const renderTasks: any[] = [];

        const processFiles = async () => {
            const pdfjsLib = await getPdfJs();
            const scale = zoom / 100;
            const newTextData1: PageTextData[] = [];
            const newTextData2: PageTextData[] = [];

            // Helper to draw highlight on canvas
            const highlightItem = (
                ctx: CanvasRenderingContext2D,
                viewport: any,
                item: TextItem,
                color: string
            ) => {
                // item.transform gives [scaleX, skewY, skewX, scaleY, x, y]
                // But PDF coordinate system is bottom-left origin.
                // viewport.convertToViewportRectangle transforms [x, y, w, h] to canvas coords [x1, y1, x2, y2]

                // x, y from transform
                const x = item.transform[4];
                const y = item.transform[5];
                const w = item.width;
                const h = item.height;

                // Note: y is usually bottom of the text in PDF coords.
                // We construct a rectangle. PDF rect is usually [x, y, x+w, y+h].
                // But convertToViewportRectangle expects [x_min, y_min, x_max, y_max].

                // The tricky part: Font size/height. item.height is usually correct.
                // Let's rely on viewport transform.
                const rect = [x, y, x + w, y + h];
                const viewRect = viewport.convertToViewportRectangle(rect);

                // viewRect = [minX, minY, maxX, maxY] usually, but let's calculate geometry
                // Depending on rotation, it might return [x1, y1, x2, y2] where x1>x2 etc.
                const minX = Math.min(viewRect[0], viewRect[2]);
                const minY = Math.min(viewRect[1], viewRect[3]);
                const width = Math.abs(viewRect[2] - viewRect[0]);
                const height = Math.abs(viewRect[3] - viewRect[1]);

                ctx.fillStyle = color;
                ctx.globalAlpha = 0.3; // Transparency
                ctx.fillRect(minX, minY, width, height);
                ctx.globalAlpha = 1.0;
            };

            // Pre-load documents to get pages easily
            let pdf1: any = null;
            let pdf2: any = null;

            if (file1) {
                const ab = await file1.arrayBuffer();
                pdf1 = await (pdfjsLib as any).getDocument(new Uint8Array(ab)).promise;
            }
            if (file2) {
                const ab = await file2.arrayBuffer();
                pdf2 = await (pdfjsLib as any).getDocument(new Uint8Array(ab)).promise;
            }

            // Loop through pages
            for (let i = 1; i <= numPages; i++) {
                if (isCanceled) break;

                let page1Items: TextItem[] = [];
                let page2Items: TextItem[] = [];
                let viewport1: any = null;
                let viewport2: any = null;

                // Process Page 1 (File A)
                if (pdf1 && i <= pdf1.numPages) {
                    const page = await pdf1.getPage(i);
                    viewport1 = page.getViewport({ scale });
                    const canvas = canvas1Refs.current[i - 1];

                    if (canvas && canvas.getContext("2d")) {
                        const context = canvas.getContext("2d")!;
                        canvas.height = viewport1.height;
                        canvas.width = viewport1.width;

                        const task = page.render({ canvasContext: context, viewport: viewport1, canvas });
                        renderTasks.push(task);
                        try { await task.promise; } catch (e) { }

                        // Extract Text
                        const content = await page.getTextContent();
                        page1Items = content.items.map((item: any) => ({
                            str: item.str, transform: item.transform, width: item.width, height: item.height, hasEOL: item.hasEOL
                        }));
                        newTextData1.push({ items: page1Items, fullText: page1Items.map(t => t.str).join(" ") });
                    }
                }

                // Process Page 2 (File B)
                if (pdf2 && i <= pdf2.numPages) {
                    const page = await pdf2.getPage(i);
                    viewport2 = page.getViewport({ scale });
                    const canvas = canvas2Refs.current[i - 1];

                    if (canvas && canvas.getContext("2d")) {
                        const context = canvas.getContext("2d")!;
                        canvas.height = viewport2.height;
                        canvas.width = viewport2.width;

                        const task = page.render({ canvasContext: context, viewport: viewport2, canvas });
                        renderTasks.push(task);
                        try { await task.promise; } catch (e) { }

                        // Extract Text
                        const content = await page.getTextContent();
                        page2Items = content.items.map((item: any) => ({
                            str: item.str, transform: item.transform, width: item.width, height: item.height, hasEOL: item.hasEOL
                        }));
                        newTextData2.push({ items: page2Items, fullText: page2Items.map(t => t.str).join(" ") });
                    }
                }

                // Calculate Diff for this page and Highlight!
                if (page1Items.length > 0 && page2Items.length > 0) {
                    // We diff the ITEMS based on their string content
                    // This allows us to map back to the visual item coordinates
                    const itemDiffs = computeGenericDiff(page1Items, page2Items, (a, b) => a.str.trim() === b.str.trim());

                    // Draw Highlights
                    itemDiffs.forEach(diff => {
                        if (diff.type === 'remove') {
                            // Removed from A -> Highlight RED on Canvas A
                            if (canvas1Refs.current[i - 1] && viewport1) {
                                const ctx = canvas1Refs.current[i - 1]!.getContext("2d");
                                if (ctx) highlightItem(ctx, viewport1, diff.value, "#ef4444"); // Red-500
                            }
                        } else if (diff.type === 'add') {
                            // Added to B -> Highlight GREEN on Canvas B
                            if (canvas2Refs.current[i - 1] && viewport2) {
                                const ctx = canvas2Refs.current[i - 1]!.getContext("2d");
                                if (ctx) highlightItem(ctx, viewport2, diff.value, "#22c55e"); // Green-500
                            }
                        }
                    });
                }

                // Wait a tiny bit to not block UI
                await new Promise(r => setTimeout(r, 0));
            }

            if (!isCanceled) {
                setTextData1(newTextData1);
                setTextData2(newTextData2);

                // Re-compute generic string diff for Sidebar (so it's clean and easy to read)
                if (newTextData1.length > 0 && newTextData2.length > 0) {
                    let allStringDiffs: DiffResult<string>[] = [];
                    const pagesToCompare = Math.min(newTextData1.length, newTextData2.length);
                    for (let i = 0; i < pagesToCompare; i++) {
                        allStringDiffs = [...allStringDiffs, ...computeDiff(newTextData1[i].fullText, newTextData2[i].fullText)];
                    }
                    setDiffResults(allStringDiffs);
                }

                setIsComparing(false);
            }
        };

        setIsComparing(true);
        processFiles();

        return () => {
            isCanceled = true;
            renderTasks.forEach(task => task.cancel());
        };
    }, [file1, file2, zoom, numPages]);

    // Scroll Sync Logic
    const handleScroll = (source: "left" | "right") => {
        if (!syncScroll) return;
        const sourceRef = source === "left" ? leftScrollRef : rightScrollRef;
        const targetRef = source === "left" ? rightScrollRef : leftScrollRef;
        if (isScrollingRef.current && isScrollingRef.current !== source) return;
        isScrollingRef.current = source;
        if (sourceRef.current && targetRef.current) {
            targetRef.current.scrollTop = sourceRef.current.scrollTop;
            targetRef.current.scrollLeft = sourceRef.current.scrollLeft;
        }
        if ((window as any).scrollTimeout) clearTimeout((window as any).scrollTimeout);
        (window as any).scrollTimeout = setTimeout(() => { isScrollingRef.current = null; }, 50);
    };

    const exportComparison = async () => {
        if (!file1 || !file2) return;
        setIsProcessing(true);
        try {
            const result = await pdfStrategyManager.execute('compare', [file1, file2], {
                comparisonMode: 'side-by-side', comparisonElements: []
            });
            saveAs(result.blob, result.fileName || `comparison-${file1.name}-vs-${file2.name}`);
            toast.show({ title: "Success", message: "Comparison exported successfully!", variant: "success", position: "top-right", });
        } catch (error) {
            console.error("Error exporting", error);
            toast.show({ title: "Export Failed", message: "Failed to export. Please try again.", variant: "error", position: "top-right", });
        } finally { setIsProcessing(false); }
    };

    const changesCount = diffResults.filter(d => d.type !== 'keep').length;
    const additionCount = diffResults.filter(d => d.type === 'add').length;
    const deletionCount = diffResults.filter(d => d.type === 'remove').length;

    if (!file1 || !file2) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)]">
                <FileUploadHero
                    title={!file1 ? "Compare PDFs" : "Upload Second PDF"}
                    description={!file1 ? "Upload two PDFs to compare side-by-side" : `First file selected: ${file1.name}`}
                    onFilesSelected={handleFilesSelected}
                    maxFiles={2}
                    accept={{ "application/pdf": [".pdf"] }}
                />
            </div>
        );
    }

    return (
        <div className="flex bg-[#F3F4F6] min-h-[calc(100vh-64px)] font-sans relative">
            <div className="flex-1 flex flex-col relative overflow-hidden">
                <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 print:hidden hidden md:block"></div>

                <div className="flex-1 grid grid-cols-2 relative mt-0">
                    {/* File A */}
                    <div className="flex flex-col h-full border-r border-gray-200 bg-[#f8f9fa]">
                        <div className="h-12 bg-white border-b border-gray-100 flex items-center px-6 sticky top-0 z-10">
                            <div className="w-2 h-2 rounded-full bg-red-500 mr-2"></div>
                            <span className="text-sm font-bold text-gray-700 truncate max-w-[200px]" title={file1.name}>File A</span>
                        </div>
                        <div ref={leftScrollRef} onScroll={() => handleScroll("left")} className="flex-1 overflow-y-auto overflow-x-hidden p-6 sm:p-8 lg:p-12 scroll-smooth">
                            <div className="flex flex-col items-center gap-8 min-h-max pb-20 pt-16">
                                {Array.from({ length: numPages }).map((_, index) => (
                                    <div key={`file1-page-${index}`} className="flex flex-col gap-2 w-full max-w-[600px] relative">
                                        <div className="bg-white rounded shadow-sm border border-gray-100 relative overflow-hidden transition-shadow hover:shadow-md">
                                            <canvas ref={el => { canvas1Refs.current[index] = el; }} className="w-full h-auto block" />
                                        </div>
                                        <span className="text-xs text-center text-gray-400 font-medium">Page {index + 1} of {numPages}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* File B */}
                    <div className="flex flex-col h-full bg-[#f8f9fa]">
                        <div className="h-12 bg-white border-b border-gray-100 flex items-center px-6 sticky top-0 z-10">
                            <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                            <span className="text-sm font-bold text-gray-700 truncate max-w-[200px]" title={file2.name}>File B</span>
                        </div>
                        <div ref={rightScrollRef} onScroll={() => handleScroll("right")} className="flex-1 overflow-y-auto overflow-x-hidden p-6 sm:p-8 lg:p-12 scroll-smooth">
                            <div className="flex flex-col items-center gap-8 min-h-max pb-20 pt-16">
                                {Array.from({ length: numPages }).map((_, index) => (
                                    <div key={`file2-page-${index}`} className="flex flex-col gap-2 w-full max-w-[600px] relative">
                                        <div className="bg-white rounded shadow-sm border border-gray-100 relative overflow-hidden transition-shadow hover:shadow-md">
                                            <canvas ref={el => { canvas2Refs.current[index] = el; }} className="w-full h-auto block" />
                                        </div>
                                        <span className="text-xs text-center text-gray-400 font-medium">Page {index + 1} of {numPages}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sidebar */}
            <div className="w-[340px] bg-white border-l border-gray-200 flex flex-col shadow-xl z-30 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-white">
                    <h2 className="text-[#111418] font-black text-xl tracking-tight mb-6">Configuration</h2>
                    <div className="flex p-1 bg-gray-100 rounded-lg mb-6">
                        <button onClick={() => setCompareMode("text")} className={cn("flex-1 flex flex-col items-center justify-center py-3 rounded-md text-sm font-medium transition-all gap-1", compareMode === "text" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-900")}>
                            <FileText className="w-5 h-5 mb-1" /> Semantic Text
                        </button>
                        <button onClick={() => setCompareMode("overlay")} className={cn("flex-1 flex flex-col items-center justify-center py-3 rounded-md text-sm font-medium transition-all gap-1", compareMode === "overlay" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-900")}>
                            <Layers className="w-5 h-5 mb-1" /> Content Overlay
                        </button>
                    </div>
                    {compareMode === "text" && (<div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-800 mb-6">Compare text changes between two PDFs.</div>)}
                    {compareMode === "overlay" && (<div className="bg-gray-50 border border-gray-100 rounded-lg p-3 text-sm text-gray-600 mb-6">Highlight visual pixel differences.</div>)}
                    <div className="relative mb-6">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 bg-white border-gray-200 focus:border-[#136dec] focus:ring-[#136dec]/20 h-10 rounded-lg" placeholder="Search text" />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto bg-gray-50/50">
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-gray-900">Change report ({changesCount})</h3>
                            <span className="text-xs text-gray-500">{numPages} Pages</span>
                        </div>
                        {(additionCount > 0 || deletionCount > 0) && (
                            <div className="flex gap-2 mb-6">
                                <div className="flex-1 bg-green-50 border border-green-100 rounded-lg p-2 text-center">
                                    <span className="block text-xl font-bold text-green-600">+{additionCount}</span>
                                    <span className="text-xs text-green-700 font-medium">Additions</span>
                                </div>
                                <div className="flex-1 bg-red-50 border border-red-100 rounded-lg p-2 text-center">
                                    <span className="block text-xl font-bold text-red-600">-{deletionCount}</span>
                                    <span className="text-xs text-red-700 font-medium">Deletions</span>
                                </div>
                            </div>
                        )}
                        <div className="space-y-3">
                            {isComparing ? (
                                <div className="text-center py-8 text-gray-500">Computing differences...</div>
                            ) : changesCount === 0 ? (
                                <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                                    <CheckCircle2 className="w-12 h-12 mb-2 opacity-20" />
                                    <p className="text-sm">No text differences found</p>
                                </div>
                            ) : (
                                diffResults.map((diff, i) => {
                                    if (diff.type === 'keep') return null;
                                    const val = diff.value.trim();
                                    if (!val) return null;
                                    if (searchQuery && !val.toLowerCase().includes(searchQuery.toLowerCase())) return null;

                                    return (
                                        <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                                            <div className="px-3 py-2 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
                                                <span className={cn("text-xs font-bold uppercase", diff.type === 'add' ? "text-green-600" : "text-red-600")}>
                                                    {diff.type === 'add' ? "Addition" : "Deletion"}
                                                </span>
                                                <span className={cn("text-xs font-medium px-1.5 py-0.5 rounded", diff.type === 'add' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                                                    {diff.type === 'add' ? "+" : "-"}{diff.value.length}
                                                </span>
                                            </div>
                                            <div className="p-3 text-sm text-gray-700 break-words leading-relaxed font-mono bg-white">{diff.value}</div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
                <div className="p-6 bg-white border-t border-gray-100">
                    <button onClick={exportComparison} disabled={isProcessing} className="w-full bg-[#E11D48] hover:bg-[#be123c] text-white rounded-xl h-[56px] flex items-center justify-center gap-2 font-bold text-base shadow-lg shadow-[#E11D48]/20 disabled:opacity-50 transition-all active:scale-[0.98]">
                        <span>Download report</span> <ArrowRightCircle className="h-5 w-5 stroke-[2.5]" />
                    </button>
                </div>
            </div>
        </div>
    );
}