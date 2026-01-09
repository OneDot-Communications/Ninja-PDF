"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import FileUploadHero from "../ui/file-upload-hero";
import { Button } from "../ui/button";
import { ArrowRight, Download, Trash2, FileText, Settings, CheckSquare, Square, ArrowUpDown, GitMerge, Plus, SortAsc, SortDesc } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { pdfApi } from "@/lib/services/pdf-api";
import { pdfStrategyManager } from "@/lib/services/pdf-service";
import { getPdfJs } from "@/lib/services/pdf-service";
import { toast } from "@/lib/hooks/use-toast";
import { isPasswordError } from "@/lib/utils";
import { PasswordProtectedModal } from "../ui/password-protected-modal";

interface MergeFile {
    id: string;
    file: File;
    range: string;
    pageCount?: number;
    previewUrl?: string;
    pagePreviews?: string[];
}

export function MergePdfTool() {
    const [files, setFiles] = useState<MergeFile[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [flatten, setFlatten] = useState(false);
    const [loadingPreviews, setLoadingPreviews] = useState(false);
    const [showArrangeMenu, setShowArrangeMenu] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);

    // Lenient header sniff: look for %PDF within first 1KB (some files have BOM/whitespace).
    const isLikelyPdf = async (file: File): Promise<boolean> => {
        try {
            const header = await file.slice(0, 1024).arrayBuffer();
            const text = new TextDecoder().decode(header);
            return text.includes("%PDF");
        } catch (err) {
            console.warn("Failed to inspect PDF header", err);
            return false;
        }
    };

    const generatePdfPreview = async (file: File): Promise<{ previewUrl: string; pagePreviews: string[] }> => {
        // Render the first few pages entirely on the client—no backend dependency.
        try {
            const pdfjsLib = await getPdfJs();
            const arrayBuffer = await file.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);

            const pdf = await (pdfjsLib as any).getDocument({
                data: uint8Array,
                cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
                cMapPacked: true,
            }).promise;

            const previews: string[] = [];
            const pagesToRender = Math.min(pdf.numPages || 1, 3);

            for (let i = 1; i <= pagesToRender; i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 1.4 });
                const canvas = document.createElement("canvas");
                const context = canvas.getContext("2d");
                if (!context) continue;

                canvas.height = viewport.height;
                canvas.width = viewport.width;
                await page.render({ canvasContext: context, viewport }).promise;
                previews.push(canvas.toDataURL('image/png'));
            }

            return { previewUrl: previews[0] || "", pagePreviews: previews };
        } catch (error) {
            console.warn("Client-side PDF preview generation failed:", error);
            return { previewUrl: "", pagePreviews: [] };
        }
    };

    const handleFilesSelected = async (newFiles: File[]) => {
        setLoadingPreviews(true);

        const prepared: MergeFile[] = [];

        for (const f of newFiles) {
            const isPdf = await isLikelyPdf(f);
            if (!isPdf) {
                // Warn but still attempt to handle; some PDFs have padded headers.
                toast.show({
                    title: "Unusual PDF",
                    message: `${f.name} looks non-standard. We'll still try to open it.`,
                    variant: "warning",
                    position: "top-right",
                });
            }

            let pageCount = 0;
            let previewUrl = "";
            let pagePreviews: string[] = [];

            try {
                // Light read to get page count quickly
                const arrayBuffer = await f.arrayBuffer();
                const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
                pageCount = pdfDoc.getPageCount();

                // Generate first-page preview(s) client-side
                const previews = await generatePdfPreview(f);
                previewUrl = previews.previewUrl;
                pagePreviews = previews.pagePreviews;
            } catch (error) {
                console.warn("PDF parsing failed for preview; skipping file", f.name, error);

                if ((error as any).message?.includes('password') || (error as any).name === 'PasswordException' || (error as any).message?.includes('No password given')) {
                    setShowPasswordModal(true);
                    // We don't continue here because we want to let the user know, but maybe skipping adding it is safer or consistent. 
                    // Actually, if we skip adding it, the user sees modal and knows.
                    continue;
                }

                toast.show({
                    title: "Preview Failed",
                    message: `${f.name} could not be read as a PDF.`,
                    variant: "error",
                    position: "top-right",
                });
                continue;
            }

            prepared.push({
                id: Math.random().toString(36).substr(2, 9),
                file: f,
                range: "all",
                pageCount,
                previewUrl,
                pagePreviews
            });
        }

        if (prepared.length === 0) {
            setLoadingPreviews(false);
            return;
        }

        setFiles((prev) => [...prev, ...prepared]);
        setLoadingPreviews(false);
    };

    const removeFile = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const updateRange = (index: number, range: string) => {
        setFiles(prev => prev.map((f, i) => i === index ? { ...f, range } : f));
    };

    const onDragEnd = (result: any) => {
        if (!result.destination) return;
        const items = Array.from(files);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);
        setFiles(items);
    };

    const sortFiles = (direction: 'asc' | 'desc') => {
        const sorted = [...files].sort((a, b) => {
            const nameA = a.file.name.toLowerCase();
            const nameB = b.file.name.toLowerCase();
            if (direction === 'asc') {
                return nameA.localeCompare(nameB);
            } else {
                return nameB.localeCompare(nameA);
            }
        });
        setFiles(sorted);
    };

    const parsePageRange = (rangeStr: string, totalPages: number): number[] => {
        if (!rangeStr || rangeStr.trim().toLowerCase() === 'all') {
            return Array.from({ length: totalPages }, (_, i) => i);
        }

        const pages = new Set<number>();
        const parts = rangeStr.split(',');

        for (const part of parts) {
            const trimmed = part.trim();
            if (trimmed.includes('-')) {
                const [start, end] = trimmed.split('-').map(Number);
                if (!isNaN(start) && !isNaN(end)) {
                    for (let i = start; i <= end; i++) {
                        if (i >= 1 && i <= totalPages) pages.add(i - 1);
                    }
                }
            } else {
                const page = Number(trimmed);
                if (!isNaN(page) && page >= 1 && page <= totalPages) {
                    pages.add(page - 1);
                }
            }
        }

        return Array.from(pages).sort((a, b) => a - b);
    };

    const mergePdfs = async () => {
        if (files.length < 2) {
            toast.show({
                title: "Add more PDFs",
                message: "Please add at least two PDF files to merge.",
                variant: "error",
                position: "top-right",
            });
            return;
        }
        setIsProcessing(true);

        try {
            // Use the current order of files for merging (maintain the visual order)
            const ranges = files.map(f => f.range);
            const fileObjects = files.map(f => f.file);

            // Use fast client-side processing only
            const result = await pdfStrategyManager.execute("merge", fileObjects, { ranges, flatten });

            const url = URL.createObjectURL(result.blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = result.fileName || "merged-document.pdf";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            // Reset to the upload state after a successful merge
            setFiles([]);
            setShowArrangeMenu(false);
            setFlatten(false);

            toast.show({
                title: "Success",
                message: "PDFs merged successfully!",
                variant: "success",
                position: "top-right",
            });
        } catch (error: any) {
            console.error("Error merging PDFs:", error);

            let errorMessage = "Failed to merge PDFs. Please try again.";
            if (error.message?.includes('corrupted') || error.message?.includes('Invalid PDF structure')) {
                errorMessage = "One or more PDF files appear to be corrupted. Try using the Repair PDF tool first.";
            } else if (isPasswordError(error)) {
                errorMessage = "One or more PDF files are encrypted. Please use the Unlock PDF tool first.";
            }

            toast.show({
                title: "Merge Failed",
                message: errorMessage,
                variant: "error",
                position: "top-right",
            });
        } finally {
            setIsProcessing(false);
        }
    };

    if (files.length === 0) {
        return (
            <>
                <div className="min-h-[calc(100vh-120px)] flex items-center justify-center">
                    <FileUploadHero
                        title="Merge PDF"
                        description="Drag & drop your PDF's here"
                        onFilesSelected={handleFilesSelected}
                        maxFiles={20}
                        accept={{ "application/pdf": [".pdf"] }}
                    />
                </div>
                <PasswordProtectedModal
                    isOpen={showPasswordModal}
                    onClose={() => setShowPasswordModal(false)}
                    toolName="merging"
                />
            </>
        );
    }

    return (
        <div className="bg-[#f6f7f8] min-h-screen relative">
            <PasswordProtectedModal
                isOpen={showPasswordModal}
                onClose={() => setShowPasswordModal(false)}
                toolName="merging"
            />
            <div className="max-w-[1800px] mx-auto px-4 py-4 md:py-8">
                <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
                    {/* Left Column - Files and Controls (Expanded) */}
                    <div className="flex-1 max-w-full lg:max-w-[1200px]">
                        {/* Header Section */}
                        <div className="mb-4 md:mb-8">
                            <h1 className="text-[#111418] text-2xl md:text-3xl lg:text-[32px] font-bold leading-8 md:leading-10 mb-2" style={{ letterSpacing: '-0.8px' }}>
                                Merge PDF
                            </h1>
                            <p className="text-[#617289] text-sm md:text-base leading-5 md:leading-6 font-normal">
                                Combine your files into one PDF document. Drag and drop to reorder, or upload more files to the list.
                            </p>
                        </div>

                        {/* Files Grid */}
                        <div className="flex-1 overflow-hidden">
                            <DragDropContext onDragEnd={onDragEnd}>
                                <Droppable droppableId="files">
                                    {(provided, snapshot) => (
                                        <div
                                            {...provided.droppableProps}
                                            ref={provided.innerRef}
                                            className={`flex flex-wrap gap-3 md:gap-4 pb-4 h-full justify-center lg:justify-start transition-all duration-300 ${snapshot.isDraggingOver ? 'bg-blue-50/50 rounded-lg p-2' : ''}`}
                                        >
                                            {files.map((item, index) => (
                                                <Draggable key={item.id} draggableId={item.id} index={index}>
                                                    {(provided, snapshot) => (
                                                        <div
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            {...provided.dragHandleProps}
                                                            className={`bg-white rounded-xl border-0 flex-shrink-0 w-[200px] h-auto shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing transition-shadow duration-200 ${
                                                                snapshot.isDragging 
                                                                    ? 'shadow-2xl !scale-105 !rotate-2 z-[1000]' 
                                                                    : ''
                                                            }`}
                                                            style={{
                                                                ...provided.draggableProps.style,
                                                                pointerEvents: snapshot.isDragging ? 'none' : 'auto'
                                                            }}
                                                        >
                                                            <div className="bg-[#f1f5f9] w-full aspect-[3/4] relative rounded-t-xl">
                                                                <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm rounded-full w-5 h-5 flex items-center justify-center">
                                                                    <span className="text-white font-bold text-xs">{index + 1}</span>
                                                                </div>
                                                                {/* PDF Preview */}
                                                                {item.previewUrl ? (
                                                                    <div className="w-full h-full relative">
                                                                        <img
                                                                            src={item.previewUrl}
                                                                            alt={`First page of ${item.file.name}`}
                                                                            className="w-full h-full object-contain rounded-t-xl"
                                                                        />
                                                                        <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm rounded px-2 py-1">
                                                                            <span className="text-white text-xs font-medium">Page 1</span>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center">
                                                                        <FileText className="h-16 w-16 text-gray-400" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="p-3">
                                                                <h3 className="text-[#111418] font-bold text-sm leading-5 mb-1 truncate" title={item.file.name}>
                                                                    {item.file.name.replace('.pdf', '')}
                                                                </h3>
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-[#617289] font-medium text-xs">
                                                                        {item.pageCount ? `${item.pageCount} pages` : `${(item.file.size / 1024 / 1024).toFixed(1)} MB`}
                                                                    </span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            removeFile(index);
                                                                        }}
                                                                        className="text-red-500 hover:text-red-700 p-1"
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </Draggable>
                                            ))}

                                            {/* Add More Files Card */}
                                            <div
                                                onClick={() => {
                                                    // Trigger file upload
                                                    const input = document.createElement('input');
                                                    input.type = 'file';
                                                    input.multiple = true;
                                                    input.accept = '.pdf';
                                                    input.onchange = (e) => {
                                                        const files = Array.from((e.target as HTMLInputElement).files || []);
                                                        handleFilesSelected(files);
                                                    };
                                                    input.click();
                                                }}
                                                className="bg-blue-50 rounded-xl border-2 border-blue-200 border-dashed flex-shrink-0 w-[200px] h-[273.08px] flex flex-col items-center justify-center cursor-pointer hover:bg-blue-100 transition-colors"
                                            >
                                                <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                                                    <Plus className="h-6 w-6 text-[#4383BF]" />
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-[#4383BF] font-bold text-sm mb-1">Add more files</div>
                                                    <div className="text-blue-600 text-xs">or drag & drop here</div>
                                                </div>
                                            </div>

                                            {provided.placeholder}
                                        </div>
                                    )}
                                </Droppable>
                            </DragDropContext>
                        </div>
                    </div>

                    {/* Mobile Action Bar: bottom Merge button */}
                    <div className="lg:hidden fixed bottom-4 left-4 right-4 z-40">
                        <Button
                            onClick={mergePdfs}
                            disabled={isProcessing || files.length < 2}
                            className="w-full h-14 bg-[#4383BF] hover:bg-[#3470A0] text-white rounded-xl flex items-center justify-center gap-2 font-bold text-sm shadow-lg disabled:opacity-50"
                        >
                            <GitMerge className="h-5 w-5" />
                            <span>{isProcessing ? 'Merging...' : 'Merge Files'}</span>
                        </Button>
                    </div>

                    {/* Mobile Actions FAB - Top Right */}
                    <div className="lg:hidden fixed top-20 right-4 z-40">
                        <div className="relative">
                            <button
                                onClick={() => setShowArrangeMenu((s) => !s)}
                                className="w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center"
                                aria-label="Actions"
                            >
                                <ArrowUpDown className="h-5 w-5 text-[#374151]" />
                            </button>

                            {showArrangeMenu && (
                                <div className="absolute top-16 right-0 bg-white shadow-lg rounded-lg p-2 flex flex-col gap-2 min-w-[120px]">
                                    <button onClick={() => { sortFiles('asc'); setShowArrangeMenu(false); }} className="px-3 py-2 rounded text-sm bg-[#f8fafc] hover:bg-[#e2e8f0] transition-colors">A-Z</button>
                                    <button onClick={() => { sortFiles('desc'); setShowArrangeMenu(false); }} className="px-3 py-2 rounded text-sm bg-[#f8fafc] hover:bg-[#e2e8f0] transition-colors">Z-A</button>
                                    <button onClick={() => { if (confirm('Clear all files?')) setFiles([]); setShowArrangeMenu(false); }} className="px-3 py-2 rounded text-sm text-red-600 bg-[#fff3f3] hover:bg-red-50 transition-colors">Clear</button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Merge Summary - Desktop only */}
                    <div className="hidden lg:block lg:w-[424px] lg:fixed lg:right-4 lg:top-24 lg:h-[calc(100vh-120px)] lg:z-10 order-2 lg:order-1">
                        <div className="bg-white rounded-2xl lg:rounded-3xl border border-[#e2e8f0] p-4 lg:p-6 h-auto lg:h-full flex flex-col shadow-xl">
                            {/* Summary Header */}
                            <div className="mb-6">
                                <h2 className="text-[#111418] font-bold text-lg">Merge Summary</h2>
                            </div>

                            {/* Files List - Scrollable */}
                            <div className="flex-1 overflow-y-auto mb-6">
                                <div className="space-y-3">
                                    {files.map((item, index) => (
                                        <div key={item.id} className="bg-[#f6f7f8] rounded-lg p-3">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-white border border-[#e2e8f0] rounded px-2 py-1">
                                                    <span className="text-[#94a3b8] font-bold text-xs">PDF</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-[#111418] font-bold text-sm truncate">
                                                        {item.file.name.replace('.pdf', '')}
                                                    </div>
                                                    <div className="text-[#617289] text-xs">
                                                        {item.pageCount ? `${item.pageCount} pages` : `${(item.file.size / 1024 / 1024).toFixed(1)} MB`}
                                                    </div>
                                                </div>
                                                <div className="text-[#111418] font-bold text-sm">
                                                    {index + 1}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Total Summary */}
                            <div className="mb-6">
                                <div className="text-[#617289] font-bold text-xs uppercase tracking-wider mb-3">
                                    Total
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[#111418] font-medium text-sm">Files</span>
                                        <span className="text-[#111418] font-medium text-sm">{files.length}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[#111418] font-medium text-sm">Pages</span>
                                        <span className="text-[#111418] font-medium text-sm">
                                            {files.reduce((total, file) => total + (file.pageCount || 0), 0)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[#111418] font-medium text-sm">Size</span>
                                        <span className="text-[#111418] font-medium text-sm">
                                            {(files.reduce((total, file) => total + file.file.size, 0) / 1024 / 1024).toFixed(1)} MB
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Options */}
                            <div className="mb-6">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="flatten"
                                        checked={flatten}
                                        onChange={(e) => setFlatten(e.target.checked)}
                                        className="rounded border-gray-300"
                                    />
                                    <label htmlFor="flatten" className="text-sm text-gray-600">
                                        Flatten Forms
                                    </label>
                                </div>
                            </div>

                            {/* Sort and Clear Buttons (desktop only) */}
                            <div className="mb-4 hidden lg:flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-[#617289] font-medium text-sm">Sort:</span>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => sortFiles('asc')}
                                            className="flex items-center gap-1 px-2 py-1.5 bg-[#f0f2f4] hover:bg-[#e2e8f0] rounded-lg transition-colors text-xs font-medium text-[#617289]"
                                            title="Sort A-Z"
                                        >
                                            <SortAsc className="h-3 w-3" />
                                            A-Z
                                        </button>
                                        <button
                                            onClick={() => sortFiles('desc')}
                                            className="flex items-center gap-1 px-2 py-1.5 bg-[#f0f2f4] hover:bg-[#e2e8f0] rounded-lg transition-colors text-xs font-medium text-[#617289]"
                                            title="Sort Z-A"
                                        >
                                            <SortDesc className="h-3 w-3" />
                                            Z-A
                                        </button>
                                    </div>
                                </div>
                                <div className="w-px h-6 bg-[#cbd5e1]"></div>
                                <button
                                    onClick={() => setFiles([])}
                                    className="flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    Clear All
                                </button>
                            </div>

                            {/* Merge Button - Fixed at bottom */}
                            <div className="mt-auto">
                                <Button
                                    onClick={mergePdfs}
                                    disabled={isProcessing || files.length < 2}
                                    className="w-full lg:w-[374px] h-[50px] lg:h-[60px] bg-[#4383BF] hover:bg-[#3470A0] text-white rounded-xl flex items-center justify-center gap-2 font-bold text-base lg:text-lg shadow-lg disabled:opacity-50"
                                >
                                    <GitMerge className="h-6 w-6" />
                                    <span>{isProcessing ? "Merging..." : "Merge Files"}</span>
                                </Button>
                                <div className="text-center mt-2">
                                    <span className="text-[#617289] text-xs opacity-60 italic">
                                        "Stitching these together like a Frankenstein monster... but prettier."
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
