"use client";

import { useState, useRef, useEffect } from "react";
import { saveAs } from "file-saver";
import { isPasswordError } from "@/lib/utils";
import FileUploadHero from "../ui/file-upload-hero";
import { Button } from "../ui/button";
import {
    Scissors,
    Settings,
    Trash2,
    X,
    RotateCw,
    Layers,
    Check,
    Split,
    ArrowRight
} from "lucide-react";
import { getPdfJs } from "@/lib/services/pdf-service";
import { pdfApi } from "@/lib/services/pdf-api";
import { toast } from "@/lib/hooks/use-toast";
import { cn } from "@/lib/utils";
import { PasswordProtectedModal } from "../ui/password-protected-modal";
import JSZip from "jszip";

export function SplitPdfTool() {
    // File and PDF state
    const [file, setFile] = useState<File | null>(null);
    const [numPages, setNumPages] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);

    // Split State
    const [splitMode, setSplitMode] = useState<"visual" | "fixed">("visual");
    const [deletedPages, setDeletedPages] = useState<Set<number>>(new Set());
    const [splitPoints, setSplitPoints] = useState<Set<number>>(new Set()); // Page number after which to split
    const [pageRanges, setPageRanges] = useState<string>("");
    const [explodeMode, setExplodeMode] = useState(false);

    // Canvas refs for grid view
    const pdfCanvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
    const renderTasksRef = useRef<any[]>([]);

    const resetSettings = () => {
        setSplitMode("visual");
        setDeletedPages(new Set());
        setSplitPoints(new Set());
        setPageRanges("");
        setExplodeMode(false);
    };

    const handleFileSelected = async (newFiles: File[]) => {
        if (newFiles.length > 0) {
            const selectedFile = newFiles[0];
            setFile(selectedFile);
            setDeletedPages(new Set());
            resetSettings();
            setNumPages(0);

            // Load PDF to get page count
            try {
                const pdfjsLib = await getPdfJs();
                const arrayBuffer = await selectedFile.arrayBuffer();
                const pdf = await (pdfjsLib as any).getDocument(new Uint8Array(arrayBuffer)).promise;
                setNumPages(pdf.numPages);
                pdfCanvasRefs.current = Array(pdf.numPages).fill(null);
            } catch (error: any) {
                console.error("Error loading PDF", error);

                // Check for password-protected PDF
                if (isPasswordError(error)) {
                    setFile(null);
                    setShowPasswordModal(true);
                    return;
                }

                toast.show({
                    title: "Error",
                    message: "Failed to load PDF file. It might be corrupted.",
                    variant: "error",
                    position: "top-right"
                });
            }
        }
    };

    // Render PDF Pages (Static Background)
    useEffect(() => {
        if (!file || numPages === 0) return;

        let isCancelled = false;
        // Cancel any existing render tasks
        renderTasksRef.current.forEach(task => task.cancel && task.cancel());
        renderTasksRef.current = [];

        const renderBackgrounds = async () => {
            try {
                const pdfjsLib = await getPdfJs();
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await (pdfjsLib as any).getDocument(new Uint8Array(arrayBuffer)).promise;

                for (let i = 1; i <= pdf.numPages; i++) {
                    if (isCancelled) return;
                    const canvas = pdfCanvasRefs.current[i - 1];
                    if (!canvas) continue;

                    const page = await pdf.getPage(i);
                    // Use a reasonable scale for grid view
                    const viewport = page.getViewport({ scale: 0.5 });
                    const context = canvas.getContext("2d");
                    if (!context) continue;

                    canvas.height = viewport.height;
                    canvas.width = viewport.width;

                    const renderTask = page.render({
                        canvasContext: context,
                        viewport: viewport,
                    });
                    renderTasksRef.current.push(renderTask);

                    try {
                        await renderTask.promise;
                    } catch (error: any) {
                        if (error.name !== 'RenderingCancelledException') {
                            console.error("Render error on page " + i, error);
                        }
                    }
                }
            } catch (err) {
                console.error("Error setting up PDF render", err);
            }
        };

        renderBackgrounds();
        return () => {
            isCancelled = true;
            renderTasksRef.current.forEach(task => task.cancel && task.cancel());
            renderTasksRef.current = [];
        };
    }, [file, numPages]);

    const togglePageDeletion = (index: number) => {
        const pageNum = index + 1;
        setDeletedPages(prev => {
            const newSet = new Set(prev);
            if (newSet.has(pageNum)) {
                newSet.delete(pageNum);
            } else {
                newSet.add(pageNum);
            }
            return newSet;
        });
    };

    const toggleSplitPoint = (index: number, e: React.MouseEvent) => {
        e.stopPropagation();
        const pageNum = index + 1;

        // Cannot split after the last page
        if (pageNum === numPages) return;

        setSplitPoints(prev => {
            const newSet = new Set(prev);
            if (newSet.has(pageNum)) {
                newSet.delete(pageNum);
            } else {
                newSet.add(pageNum);
            }
            return newSet;
        });
    };

    const getRemainingPagesCount = () => {
        return numPages - deletedPages.size;
    };

    const getSegments = () => {
        const segments: number[][] = [];
        let currentSegment: number[] = [];

        for (let i = 1; i <= numPages; i++) {
            if (!deletedPages.has(i)) {
                currentSegment.push(i);
            }
            if (splitPoints.has(i) && currentSegment.length > 0) {
                segments.push(currentSegment);
                currentSegment = [];
            }
        }
        if (currentSegment.length > 0) {
            segments.push(currentSegment);
        }
        return segments;
    };

    const splitPdf = async () => {
        if (!file) return;

        if (splitMode === "fixed" && !pageRanges.trim() && !explodeMode) {
            toast.show({
                title: "No Ranges",
                message: "Please specify page ranges to split",
                variant: "error",
                position: "top-right",
            });
            return;
        }

        const remainingCount = getRemainingPagesCount();
        if (splitMode === "visual" && !explodeMode && remainingCount === 0) {
            toast.show({
                title: "No Pages",
                message: "All pages are deleted. Please keep at least one.",
                variant: "error",
                position: "top-right"
            });
            return;
        }

        setIsProcessing(true);

        try {
            if (explodeMode) {
                // Explode mode: split into separate files
                const selectedPages = Array.from({ length: numPages }, (_, i) => i + 1);
                // For explode mode, we still assume single bulk operation or backend handling, 
                // but let's optimize to use our standard segmentation pipeline if we wanted.
                // However, backend "separate" mode is likely efficient enough.
                const result = await pdfApi.split(file, {
                    selectedPages: selectedPages,
                    splitMode: "separate"
                });
                saveAs(result.blob, result.fileName || `split_pages.zip`);
            } else if (splitMode === "visual") {
                const segments = getSegments();

                if (segments.length === 0) {
                    toast.show({
                        title: "Error", message: "No valid pages to split", variant: "error",
                        position: "top-right"
                    });
                    setIsProcessing(false);
                    return;
                }

                if (segments.length === 1) {
                    const result = await pdfApi.split(file, {
                        selectedPages: segments[0],
                        splitMode: "extract"
                    });
                    saveAs(result.blob, result.fileName || `split-${file.name}`);
                } else {
                    const zip = new JSZip();
                    const folder = zip.folder(`split-${file.name.replace('.pdf', '')}`);

                    // Parallel Processing
                    const segmentPromises = segments.map(async (segment, i) => {
                        if (segment.length === 0) return null;
                        try {
                            const result = await pdfApi.split(file, {
                                selectedPages: segment,
                                splitMode: "extract"
                            });
                            return { index: i, blob: result.blob };
                        } catch (err) {
                            console.error(`Failed to split segment ${i + 1}`, err);
                            return null;
                        }
                    });

                    const results = await Promise.all(segmentPromises);

                    results.forEach((res) => {
                        if (res && res.blob) {
                            folder?.file(`part-${res.index + 1}.pdf`, res.blob);
                        }
                    });

                    const content = await zip.generateAsync({ type: "blob" });
                    saveAs(content, `split-${file.name.replace('.pdf', '')}.zip`);
                }

            } else {
                // Fixed range mode
                let selectedPages: number[] = [];
                const ranges = pageRanges.split(',').map(r => r.trim()).filter(Boolean);
                ranges.forEach(range => {
                    if (range.includes('-')) {
                        const [start, end] = range.split('-').map(Number);
                        for (let i = start; i <= end; i++) {
                            if (i >= 1 && i <= numPages) selectedPages.push(i);
                        }
                    } else {
                        const page = Number(range);
                        if (page >= 1 && page <= numPages) selectedPages.push(page);
                    }
                });

                const result = await pdfApi.split(file, {
                    selectedPages: Array.from(new Set(selectedPages)).sort((a, b) => a - b),
                    splitMode: "extract"
                });
                saveAs(result.blob, result.fileName || `split-${file.name}`);
            }

            toast.show({
                title: "Success",
                message: "PDF split successfully!",
                variant: "success",
                position: "top-right",
            });
        } catch (error: any) {
            console.error("Error splitting PDF:", error);
            toast.show({
                title: "Split Failed",
                message: error.message || "Failed to split PDF.",
                variant: "error",
                position: "top-right",
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const clearAll = () => {
        setFile(null);
        setNumPages(0);
        resetSettings();
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
        return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    };

    if (!file) {
        return (
            <>
                {/* Password Protected Modal */}
                <PasswordProtectedModal
                    isOpen={showPasswordModal}
                    onClose={() => setShowPasswordModal(false)}
                    toolName="splitting"
                />

                <div className="min-h-[calc(100vh-120px)] flex items-center justify-center">
                    <FileUploadHero
                        title="Split PDF"
                        onFilesSelected={handleFileSelected}
                        maxFiles={1}
                        accept={{ "application/pdf": [".pdf"] }}
                    />
                </div>
            </>
        );
    }

    return (
        <div className="bg-[#f6f7f8] min-h-screen pb-8">
            <div className="max-w-[1800px] mx-auto px-4 py-4">
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Left Column - Page Grid */}
                    <div className="flex-1 lg:max-w-[calc(100%-448px)]">
                        {/* Control Bar */}
                        <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-[#e2e8f0] shadow-sm p-4 mt-4 mb-6">
                            <div className="flex items-center justify-between flex-wrap gap-4">
                                <div className="flex items-center gap-2">
                                    <h2 className="text-lg font-bold text-[#111418]">{file.name}</h2>
                                    <span className="text-sm text-[#617289]">({formatFileSize(file.size)})</span>
                                </div>
                                <button
                                    onClick={clearAll}
                                    className="flex items-center gap-2 text-[#617289] hover:text-red-600 transition-colors px-3 py-2 rounded-lg hover:bg-red-50"
                                >
                                    <Trash2 className="w-5 h-5" />
                                    <span className="text-sm font-bold">Remove File</span>
                                </button>
                            </div>
                        </div>

                        {/* Grid of Pages */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {Array.from({ length: numPages }).map((_, index) => {
                                const pageNum = index + 1;
                                const isDeleted = deletedPages.has(pageNum);
                                const isSplitPoint = splitPoints.has(pageNum);

                                return (
                                    <div key={index} className="contents">
                                        <div
                                            className={cn(
                                                "bg-white rounded-xl border-2 shadow-sm overflow-visible transition-all cursor-pointer relative group",
                                                isDeleted
                                                    ? "border-red-500 opacity-70"
                                                    : "border-[#e2e8f0] hover:border-[#4383BF]"
                                            )}
                                        >
                                            <div
                                                className="relative bg-[#f1f5f9] h-[300px] flex items-center justify-center overflow-hidden rounded-lg"
                                                onClick={() => splitMode === "visual" && togglePageDeletion(index)}
                                            >
                                                <div className="relative shadow-md max-w-full max-h-full">
                                                    <canvas
                                                        ref={(el) => {
                                                            pdfCanvasRefs.current[index] = el;
                                                        }}
                                                        className="block max-w-full max-h-[280px] object-contain"
                                                    />

                                                    {isDeleted && (
                                                        <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center backdrop-blur-[1px]">
                                                            <div className="bg-red-500 text-white rounded-full p-3 shadow-lg transform scale-100 animate-in fade-in zoom-in duration-200">
                                                                <Trash2 className="w-8 h-8" />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className={cn(
                                                    "absolute top-2 left-2 backdrop-blur-sm rounded-full px-2 py-1 text-xs font-bold transition-colors",
                                                    isDeleted ? "bg-red-500 text-white" : "bg-black/60 text-white"
                                                )}>
                                                    Page {pageNum}
                                                </div>
                                            </div>

                                            {/* Responsive Hover Split Zone */}
                                            {index < numPages - 1 && splitMode === "visual" && (
                                                <div
                                                    className={cn(
                                                        "absolute z-20 flex items-center justify-center cursor-pointer group/divider",
                                                        // Mobile: Bottom Horizontal
                                                        "left-0 right-0 -bottom-[15px] h-[30px] w-full",
                                                        // Desktop: Right Vertical
                                                        "sm:top-4 sm:bottom-4 sm:-right-[15px] sm:w-[30px] sm:h-auto sm:left-auto"
                                                    )}
                                                    onClick={(e) => toggleSplitPoint(index, e)}
                                                    title="Click to split here"
                                                >
                                                    {/* The Line */}
                                                    <div className={cn(
                                                        "transition-all duration-200",
                                                        // Mobile: Horizontal Line
                                                        "w-full h-0 border-b-[2px]",
                                                        // Desktop: Vertical Line
                                                        "sm:h-full sm:w-0 sm:border-r-[2px] sm:border-b-0",

                                                        isSplitPoint
                                                            ? "border-red-500 border-dashed"
                                                            : "border-transparent group-hover/divider:border-slate-300 group-hover/divider:border-dashed"
                                                    )}></div>

                                                    {/* The Icon Bubble */}
                                                    <div className={cn(
                                                        "absolute bg-white p-1.5 rounded-full border shadow-sm transition-all duration-200 transform",
                                                        isSplitPoint
                                                            ? "border-red-200 text-red-500 scale-100"
                                                            : "border-slate-200 text-slate-400 opacity-0 scale-75 group-hover/divider:opacity-100 group-hover/divider:scale-100"
                                                    )}>
                                                        <Scissors className="w-3 h-3" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Mobile Floating Action Bar */}
                    <div className={cn(
                        "fixed bottom-6 left-4 right-4 z-40 flex gap-3 lg:hidden transition-all duration-300",
                        mobileSettingsOpen ? "translate-y-[150%] opacity-0" : "translate-y-0 opacity-100"
                    )}>
                        <button
                            onClick={() => setMobileSettingsOpen(true)}
                            className="flex-1 bg-white/90 backdrop-blur-md border border-slate-200 shadow-[0_8px_20px_rgba(0,0,0,0.1)] text-slate-700 font-bold h-14 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all"
                        >
                            <Settings className="w-5 h-5" />
                            Settings
                        </button>
                        <button
                            onClick={splitPdf}
                            disabled={isProcessing}
                            className="flex-1 bg-[#4383BF] text-white shadow-[0_8px_20px_rgba(67,131,191,0.3)] font-bold h-14 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-70 disabled:active:scale-100"
                        >
                            {isProcessing ? <RotateCw className="w-5 h-5 animate-spin" /> : <Scissors className="w-5 h-5" />}
                            Split PDF
                        </button>
                    </div>

                    {/* Right Sidebar - Configuration (Mobile Sheet / Desktop Sidebar) */}
                    <div className={cn(
                        "fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 transform lg:transform-none lg:transition-none lg:w-[424px] lg:fixed lg:right-4 lg:top-24 lg:left-auto lg:bottom-auto",
                        mobileSettingsOpen ? "translate-y-0" : "translate-y-full lg:translate-y-0"
                    )}>
                        {/* Mobile Overlay Backdrop */}
                        {mobileSettingsOpen && (
                            <div
                                className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[-1] lg:hidden"
                                onClick={() => setMobileSettingsOpen(false)}
                            />
                        )}

                        <div className="bg-white rounded-t-3xl lg:rounded-3xl border border-[#e2e8f0] shadow-[0_-8px_30px_rgba(0,0,0,0.15)] lg:shadow-xl w-full h-[85vh] lg:h-auto lg:max-h-[calc(100vh-120px)] flex flex-col relative overflow-hidden">
                            {/* Scrollable Content */}
                            <div className="flex-1 overflow-y-auto p-6">
                                {/* Mobile Drag Handle */}
                                <div className="lg:hidden w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6" />

                                {/* Mobile Close Button */}
                                <div className="lg:hidden absolute top-4 right-4">
                                    <button
                                        onClick={() => setMobileSettingsOpen(false)}
                                        className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"
                                    >
                                        <X className="w-5 h-5 text-slate-600" />
                                    </button>
                                </div>

                                {/* Header */}
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h2 className="text-[#111418] font-bold text-lg leading-7">Split Settings</h2>
                                        <p className="text-[#617289] text-xs">Configure extraction</p>
                                    </div>
                                    <button
                                        onClick={resetSettings}
                                        className="flex items-center gap-1.5 text-[#617289] text-xs font-bold hover:text-[#4383BF] transition-colors"
                                    >
                                        <RotateCw className="w-3.5 h-3.5" />
                                        Reset
                                    </button>
                                </div>

                                {/* Mode Switch */}
                                <div className="bg-[#f0f2f5] p-1 rounded-xl flex gap-1 mb-6">
                                    <button
                                        onClick={() => setSplitMode("visual")}
                                        className={cn(
                                            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all",
                                            splitMode === "visual"
                                                ? "bg-white text-[#4383BF] shadow-sm"
                                                : "text-[#64748b] hover:text-[#111418]"
                                        )}
                                    >
                                        <Layers className="w-4 h-4" />
                                        Visual
                                    </button>
                                    <button
                                        onClick={() => setSplitMode("fixed")}
                                        className={cn(
                                            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all",
                                            splitMode === "fixed"
                                                ? "bg-white text-[#4383BF] shadow-sm"
                                                : "text-[#64748b] hover:text-[#111418]"
                                        )}
                                    >
                                        <Settings className="w-4 h-4" />
                                        Fixed Range
                                    </button>
                                </div>

                                {/* Visual Mode Details */}
                                {splitMode === "visual" && (
                                    <div className="space-y-4 mb-6">
                                        <div className="bg-[#eff6ff] rounded-xl p-4 border border-[#dbeafe]">
                                            <p className="text-[#1e3a8a] text-sm font-medium leading-relaxed mb-2">
                                                <span className="font-bold">Interact with pages to:</span>
                                            </p>
                                            <ul className="list-disc list-inside text-[#1e3a8a] text-sm space-y-1">
                                                <li>Click to <strong>delete</strong></li>
                                                <li>Hover & click <Scissors className="w-3 h-3 inline" /> to <strong>split</strong></li>
                                            </ul>
                                        </div>
                                    </div>
                                )}

                                {/* Fixed Range Mode Details */}
                                {splitMode === "fixed" && (
                                    <div className="space-y-6 mb-6">
                                        <div>
                                            <label className="text-xs font-bold text-[#617289] uppercase tracking-wider mb-2 block">
                                                Page Ranges
                                            </label>
                                            <input
                                                type="text"
                                                value={pageRanges}
                                                onChange={(e) => setPageRanges(e.target.value)}
                                                className="w-full h-14 rounded-xl border border-[#e2e8f0] px-4 bg-[#f8fafc] text-[#111418] font-bold text-lg focus:border-[#4383BF] focus:ring-2 focus:ring-[#4383BF]/20 transition-all outline-none"
                                                placeholder="e.g. 1-5, 8, 11-13"
                                            />
                                            <p className="text-[#94a3b8] text-xs mt-2">
                                                Tip: Use hyphens for ranges (1-5) and commas for lists (1,3,5).
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Explode Option */}
                                <div className="border border-[#e2e8f0] rounded-xl p-4 mb-6 hover:border-[#4383BF] transition-colors cursor-pointer" onClick={() => setExplodeMode(!explodeMode)}>
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-6 h-6 rounded-md border flex items-center justify-center transition-colors",
                                            explodeMode ? "bg-[#4383BF] border-[#4383BF]" : "border-[#cbd5e1] bg-white"
                                        )}>
                                            {explodeMode && <Check className="w-4 h-4 text-white" />}
                                        </div>
                                        <div>
                                            <h3 className="text-[#111418] font-bold text-sm">Explode PDF</h3>
                                            <p className="text-[#64748b] text-xs">Save every page as a separate file</p>
                                        </div>
                                        <Split className="w-5 h-5 text-[#94a3b8] ml-auto" />
                                    </div>
                                </div>

                                {/* Summary Box */}
                                <div className="bg-[#f8fafc] rounded-2xl border border-[#e2e8f0] p-5">
                                    <h3 className="text-[#111418] font-bold text-sm mb-4">Summary</h3>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-[#64748b]">Total Pages</span>
                                            <span className="font-bold text-[#111418]">{numPages}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-[#64748b]">Output</span>
                                            <span className="font-bold text-[#4383BF]">
                                                {explodeMode
                                                    ? `${numPages} Files`
                                                    : splitPoints.size > 0
                                                        ? `${splitPoints.size + 1} Files`
                                                        : `1 PDF (${getRemainingPagesCount()} Pages)`
                                                }
                                            </span>
                                        </div>
                                    </div>
                                </div>

                            </div>

                            {/* Sticky Action Button Footer */}
                            <div className="p-6 border-t border-slate-100 bg-white z-20">
                                <button
                                    onClick={splitPdf}
                                    disabled={isProcessing}
                                    className="w-full bg-[#4383BF] hover:bg-[#3470A0] text-white rounded-xl h-16 sm:h-[72px] lg:h-[64px] flex-shrink-0 flex items-center justify-center gap-3 font-bold text-xl lg:text-lg shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-[0.99]"
                                >
                                    <span>
                                        {explodeMode
                                            ? "Explode Pages"
                                            : splitPoints.size > 0
                                                ? `Download ${splitPoints.size + 1} Files`
                                                : "Split PDF"
                                        }
                                    </span>
                                    {isProcessing ? <RotateCw className="w-6 h-6 animate-spin" /> : <ArrowRight className="w-6 h-6" />}
                                </button>
                                <p className="text-center text-[#94a3b8] text-[10px] mt-3">
                                    {explodeMode
                                        ? "Each page will be saved individually."
                                        : splitPoints.size > 0
                                            ? "Files will be zipped together."
                                            : "Selected pages will be saved as a new PDF."
                                    }
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
