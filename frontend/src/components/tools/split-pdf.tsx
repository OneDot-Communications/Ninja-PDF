"use client";

import { useState } from "react";
import { saveAs } from "file-saver";
import FileUploadHero from "../ui/file-upload-hero";
import { Button } from "../ui/button";
import { ArrowRight, Minus, Plus, Maximize2, Layers, Scissors, X, Edit, Trash2 } from "lucide-react";
import { cn, isPasswordError } from "@/lib/utils";
import { pdfApi } from "@/lib/services/pdf-api";
import { api } from "@/lib/services/api";
import { toast } from "@/lib/hooks/use-toast";
import { PasswordProtectedModal } from "../ui/password-protected-modal";


interface PagePreview {
    pageNumber: number;
    image: string;
    width: number;
    height: number;
}

export function SplitPdfTool() {
    const [file, setFile] = useState<File | null>(null);
    const [originalFile, setOriginalFile] = useState<File | null>(null);
    const [pagePreviews, setPagePreviews] = useState<PagePreview[]>([]);
    const [numPages, setNumPages] = useState<number>(0);
    const [zoom, setZoom] = useState<number>(100);
    const [isProcessing, setIsProcessing] = useState(false);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [deletedPages, setDeletedPages] = useState<Set<number>>(new Set());
    const [splitMode, setSplitMode] = useState<"visual" | "fixed">("visual");
    const [pageRanges, setPageRanges] = useState<string>("");
    const [explodeMode, setExplodeMode] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);

    const handleFileSelected = async (files: File[]) => {
        if (files.length > 0) {
            const selectedFile = files[0];
            setFile(selectedFile);
            setOriginalFile(selectedFile);
            setNumPages(0);
            setPagePreviews([]);
            setDeletedPages(new Set());
            await loadPdfPreview(selectedFile);
        }
    };

    const loadPdfPreview = async (file: File) => {
        setLoadingPreview(true);
        try {
            // Get all pages for split functionality
            const result = await pdfApi.getPagePreviews(file);

            // Load all pages immediately
            setPagePreviews(result.previews);
            setNumPages(result.totalPages);

        } catch (error: any) {
            console.error("Error loading PDF preview", error);

            if (isPasswordError(error)) {
                setShowPasswordModal(true);
                return;
            }

            toast.show({
                title: "Preview Error",
                message: "Failed to load PDF preview",
                variant: "error",
                position: "top-right",
            });
        } finally {
            setLoadingPreview(false);
        }
    };


    const handleZoomIn = () => setZoom(prev => Math.min(prev + 10, 200));
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 10, 50));
    const handleFitScreen = () => setZoom(100);

    const handleDeletePage = async (pageNumber: number) => {
        const newDeletedPages = new Set([...deletedPages, pageNumber]);
        setDeletedPages(newDeletedPages);

        // Check remaining pages using the new set
        const remainingPages = pagePreviews
            .filter(p => !newDeletedPages.has(p.pageNumber))
            .map(p => p.pageNumber);

        if (remainingPages.length === 0) {
            toast.show({
                title: "Cannot Delete",
                message: "Cannot delete all pages. At least one page must remain.",
                variant: "error",
                position: "top-right",
            });
            setDeletedPages(prev => {
                const newSet = new Set(prev);
                newSet.delete(pageNumber);
                return newSet;
            });
            return;
        }

        toast.show({
            title: "Page Deleted",
            message: `Page ${pageNumber} marked for deletion. Download to get updated PDF.`,
            variant: "success",
            position: "top-right",
        });
    };

    const downloadMergedPdf = async () => {
        if (!originalFile) return;

        const remainingPages = Array.from({ length: numPages }, (_, i) => i + 1)
            .filter(pageNum => !deletedPages.has(pageNum));

        if (remainingPages.length === 0) {
            toast.show({
                title: "No Pages",
                message: "No pages remaining to download.",
                variant: "error",
                position: "top-right",
            });
            return;
        }

        setIsProcessing(true);

        try {
            const result = await pdfApi.split(originalFile, {
                selectedPages: remainingPages,
                splitMode: "extract"
            });

            saveAs(result.blob, result.fileName || `merged-${originalFile.name}`);

            toast.show({
                title: "Success",
                message: `PDF with ${remainingPages.length} page${remainingPages.length > 1 ? 's' : ''} downloaded!`,
                variant: "success",
                position: "top-right",
            });
        } catch (error: any) {
            console.error("Error merging PDF:", error);

            toast.show({
                title: "Merge Failed",
                message: "Failed to merge PDF. Please try again.",
                variant: "error",
                position: "top-right",
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const getRemainingPages = () => {
        return numPages - deletedPages.size;
    };

    const calculateOutputFiles = () => {
        if (explodeMode) return numPages;
        if (splitMode === "visual") {
            const remainingPages = getRemainingPages();
            return remainingPages > 0 ? 1 : 0;
        }
        if (pageRanges.trim()) {
            const ranges = pageRanges.split(',').filter(r => r.trim());
            return ranges.length;
        }
        return 0;
    };

    const getSelectionText = () => {
        if (explodeMode) return "All pages";
        if (splitMode === "visual") {
            const remaining = getRemainingPages();
            if (remaining === numPages) return "All pages";
            if (remaining === 0) return "None";
            return `Pages 1-${remaining}`;
        }
        if (pageRanges.trim()) return pageRanges.trim();
        return "None";
    };

    const splitPdf = async () => {
        if (!originalFile) return;

        if (splitMode === "fixed" && !pageRanges.trim() && !explodeMode) {
            toast.show({
                title: "No Ranges",
                message: "Please specify page ranges to split",
                variant: "error",
                position: "top-right",
            });
            return;
        }

        setIsProcessing(true);

        try {
            let selectedPages: number[] = [];

            if (explodeMode) {
                // Explode mode: split into separate files
                selectedPages = Array.from({ length: numPages }, (_, i) => i + 1);
                const result = await pdfApi.split(originalFile, {
                    selectedPages: selectedPages,
                    splitMode: "separate"
                });
                // For explode mode, backend returns a ZIP file
                saveAs(result.blob, result.fileName || `split_pages.zip`);
            } else if (splitMode === "visual") {
                // Visual mode: use deleted pages logic (keep remaining pages)
                selectedPages = Array.from({ length: numPages }, (_, i) => i + 1)
                    .filter(pageNum => !deletedPages.has(pageNum));

                if (selectedPages.length === 0 || selectedPages.length === numPages) {
                    toast.show({
                        title: "No Split",
                        message: "Please delete some pages to create a split",
                        variant: "error",
                        position: "top-right",
                    });
                    setIsProcessing(false);
                    return;
                }

                const result = await pdfApi.split(originalFile, {
                    selectedPages: selectedPages,
                    splitMode: "extract"
                });
                saveAs(result.blob, result.fileName || `split-${originalFile.name}`);
            } else {
                // Fixed range mode
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

                const result = await pdfApi.split(originalFile, {
                    selectedPages: Array.from(new Set(selectedPages)).sort((a, b) => a - b),
                    splitMode: "extract"
                });
                saveAs(result.blob, result.fileName || `split-${originalFile.name}`);
            }

            toast.show({
                title: "Success",
                message: `PDF split successfully!`,
                variant: "success",
                position: "top-right",
            });
        } catch (error: any) {
            console.error("Error splitting PDF:", error);

            toast.show({
                title: "Split Failed",
                message: "Failed to split PDF. Please try again.",
                variant: "error",
                position: "top-right",
            });
        } finally {
            setIsProcessing(false);
        }
    };


    if (!file) {
        return (
            <>
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
        <div className="bg-[#f6f7f8] min-h-screen relative pb-24 lg:pb-8">
            <PasswordProtectedModal
                isOpen={showPasswordModal}
                onClose={() => setShowPasswordModal(false)}
                toolName="splitting"
            />
            <div className="max-w-[1800px] mx-auto px-4 py-4 md:py-8">
                <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
                    {/* Left Column - PDF Preview */}
                    <div className="flex-1 max-w-full lg:max-w-[calc(100%-448px)] lg:mr-[448px]">
                        {/* Header Section */}
                        <div className="mb-4 md:mb-6">
                            <h1 className="text-[#111418] text-2xl md:text-3xl lg:text-[32px] font-bold leading-8 md:leading-10 mb-2" style={{ letterSpacing: '-0.8px' }}>
                                Split PDF
                            </h1>
                            <p className="text-[#617289] text-sm md:text-base leading-5 md:leading-6 font-normal">
                                {file.name} • {numPages} pages • {getRemainingPages()} remaining
                            </p>
                        </div>

                        {/* Zoom Controls */}
                        <div className="mb-4 flex justify-center">
                            <div className="bg-white rounded-full border border-[#e2e8f0] shadow-sm h-14 px-4 flex items-center gap-3">
                                <button
                                    onClick={handleZoomOut}
                                    className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors"
                                    aria-label="Zoom Out"
                                >
                                    <Minus className="h-5 w-5 text-[#475569]" />
                                </button>
                                <span className="text-[#334155] font-bold text-xs min-w-[60px] text-center">
                                    {zoom}%
                                </span>
                                <button
                                    onClick={handleZoomIn}
                                    className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors"
                                    aria-label="Zoom In"
                                >
                                    <Plus className="h-5 w-5 text-[#475569]" />
                                </button>
                                <div className="w-px h-4 bg-[#cbd5e1]"></div>
                                <button
                                    onClick={handleFitScreen}
                                    className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors"
                                    aria-label="Fit Screen"
                                >
                                    <Maximize2 className="h-5 w-5 text-[#475569]" />
                                </button>
                            </div>
                        </div>

                        {/* PDF Pages Preview Area */}
                        <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm p-4 min-h-[400px] max-h-[calc(100vh-280px)] overflow-y-auto">
                            {loadingPreview ? (
                                <div className="flex flex-col items-center gap-4 p-8">
                                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-[#617289] font-medium">Loading PDF pages...</p>
                                </div>
                            ) : pagePreviews.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center', transition: 'transform 0.2s ease' }}>
                                    {pagePreviews.map((page) => (
                                        <div
                                            key={page.pageNumber}
                                            className={cn(
                                                "relative group rounded-lg border-2 transition-all",
                                                deletedPages.has(page.pageNumber)
                                                    ? "border-red-300 bg-red-50 opacity-50"
                                                    : "border-[#e2e8f0] bg-white hover:border-blue-300"
                                            )}
                                        >
                                            <div className="p-2">
                                                {/* Page Number Badge */}
                                                <div className="absolute top-2 left-2 z-10">
                                                    <div className="bg-white rounded-full border border-[#e2e8f0] shadow-sm px-2 py-1">
                                                        <span className="text-[#334155] font-bold text-xs">
                                                            {page.pageNumber}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Delete Button */}
                                                {!deletedPages.has(page.pageNumber) && (
                                                    <button
                                                        onClick={() => handleDeletePage(page.pageNumber)}
                                                        className="absolute top-2 right-2 z-10 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow-lg transition-all opacity-0 group-hover:opacity-100"
                                                        aria-label="Delete Page"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}

                                                {/* Deleted Badge */}
                                                {deletedPages.has(page.pageNumber) && (
                                                    <div className="absolute top-2 right-2 z-10">
                                                        <div className="bg-red-500 rounded-full border border-red-600 shadow-sm px-2 py-1">
                                                            <span className="text-white font-bold text-xs">
                                                                Deleted
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Page Image */}
                                                <img
                                                    src={page.image}
                                                    alt={`Page ${page.pageNumber}`}
                                                    className="w-full h-auto rounded-lg shadow-sm"
                                                    style={{ maxHeight: '200px', objectFit: 'contain' }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center p-8">
                                    <p className="text-[#617289] font-medium">No preview available</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Mobile Action Bar */}
                    <div className="lg:hidden fixed bottom-4 left-4 right-4 z-40">
                        <Button
                            onClick={splitPdf}
                            disabled={isProcessing}
                            className="w-full h-14 bg-[#4383BF] hover:bg-[#3470A0] text-white rounded-xl flex items-center justify-center gap-2 font-bold text-sm shadow-lg disabled:opacity-50"
                        >
                            <span>{isProcessing ? 'Splitting...' : 'Split PDF'}</span>
                            <ArrowRight className="h-5 w-5" />
                        </Button>
                    </div>

                    {/* Right Sidebar - Settings (Desktop only) */}
                    <div className="hidden lg:block lg:w-[424px] lg:fixed lg:right-4 lg:top-24 lg:h-[calc(100vh-120px)] lg:z-10">
                        <div className="bg-white rounded-3xl border border-[#e2e8f0] p-6 h-full flex flex-col shadow-xl">
                            {/* Header */}
                            <div className="mb-6">
                                <h2 className="text-[#0f172a] font-bold text-xl leading-7">Slice & Dice Settings</h2>
                                <p className="text-[#64748b] text-sm leading-5 mt-1">Configure how you want your document split.</p>
                            </div>

                            {/* Mode Toggle */}
                            <div className="mb-6">
                                <div className="bg-[#f1f5f9] rounded-xl p-1 flex gap-1">
                                    <button
                                        onClick={() => setSplitMode("visual")}
                                        className={cn(
                                            "flex-1 rounded-lg px-4 py-2.5 font-bold text-sm transition-all",
                                            splitMode === "visual"
                                                ? "bg-white text-[#136dec] shadow-sm"
                                                : "text-[#64748b] hover:text-[#0f172a]"
                                        )}
                                    >
                                        Visual Split
                                    </button>
                                    <button
                                        onClick={() => setSplitMode("fixed")}
                                        className={cn(
                                            "flex-1 rounded-lg px-4 py-2.5 font-bold text-sm transition-all",
                                            splitMode === "fixed"
                                                ? "bg-white text-[#136dec] shadow-sm"
                                                : "text-[#64748b] hover:text-[#0f172a]"
                                        )}
                                    >
                                        Fixed Range
                                    </button>
                                </div>
                            </div>

                            {/* Page Ranges - Only show in Fixed Range mode */}
                            {splitMode === "fixed" && (
                                <div className="mb-6">
                                    <h3 className="text-[#0f172a] font-bold text-base mb-3">Page Ranges</h3>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={pageRanges}
                                            onChange={(e) => setPageRanges(e.target.value)}
                                            placeholder="e.g., 1-5, 8, 11-15"
                                            className="bg-white rounded-xl border border-[#cbd5e1] w-full h-12 px-4 pr-10 text-sm text-[#0f172a] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#4383BF] focus:border-transparent transition-all"
                                        />
                                        <Edit className="absolute right-3 top-3 h-6 w-6 text-[#94a3b8] pointer-events-none" />
                                    </div>
                                    <p className="mt-2 text-xs text-[#64748b] leading-relaxed">
                                        Use commas to separate ranges. E.g., <span className="text-[#0f172a] font-medium">1-5, 8, 11-15</span>. We'll do the math.
                                    </p>
                                </div>
                            )}

                            {/* Explode PDF Option */}
                            <div className="mb-6">
                                <div className="bg-[#eff6ff] rounded-2xl border border-[#dbeafe] p-4">
                                    <div className="flex items-start gap-3">
                                        <input
                                            type="checkbox"
                                            id="explode"
                                            checked={explodeMode}
                                            onChange={(e) => setExplodeMode(e.target.checked)}
                                            className="mt-0.5 w-5 h-5 rounded border-[#cbd5e1] text-[#4383BF] focus:ring-2 focus:ring-[#4383BF] cursor-pointer"
                                        />
                                        <div className="flex-1">
                                            <label htmlFor="explode" className="text-[#0f172a] font-bold text-sm block cursor-pointer mb-1">
                                                Explode PDF
                                            </label>
                                            <p className="text-[#64748b] text-xs leading-relaxed">
                                                Extract every single page into a separate file. Warning: lots of files incoming!
                                            </p>
                                        </div>
                                        <Layers className="h-8 w-8 text-[#60a5fa] flex-shrink-0" />
                                    </div>
                                </div>
                            </div>

                            {/* File Summary */}
                            <div className="flex-1 mb-6">
                                <div className="bg-[#f8fafc] rounded-2xl border border-[#e2e8f0] p-5">
                                    <div className="flex items-center gap-2 mb-4">
                                        <svg className="w-5 h-5 text-[#94a3b8]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <h3 className="text-[#0f172a] font-bold text-base">File Summary</h3>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[#475569] text-sm">Total Pages:</span>
                                            <span className="text-[#0f172a] font-bold text-base">{numPages}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[#475569] text-sm">Output Files:</span>
                                            <span className="text-[#4383BF] font-bold text-base">
                                                {calculateOutputFiles()} PDF{calculateOutputFiles() !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[#475569] text-sm">Selection:</span>
                                            <div className="text-[#0f172a] font-medium text-sm">
                                                {getSelectionText()}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Split Button - Fixed at bottom */}
                            <div className="mt-auto">
                                <Button
                                    onClick={splitPdf}
                                    disabled={isProcessing}
                                    className="w-full h-14 bg-[#4383BF] hover:bg-[#3470A0] text-white rounded-xl flex items-center justify-center gap-2 font-bold text-base shadow-lg disabled:opacity-50 transition-all"
                                >
                                    <span>{isProcessing ? "Splitting PDF..." : "Split PDF"}</span>
                                    <ArrowRight className="h-5 w-5" />
                                </Button>
                                <div className="text-center mt-3">
                                    <div className="flex items-center justify-center gap-2">
                                        <svg className="w-4 h-4 text-[#94a3b8] animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span className="text-[#617289] text-xs italic">
                                            Translating pixels into paragraphs...
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
