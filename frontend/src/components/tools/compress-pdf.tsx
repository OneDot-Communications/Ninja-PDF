"use client";

import { useState, useRef } from "react";
import { saveAs } from "file-saver";
import JSZip from "jszip";
import FileUploadHero from "../ui/file-upload-hero";
import { FileText, Archive, X, Plus, Check, Trash2 } from "lucide-react";
import { pdfApi } from "@/lib/services/pdf-api";
import { toast } from "@/lib/hooks/use-toast";
import * as pdfjsLib from "pdfjs-dist";

// Configure PDF.js worker (only if not already set by another module)
if (typeof window !== "undefined" && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

export function CompressPdfTool() {
    const [files, setFiles] = useState<File[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [compressionLevel, setCompressionLevel] = useState<"recommended" | "extreme" | "less">("recommended");
    const [previews, setPreviews] = useState<{ [key: string]: string }>({});
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Generate preview for a PDF file (client-side using pdfjs)
    const generatePreview = async (file: File): Promise<string | null> => {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const page = await pdf.getPage(1);

            const scale = 0.5;
            const viewport = page.getViewport({ scale });

            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d");
            if (!context) return null;

            canvas.width = viewport.width;
            canvas.height = viewport.height;

            await page.render({
                canvasContext: context,
                viewport: viewport,
            }).promise;

            return canvas.toDataURL("image/png");
        } catch (error) {
            console.error("Error generating preview:", error);
            return null;
        }
    };

    const handleFileSelected = async (newFiles: File[]) => {
        const pdfFiles = newFiles.filter(f => f.type === "application/pdf");
        setFiles(prev => [...prev, ...pdfFiles]);

        // Generate previews for each file
        for (const file of pdfFiles) {
            const preview = await generatePreview(file);
            if (preview) {
                setPreviews(prev => ({
                    ...prev,
                    [file.name]: preview
                }));
            }
        }
    };



    const removeFile = (index: number) => {
        setFiles(prev => {
            const newFiles = [...prev];
            const removed = newFiles.splice(index, 1);
            // Also remove the preview for this file
            if (removed[0]) {
                setPreviews(prev => {
                    const newPreviews = { ...prev };
                    delete newPreviews[removed[0].name];
                    return newPreviews;
                });
            }
            return newFiles;
        });
    };

    const clearAll = () => {
        setFiles([]);
        setPreviews({});
    };

    const handleAddMoreFiles = () => {
        fileInputRef.current?.click();
    };

    const compressPdf = async () => {
        if (files.length === 0) return;
        setIsProcessing(true);

        try {
            if (files.length === 1) {
                const result = await pdfApi.compress(files[0], compressionLevel);
                saveAs(result.blob, result.fileName || `compressed-${files[0].name}`);
            } else {
                const zip = new JSZip();

                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    toast.show({
                        title: "Compressing",
                        message: `Processing ${i + 1} of ${files.length}: ${file.name}`,
                        variant: "default",
                        position: "top-right",
                    });

                    const result = await pdfApi.compress(file, compressionLevel);
                    const fileName = result.fileName || `compressed-${file.name}`;
                    zip.file(fileName, result.blob);
                }

                toast.show({
                    title: "Creating ZIP",
                    message: "Packaging compressed PDFs...",
                    variant: "default",
                    position: "top-right",
                });

                const zipBlob = await zip.generateAsync({ type: "blob" });
                saveAs(zipBlob, `compressed-pdfs-${Date.now()}.zip`);
            }

            toast.show({
                title: "Success",
                message: files.length === 1
                    ? "PDF compressed successfully!"
                    : `${files.length} PDFs compressed and saved as ZIP!`,
                variant: "success",
                position: "top-right",
            });

            // Clear files after compression
            setFiles([]);
            setPreviews({});
        } catch (error: any) {
            console.error("Error compressing PDF:", error);

            toast.show({
                title: "Compression Failed",
                message: error.message || "Failed to compress PDF. Please try again.",
                variant: "error",
                position: "top-right",
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
        return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    };

    const estimatedReduction = compressionLevel === "extreme" ? 85 : 60;
    const targetDPI = compressionLevel === "extreme" ? 72 : 150;

    if (files.length === 0) {
        return (
            <>
                <div className="min-h-[calc(100vh-120px)] flex items-center justify-center">
                    <FileUploadHero
                        title="Compress PDF"
                        onFilesSelected={handleFileSelected}
                        maxFiles={10}
                        accept={{ "application/pdf": [".pdf"] }}
                    />
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
            </>
        );
    }

    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    const totalPages = files.length; // Simplified - could count actual pages

    return (
        <div className="bg-[#f6f7f8] min-h-screen relative">
            <div className="max-w-[1800px] mx-auto px-4 py-4 md:py-8">
                <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
                    {/* Left Column - File Grid (Expanded with margin for sidebar) */}
                    <div className="flex-1 lg:mr-[440px]">
                        {/* File Info Bar */}
                        <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm p-4 mb-6">
                            <div className="flex items-center justify-between">
                                {/* File Name and Size */}
                                <div className="flex items-center gap-2">
                                    <span className="text-[#111418] font-medium">
                                        {files.length === 1 ? files[0].name : `${files.length} files selected`}
                                    </span>
                                    <span className="text-[#617289]">
                                        ({formatFileSize(files.reduce((sum, f) => sum + f.size, 0))})
                                    </span>
                                </div>

                                {/* Remove File Button */}
                                <button
                                    onClick={clearAll}
                                    className="flex items-center gap-2 text-[#4383BF] hover:text-[#3470A0] transition-colors px-3 py-1.5 rounded-lg hover:bg-blue-50"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    <span className="text-sm font-medium">Remove File</span>
                                </button>
                            </div>
                        </div>

                        {/* File Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {files.map((file, index) => (
                                <div
                                    key={`${file.name}-${index}`}
                                    className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden"
                                >
                                    {/* Preview Area */}
                                    <div className="relative bg-[#f1f5f9] h-[270px] flex items-center justify-center">
                                        {previews[file.name] ? (
                                            <img
                                                src={previews[file.name]}
                                                alt={`Preview of ${file.name}`}
                                                className="max-w-full max-h-full object-contain p-4"
                                            />
                                        ) : (
                                            <FileText className="h-16 w-16 text-gray-400" />
                                        )}
                                        {/* Page Number Badge */}
                                        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm rounded-full px-2 py-1 text-white text-xs font-bold">
                                            {index + 1}
                                        </div>
                                        {/* Remove Button */}
                                        <button
                                            onClick={() => removeFile(index)}
                                            className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 rounded-full p-1.5 text-white transition-colors"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>

                                    {/* File Info */}
                                    <div className="p-3">
                                        <div className="text-[#111418] text-sm font-bold leading-tight mb-1 truncate">
                                            {file.name}
                                        </div>
                                        <div className="text-[#617289] text-xs font-medium">
                                            {formatFileSize(file.size)}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Add More Files Card */}
                            <button
                                onClick={handleAddMoreFiles}
                                className="bg-[rgba(19,109,236,0.05)] border-2 border-dashed border-[rgba(19,109,236,0.40)] rounded-xl h-[273px] flex flex-col items-center justify-center gap-4 hover:bg-[rgba(19,109,236,0.10)] transition-colors"
                            >
                                <div className="bg-[rgba(19,109,236,0.10)] rounded-full w-12 h-12 flex items-center justify-center">
                                    <Plus className="h-7 w-7 text-[#4383BF]" />
                                </div>
                                <div className="text-center">
                                    <div className="text-[#4383BF] text-sm font-bold leading-5">
                                        Add more files
                                    </div>
                                    <div className="text-[rgba(19,109,236,0.70)] text-xs leading-4">
                                        or drag & drop here
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Right Sidebar - Compression Options (like merge PDF summary) */}
                    <div className="hidden lg:block lg:w-[424px] lg:fixed lg:right-4 lg:top-24 lg:h-[calc(100vh-120px)] lg:z-10 order-2 lg:order-1">
                        <div className="bg-white rounded-2xl lg:rounded-3xl border border-[#e2e8f0] p-4 lg:p-6 h-auto lg:h-full flex flex-col shadow-xl">
                            {/* Compression Header */}
                            <div className="mb-6">
                                <h2 className="text-[#111418] font-bold text-lg">Compression Level</h2>
                                <p className="text-[#64748b] text-sm">Choose the quality that fits your needs.</p>
                            </div>

                            {/* Compression Levels */}
                            <div className="flex-1 overflow-y-auto mb-6">
                                <div className="space-y-4">
                                    {/* Extreme Option */}
                                    <button
                                        onClick={() => setCompressionLevel("extreme")}
                                        className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 relative group
                                            ${compressionLevel === "extreme"
                                                ? "bg-white border-blue-600 shadow-sm"
                                                : "bg-white border-gray-100 hover:border-blue-100 shadow-sm"}`}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#FFEBEE] flex items-center justify-center text-[#EF4444]">
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M4 14h6v6" />
                                                    <path d="M20 10h-6V4" />
                                                    <path d="M14 10l7-7" />
                                                    <path d="M3 21l7-7" />
                                                </svg>
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-bold text-[#111827] text-base mb-1">Extreme</div>
                                                <div className="text-gray-500 text-sm leading-relaxed">
                                                    Maximum space saving. Lower image quality.
                                                </div>
                                            </div>
                                            {compressionLevel === "extreme" && (
                                                <div className="absolute top-4 right-4">
                                                    <div className="bg-[#22c55e] rounded-full p-1">
                                                        <Check className="w-3 h-3 text-white" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </button>

                                    {/* Recommended Option */}
                                    <button
                                        onClick={() => setCompressionLevel("recommended")}
                                        className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 relative group
                                            ${compressionLevel === "recommended"
                                                ? "bg-white border-blue-600 shadow-sm"
                                                : "bg-white border-gray-100 hover:border-blue-100 shadow-sm"}`}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#E3F2FD] flex items-center justify-center text-[#2563EB]">
                                                {/* Thumbs Up Icon */}
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="transform -scale-x-100">
                                                    <path d="M2 20h2c.55 0 1-.45 1-1v-9c0-.55-.45-1-1-1H2v11zm19.83-7.12c.11-.25.17-.52.17-.8V11c0-1.1-.9-2-2-2h-5.5l.92-4.65c.05-.22.02-.46-.08-.66-.23-.45-.52-.86-.88-1.22L14 2 7.59 8.41C7.21 8.79 7 9.3 7 9.83v7.84C7 18.95 8.05 20 9.34 20h8.11c.7 0 1.36-.37 1.72-.97l2.66-6.15z" />
                                                </svg>
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-bold text-[#2563EB] text-base mb-1">Recommended</div>
                                                <div className="text-gray-500 text-sm leading-relaxed">
                                                    Optimal balance between quality and file size.
                                                </div>
                                            </div>
                                            {compressionLevel === "recommended" && (
                                                <div className="absolute top-4 right-4">
                                                    <div className="bg-[#22c55e] rounded-full p-1">
                                                        <Check className="w-3 h-3 text-white" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </button>

                                    {/* High Quality Option */}
                                    <button
                                        onClick={() => setCompressionLevel("less")}
                                        className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 relative group
                                            ${compressionLevel === "less"
                                                ? "bg-white border-blue-600 shadow-sm"
                                                : "bg-white border-gray-100 hover:border-blue-100 shadow-sm"}`}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#EDE7F6] flex items-center justify-center text-[#7C3AED]">
                                                <div className="font-black text-xs border-2 border-current rounded px-0.5 py-px tracking-tighter">HQ</div>
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-bold text-[#111827] text-base mb-1">High Quality</div>
                                                <div className="text-gray-500 text-sm leading-relaxed">
                                                    Minimal compression. Best for retaining details.
                                                </div>
                                            </div>
                                            {compressionLevel === "less" && (
                                                <div className="absolute top-4 right-4">
                                                    <div className="bg-[#22c55e] rounded-full p-1">
                                                        <Check className="w-3 h-3 text-white" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* Compress Button */}
                            <div className="mt-auto">
                                <button
                                    onClick={compressPdf}
                                    disabled={isProcessing || files.length === 0}
                                    className="w-full h-[50px] lg:h-[60px] bg-[#4383BF] hover:bg-[#3470A0] text-white rounded-xl flex items-center justify-center gap-2 font-bold text-base lg:text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    <Archive className="h-5 w-5" />
                                    <span>
                                        {isProcessing
                                            ? "Compressing..."
                                            : files.length > 1
                                                ? `COMPRESS & ZIP (${files.length} FILES)`
                                                : "COMPRESS PDF"}
                                    </span>
                                </button>
                                <p className="text-[#94a3b8] text-xs leading-relaxed text-center mt-3 italic">
                                    "Stitching these together like a Frankenstein monster... but prettier."
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
