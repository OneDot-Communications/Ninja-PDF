"use client";

import { useState, useEffect } from "react";
import { saveAs } from "file-saver";
import JSZip from "jszip";
import FileUploadHero from "../ui/file-upload-hero";
import { Button } from "../ui/button";
import { FileText, Plus, Image as ImageIcon, Download, Loader2, SortAsc, SortDesc, Trash2, Settings } from "lucide-react";
import { toast } from "@/lib/hooks/use-toast";
import { pdfApi } from "@/lib/services/pdf-api";
import { api } from "@/lib/services/api";

interface PdfFileInfo {
    id: string;
    file: File;
    pageCount: number;
    previewUrl?: string;
    size: string;
}

type ViewMode = "file" | "page";

export function PdfToJpgTool() {
    const [files, setFiles] = useState<PdfFileInfo[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState<string>("");
    const [viewMode, setViewMode] = useState<ViewMode>("file");
    
    // Options
    const [format, setFormat] = useState<"jpeg" | "png">("jpeg");
    const [dpi, setDpi] = useState<72 | 150 | 300>(150);
    const [quality, setQuality] = useState<"low" | "medium" | "high">("medium");

    const generatePdfPreview = async (file: File): Promise<string> => {
        try {
            const result = await api.getPdfPagePreviews(file);
            if (result?.previews?.[0]?.image) {
                return result.previews[0].image;
            }
        } catch (err) {
            console.warn("Failed to generate preview:", err);
        }
        return "";
    };

    const handleFileSelected = async (newFiles: File[]) => {
        const pdfFiles = newFiles.filter(f => f.type === "application/pdf");
        
        const processedFiles = await Promise.all(
            pdfFiles.map(async (file) => {
                let pageCount = 1;
                try {
                    const result = await api.getPdfPagePreviews(file);
                    pageCount = result?.totalPages || result?.previews?.length || 1;
                } catch (err) {
                    console.warn("Could not get page count:", err);
                }

                const previewUrl = await generatePdfPreview(file);
                const sizeInMB = (file.size / 1024 / 1024).toFixed(1);
                const sizeInKB = (file.size / 1024).toFixed(0);
                const size = file.size >= 1024 * 1024 ? `${sizeInMB} MB` : `${sizeInKB} KB`;

                return {
                    id: Math.random().toString(36).substr(2, 9),
                    file,
                    pageCount,
                    previewUrl,
                    size,
                };
            })
        );

        setFiles(prev => [...prev, ...processedFiles]);
    };

    const removeFile = (id: string) => {
        setFiles(prev => prev.filter(f => f.id !== id));
    };

    const sortFiles = (direction: "asc" | "desc") => {
        const sorted = [...files].sort((a, b) => {
            const nameA = a.file.name.toLowerCase();
            const nameB = b.file.name.toLowerCase();
            return direction === "asc" ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
        });
        setFiles(sorted);
    };

    const clearAll = () => {
        if (confirm("Clear all files?")) {
            setFiles([]);
        }
    };

    const convertToImages = async () => {
        if (files.length === 0) return;
        setIsProcessing(true);
        setProgress("Initializing conversion...");

        try {
            // Import required libraries
            const { getPdfJs } = await import("@/lib/services/pdf-service");
            const pdfjsLib = await getPdfJs();
            
            console.log("[PDF-to-JPG] Starting conversion for", files.length, "file(s)");
            
            if (files.length === 1 && files[0].pageCount === 1) {
                // Single file, single page - direct download
                setProgress("Loading PDF...");
                const arrayBuffer = await files[0].file.arrayBuffer();
                console.log("[PDF-to-JPG] PDF loaded, size:", arrayBuffer.byteLength);
                
                const pdf = await (pdfjsLib as any).getDocument({
                    data: new Uint8Array(arrayBuffer),
                    verbosity: 0
                }).promise;

                setProgress("Converting to image...");
                const scale = dpi / 72;
                const page = await pdf.getPage(1);
                const viewport = page.getViewport({ scale });
                console.log("[PDF-to-JPG] Viewport size:", viewport.width, "x", viewport.height);
                
                const canvas = document.createElement("canvas");
                const context = canvas.getContext("2d");
                
                if (!context) throw new Error("Failed to get canvas context");

                canvas.height = viewport.height;
                canvas.width = viewport.width;

                await page.render({ canvasContext: context, viewport }).promise;
                console.log("[PDF-to-JPG] Page rendered to canvas");

                setProgress("Creating download...");
                const blob = await new Promise<Blob | null>((resolve) => {
                    canvas.toBlob((blob) => resolve(blob), `image/${format}`, 0.95);
                });

                if (!blob) throw new Error("Failed to create image blob");
                console.log("[PDF-to-JPG] Image blob created, size:", blob.size);

                const fileName = `${files[0].file.name.replace('.pdf', '')}.${format}`;
                
                // Cleanup
                pdf.destroy();
                canvas.remove();
                
                // Trigger download
                console.log("[PDF-to-JPG] Triggering download:", fileName);
                saveAs(blob, fileName);
                
                // Wait before showing success
                await new Promise(resolve => setTimeout(resolve, 300));
                
                toast.show({
                    title: "Success",
                    message: "PDF converted to image successfully!",
                    variant: "success",
                    position: "top-right",
                });
            } else {
                // Multiple files or multi-page PDF - create ZIP
                const { default: JSZip } = await import("jszip");
                const zip = new JSZip();
                const pdfjsLib = await getPdfJs();
                
                console.log("[PDF-to-JPG] Starting multi-page/file conversion");
                
                let totalPages = 0;
                let processedPages = 0;
                
                // Calculate total pages
                for (const fileInfo of files) {
                    totalPages += fileInfo.pageCount;
                }
                
                console.log("[PDF-to-JPG] Total pages to convert:", totalPages);
                
                for (let i = 0; i < files.length; i++) {
                    const fileInfo = files[i];
                    
                    setProgress(`Processing file ${i + 1}/${files.length}: ${fileInfo.file.name}`);
                    console.log("[PDF-to-JPG] Processing file:", fileInfo.file.name, `(${fileInfo.pageCount} pages)`);
                    
                    const arrayBuffer = await fileInfo.file.arrayBuffer();
                    const pdf = await (pdfjsLib as any).getDocument({
                        data: new Uint8Array(arrayBuffer),
                        verbosity: 0
                    }).promise;

                    const scale = dpi / 72;

                    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                        try {
                            processedPages++;
                            setProgress(`Converting page ${processedPages}/${totalPages}...`);
                            
                            const page = await pdf.getPage(pageNum);
                            const viewport = page.getViewport({ scale });
                            const canvas = document.createElement("canvas");
                            const context = canvas.getContext("2d");
                            if (!context) {
                                console.error("[PDF-to-JPG] Failed to get canvas context for page", pageNum);
                                continue;
                            }

                            canvas.height = viewport.height;
                            canvas.width = viewport.width;

                            await page.render({ canvasContext: context, viewport }).promise;

                            const blob = await new Promise<Blob | null>((resolve) => {
                                canvas.toBlob((blob) => resolve(blob), `image/${format}`, 0.95);
                            });

                            if (blob) {
                                const baseName = fileInfo.file.name.replace('.pdf', '');
                                const fileName = pdf.numPages > 1 
                                    ? `${baseName}-page-${pageNum}.${format}`
                                    : `${baseName}.${format}`;
                                zip.file(fileName, blob);
                                console.log("[PDF-to-JPG] Added to ZIP:", fileName, `(${blob.size} bytes)`);
                            }
                            
                            // Cleanup canvas to free memory
                            canvas.remove();
                            page.cleanup();
                        } catch (pageError) {
                            console.error(`[PDF-to-JPG] Error converting page ${pageNum}:`, pageError);
                        }
                    }
                    
                    // Cleanup PDF document
                    pdf.destroy();
                }

                setProgress("Creating ZIP file...");
                console.log("[PDF-to-JPG] Generating ZIP file...");
                
                const zipBlob = await zip.generateAsync({ 
                    type: "blob",
                    compression: "DEFLATE",
                    compressionOptions: { level: 6 }
                });
                
                console.log("[PDF-to-JPG] ZIP created, size:", zipBlob.size);
                setProgress("Starting download...");
                const zipFileName = `pdf-to-${format}-${Date.now()}.zip`;
                
                // Trigger download
                console.log("[PDF-to-JPG] Triggering download:", zipFileName);
                saveAs(zipBlob, zipFileName);
                
                // Wait a bit before showing success and clearing
                await new Promise(resolve => setTimeout(resolve, 300));
                
                toast.show({
                    title: "Success",
                    message: `${files.length} PDF(s) converted and saved as ZIP!`,
                    variant: "success",
                    position: "top-right",
                });
            }

            // Wait before clearing to ensure download starts
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Clear files after conversion
            setFiles([]);
            setProgress("");
        } catch (error: any) {
            console.error("Error converting PDF to images:", error);
            setProgress("");
            toast.show({
                title: "Conversion Failed",
                message: error.message || "Failed to convert PDF. Please try again.",
                variant: "error",
                position: "top-right",
            });
        } finally {
            setIsProcessing(false);
        }
    };

    if (files.length === 0) {
        return (
            <div className="min-h-[calc(100vh-120px)] flex items-center justify-center">
                <FileUploadHero
                    title="PDF to JPG"
                    onFilesSelected={handleFileSelected}
                    maxFiles={50}
                    accept={{ "application/pdf": [".pdf"] }}
                />
            </div>
        );
    }

    return (
        <div className="bg-[#f6f7f8] min-h-screen relative">
            <div className="max-w-[1800px] mx-auto px-4 py-4 md:py-8">
                <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
                    {/* Left Column - Files Grid */}
                    <div className="flex-1 max-w-full lg:max-w-[1200px]">
                        {/* Control Bar */}
                        <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-[#e2e8f0] shadow-sm mb-4 p-4">
                            <div className="flex items-center justify-between flex-wrap gap-4">
                                {/* View Toggle */}
                                <div className="bg-[#f0f2f4] rounded-lg p-1 flex">
                                    <button
                                        onClick={() => setViewMode("file")}
                                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${
                                            viewMode === "file"
                                                ? "bg-white text-[#4383BF] shadow-sm"
                                                : "text-[#617289]"
                                        }`}
                                    >
                                        File View
                                    </button>
                                    <button
                                        onClick={() => setViewMode("page")}
                                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${
                                            viewMode === "page"
                                                ? "bg-white text-[#4383BF] shadow-sm"
                                                : "text-[#617289]"
                                        }`}
                                    >
                                        Page View
                                    </button>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2">
                                    {/* Sort Buttons */}
                                    <div className="bg-[#f0f2f4] rounded-lg flex p-1">
                                        <button
                                            onClick={() => sortFiles("asc")}
                                            className="rounded-md w-9 h-10 flex items-center justify-center hover:bg-white/50 transition-colors"
                                            title="Sort A-Z"
                                        >
                                            <SortAsc className="h-5 w-5 text-[#617289]" />
                                        </button>
                                        <button
                                            onClick={() => sortFiles("desc")}
                                            className="rounded-md w-9 h-10 flex items-center justify-center hover:bg-white/50 transition-colors"
                                            title="Sort Z-A"
                                        >
                                            <SortDesc className="h-5 w-5 text-[#617289]" />
                                        </button>
                                    </div>

                                    <div className="bg-[#cbd5e1] w-px h-6"></div>

                                    {/* Clear All */}
                                    <button
                                        onClick={clearAll}
                                        className="rounded-lg flex items-center gap-2 px-3 py-2 hover:bg-[#f0f2f4] transition-colors"
                                    >
                                        <Trash2 className="h-5 w-5 text-[#617289]" />
                                        <span className="text-[#617289] font-bold text-sm">Clear All</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Files Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-4">
                            {files.map((fileInfo, index) => (
                                <div
                                    key={fileInfo.id}
                                    className="bg-white rounded-xl border-0 shadow-sm hover:shadow-md transition-shadow w-full max-w-[204.8px] mx-auto"
                                >
                                    {/* Preview Area */}
                                    <div className="bg-[#f1f5f9] w-full aspect-[3/4] relative rounded-t-xl overflow-hidden">
                                        {/* Badge */}
                                        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm rounded-full w-5 h-5 flex items-center justify-center z-10">
                                            <span className="text-white font-bold text-xs leading-4">{index + 1}</span>
                                        </div>

                                        {/* Preview Image or Placeholder */}
                                        {fileInfo.previewUrl ? (
                                            <img
                                                src={fileInfo.previewUrl}
                                                alt={`Preview of ${fileInfo.file.name}`}
                                                className="w-full h-full object-contain"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <FileText className="h-16 w-16 text-gray-400" />
                                            </div>
                                        )}
                                    </div>

                                    {/* File Info */}
                                    <div className="p-3">
                                        <h3 className="text-[#111418] font-bold text-sm leading-[17.5px] mb-1 truncate" title={fileInfo.file.name}>
                                            {fileInfo.file.name.replace('.pdf', '')}
                                        </h3>
                                        <p className="text-[#617289] font-medium text-xs leading-4">
                                            {fileInfo.pageCount} {fileInfo.pageCount === 1 ? 'Page' : 'Pages'} • {fileInfo.size}
                                        </p>
                                    </div>
                                </div>
                            ))}

                            {/* Add More Files Card */}
                            <div
                                onClick={() => {
                                    const input = document.createElement("input");
                                    input.type = "file";
                                    input.multiple = true;
                                    input.accept = ".pdf";
                                    input.onchange = (e) => {
                                        const files = Array.from((e.target as HTMLInputElement).files || []);
                                        handleFileSelected(files);
                                    };
                                    input.click();
                                }}
                                className="bg-[rgba(19,109,236,0.05)] rounded-xl border-2 border-dashed border-[rgba(19,109,236,0.40)] w-full max-w-[204.8px] mx-auto aspect-[204.8/273.08] flex flex-col items-center justify-center cursor-pointer hover:bg-[rgba(19,109,236,0.10)] transition-colors"
                            >
                                <div className="bg-[rgba(19,109,236,0.10)] rounded-full w-12 h-12 flex items-center justify-center mb-4">
                                    <Plus className="h-7 w-7 text-[#4383BF]" />
                                </div>
                                <div className="text-center px-4">
                                    <div className="text-[#4383BF] font-bold text-sm mb-1">Add more files</div>
                                    <div className="text-[rgba(19,109,236,0.70)] text-xs">or drag & drop here</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Sidebar - Conversion Settings */}
                    <div className="hidden lg:block lg:w-[424px] lg:fixed lg:right-4 lg:top-24 lg:h-[calc(100vh-120px)] lg:z-10">
                        <div className="bg-white rounded-3xl border border-[#e2e8f0] p-6 h-full flex flex-col shadow-xl">
                            {/* Header */}
                            <div className="mb-6">
                                <h2 className="text-[#111418] font-bold text-lg flex items-center gap-2">
                                    <Settings className="h-5 w-5" />
                                    Conversion Settings
                                </h2>
                            </div>

                            {/* Settings */}
                            <div className="flex-1 space-y-6 overflow-y-auto">
                                {/* Format */}
                                <div>
                                    <label className="text-[#617289] font-bold text-xs uppercase tracking-wider mb-3 block">
                                        Output Format
                                    </label>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setFormat("jpeg")}
                                            className={`flex-1 px-4 py-3 rounded-lg font-bold text-sm transition-all ${
                                                format === "jpeg"
                                                    ? "bg-[#4383BF] text-white shadow-md"
                                                    : "bg-[#f0f2f4] text-[#617289] hover:bg-[#e2e8f0]"
                                            }`}
                                        >
                                            JPEG
                                        </button>
                                        <button
                                            onClick={() => setFormat("png")}
                                            className={`flex-1 px-4 py-3 rounded-lg font-bold text-sm transition-all ${
                                                format === "png"
                                                    ? "bg-[#4383BF] text-white shadow-md"
                                                    : "bg-[#f0f2f4] text-[#617289] hover:bg-[#e2e8f0]"
                                            }`}
                                        >
                                            PNG
                                        </button>
                                    </div>
                                </div>

                                {/* Quality */}
                                <div>
                                    <label className="text-[#617289] font-bold text-xs uppercase tracking-wider mb-3 block">
                                        Image Quality
                                    </label>
                                    <div className="flex gap-2">
                                        {[
                                            { value: "low", label: "Low", dpi: 72 },
                                            { value: "medium", label: "Medium", dpi: 150 },
                                            { value: "high", label: "High", dpi: 300 },
                                        ].map((opt) => (
                                            <button
                                                key={opt.value}
                                                onClick={() => {
                                                    setQuality(opt.value as any);
                                                    setDpi(opt.dpi as any);
                                                }}
                                                className={`flex-1 px-3 py-3 rounded-lg font-bold text-sm transition-all ${
                                                    quality === opt.value
                                                        ? "bg-[#136dec] text-white shadow-md"
                                                        : "bg-[#f0f2f4] text-[#617289] hover:bg-[#e2e8f0]"
                                                }`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-[#94a3b8] text-xs mt-2">
                                        {quality === "low" && "72 DPI - Best for screen viewing"}
                                        {quality === "medium" && "150 DPI - Balanced quality and size"}
                                        {quality === "high" && "300 DPI - Best for printing"}
                                    </p>
                                </div>

                                {/* Summary */}
                                <div className="bg-[#f6f7f8] rounded-xl p-4">
                                    <div className="text-[#617289] font-bold text-xs uppercase tracking-wider mb-3">
                                        Summary
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[#617289] text-sm">Files</span>
                                            <span className="text-[#111418] font-bold text-sm">{files.length}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[#617289] text-sm">Total Pages</span>
                                            <span className="text-[#111418] font-bold text-sm">
                                                {files.reduce((sum, f) => sum + f.pageCount, 0)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[#617289] text-sm">Output</span>
                                            <span className="text-[#111418] font-bold text-sm uppercase">{format}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Convert Button */}
                            <div className="mt-6">
                                <Button
                                    onClick={convertToImages}
                                    disabled={isProcessing || files.length === 0}
                                    className="w-full h-[60px] bg-[#136dec] hover:bg-blue-700 text-white rounded-xl flex items-center justify-center gap-2 font-bold text-lg shadow-lg disabled:opacity-50"
                                >
                                    {isProcessing ? (
                                        <>
                                            <Loader2 className="h-6 w-6 animate-spin" />
                                            <span className="flex flex-col items-center">
                                                <span className="font-bold">Converting...</span>
                                                {progress && <span className="text-xs font-normal mt-1 opacity-80">{progress}</span>}
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <ImageIcon className="h-6 w-6" />
                                            <span>Convert to {format.toUpperCase()}</span>
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Mobile Convert Button */}
                    <div className="lg:hidden fixed bottom-4 left-4 right-4 z-40">
                        <Button
                            onClick={convertToImages}
                            disabled={isProcessing || files.length === 0}
                            className="w-full h-14 bg-[#136dec] hover:bg-blue-700 text-white rounded-xl flex items-center justify-center gap-2 font-bold text-sm shadow-lg disabled:opacity-50"
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    <span className="flex flex-col items-start">
                                        <span className="font-bold">Converting...</span>
                                        {progress && <span className="text-xs font-normal opacity-80">{progress}</span>}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <ImageIcon className="h-5 w-5" />
                                    <span>Convert to {format.toUpperCase()}</span>
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
