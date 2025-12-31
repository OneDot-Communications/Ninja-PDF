"use client";

import { useState, useRef, useCallback } from "react";
import { saveAs } from "file-saver";
import JSZip from "jszip";
import FileUploadHero from "../ui/file-upload-hero";
import { FileText, Archive, FolderOpen, Settings, X, Plus } from "lucide-react";
import { pdfApi } from "@/lib/services/pdf-api";
import { toast } from "@/lib/hooks/use-toast";
import { api } from "@/lib/services/api";
import * as pdfjsLib from "pdfjs-dist";

interface PagePreview {
    pageNumber: number;
    image: string;
    width: number;
    height: number;
}

export function CompressPdfTool() {
    const [files, setFiles] = useState<File[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [compressionLevel, setCompressionLevel] = useState<"recommended" | "extreme">("recommended");
    const [targetSize, setTargetSize] = useState<number>(60); // 0-100 slider value
    const [viewMode, setViewMode] = useState<"file" | "page">("file");
    const [previews, setPreviews] = useState<{ [key: string]: string }>({});
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelected = async (newFiles: File[]) => {
        const pdfFiles = newFiles.filter(f => f.type === "application/pdf");
        setFiles(prev => [...prev, ...pdfFiles]);
        
        // Generate previews for new files
        for (const file of pdfFiles) {
            await generatePreview(file);
        }
    };

    const generatePreview = async (file: File) => {
        try {
            const result = await api.getPdfPagePreviews(file);
            if (result?.previews?.[0]) {
                setPreviews(prev => ({
                    ...prev,
                    [file.name]: result.previews[0].image
                }));
            }
        } catch (error) {
            console.error("Failed to generate preview:", error);
        }
    };

    const removeFile = (index: number) => {
        setFiles(prev => {
            const newFiles = [...prev];
            const removed = newFiles.splice(index, 1);
            // Remove preview
            setPreviews(prev => {
                const newPreviews = { ...prev };
                delete newPreviews[removed[0].name];
                return newPreviews;
            });
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
                // Single file - direct download
                const result = await pdfApi.compress(files[0], compressionLevel);
                saveAs(result.blob, result.fileName || `compressed-${files[0].name}`);
            } else {
                // Multiple files - create ZIP
                const zip = new JSZip();
                
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    toast.show({
                        title: "Compressing",
                        message: `Compressing ${i + 1} of ${files.length}: ${file.name}`,
                        variant: "default",
                        position: "top-right",
                    });
                    
                    const result = await pdfApi.compress(file, compressionLevel);
                    const fileName = result.fileName || `compressed-${file.name}`;
                    zip.file(fileName, result.blob);
                }

                // Generate and download ZIP
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
        );
    }

    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    const totalPages = files.length; // Simplified - could count actual pages

    return (
        <div className="bg-[#f6f7f8] min-h-screen pb-8">
            <div className="max-w-[1800px] mx-auto px-4 py-4">
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Left Column - File Grid */}
                    <div className="flex-1 lg:max-w-[calc(100%-448px)]">
                        {/* View Mode Toggle + Controls */}
                        <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-[#e2e8f0] shadow-sm p-4 mb-6">
                            <div className="flex items-center justify-between flex-wrap gap-4">
                                {/* View Toggle */}
                                <div className="bg-[#f0f2f4] rounded-lg p-1 flex">
                                    <button
                                        onClick={() => setViewMode("file")}
                                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${
                                            viewMode === "file"
                                                ? "bg-white text-[#136dec] shadow"
                                                : "text-[#617289]"
                                        }`}
                                    >
                                        File View
                                    </button>
                                    <button
                                        onClick={() => setViewMode("page")}
                                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${
                                            viewMode === "page"
                                                ? "bg-white text-[#136dec] shadow"
                                                : "text-[#617289]"
                                        }`}
                                    >
                                        Page View
                                    </button>
                                </div>

                                {/* Clear All Button */}
                                <button
                                    onClick={clearAll}
                                    className="flex items-center gap-2 text-[#617289] hover:text-red-600 transition-colors px-3 py-2 rounded-lg hover:bg-red-50"
                                >
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M15 16h4v2h-4zm0-8h7v2h-7zm0 4h6v2h-6zM3 18c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2V8H3v10zM14 5h-3l-1-1H6L5 5H2v2h12z"/>
                                    </svg>
                                    <span className="text-sm font-bold">Clear All</span>
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
                                                alt={`Preview ${index + 1}`}
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
                                    <Plus className="h-7 w-7 text-[#136dec]" />
                                </div>
                                <div className="text-center">
                                    <div className="text-[#136dec] text-sm font-bold leading-5">
                                        Add more files
                                    </div>
                                    <div className="text-[rgba(19,109,236,0.70)] text-xs leading-4">
                                        or drag & drop here
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Right Sidebar - Configuration */}
                    <div className="lg:w-[424px] lg:fixed lg:right-4 lg:top-24">
                        <div className="bg-white rounded-3xl border border-[#e2e8f0] p-6 shadow-xl">
                            {/* File Summary */}
                            <div className="mb-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <FolderOpen className="h-6 w-6 text-[#136dec]" />
                                    <h2 className="text-[#111418] font-bold text-lg leading-7">File Summary</h2>
                                </div>

                                {/* Summary Card */}
                                <div className="bg-[#f9fafb] rounded-lg border border-[#f3f4f6] p-3 mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-[#ffdede] rounded w-10 h-10 flex items-center justify-center flex-shrink-0">
                                            <FileText className="h-6 w-6 text-[#ff4b4b]" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-[#111418] text-sm font-bold leading-5 truncate">
                                                {files.length} PDF File{files.length > 1 ? 's' : ''}
                                            </div>
                                            <div className="text-[#6b7280] text-xs leading-4">
                                                {formatFileSize(totalSize)}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="border-t border-[#f3f4f6] pt-4 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[#6b7280] text-sm">Current Mode</span>
                                        <span className="text-[#111418] text-sm font-bold">
                                            {compressionLevel === "recommended" ? "Recommended" : "Extreme"}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[#6b7280] text-sm">Target DPI</span>
                                        <span className="text-[#111418] text-sm font-bold">{targetDPI} dpi</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[#6b7280] text-sm">Est. Reduction</span>
                                        <span className="bg-[#f0fdf4] text-[#22c55e] text-sm font-bold px-2 py-1 rounded">
                                            -{estimatedReduction}%
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Target File Size */}
                            <div className="mb-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <Settings className="h-5 w-5 text-[#9ca3af]" />
                                    <h3 className="text-[#111418] font-bold text-base">Target File Size</h3>
                                </div>

                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-[#6b7280] text-sm">Size Goal</span>
                                    <span className="bg-[#eff6ff] text-[#136dec] text-sm font-bold px-3 py-1 rounded-md">
                                        Under 2MB
                                    </span>
                                </div>

                                {/* Slider */}
                                <div className="mb-2">
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={targetSize}
                                        onChange={(e) => setTargetSize(Number(e.target.value))}
                                        className="w-full h-2 bg-[#e5e7eb] rounded-full appearance-none cursor-pointer"
                                        style={{
                                            background: `linear-gradient(to right, #136dec 0%, #136dec ${targetSize}%, #e5e7eb ${targetSize}%, #e5e7eb 100%)`
                                        }}
                                    />
                                </div>
                                <div className="flex justify-between text-xs text-[#9ca3af] font-medium">
                                    <span>Smallest (Low Quality)</span>
                                    <span>Largest (High Quality)</span>
                                </div>
                            </div>

                            {/* Compression Mode Toggle */}
                            <div className="bg-[#f1f5f9] rounded-xl p-1 flex mb-6">
                                <button
                                    onClick={() => setCompressionLevel("extreme")}
                                    className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${
                                        compressionLevel === "extreme"
                                            ? "bg-white text-[#136dec] shadow"
                                            : "text-[#64748b]"
                                    }`}
                                >
                                    Extreme
                                </button>
                                <button
                                    onClick={() => setCompressionLevel("recommended")}
                                    className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                                        compressionLevel === "recommended"
                                            ? "bg-white text-[#136dec] shadow"
                                            : "text-[#64748b]"
                                    }`}
                                >
                                    High Quality
                                </button>
                            </div>

                            {/* Compress Button */}
                            <button
                                onClick={compressPdf}
                                disabled={isProcessing || files.length === 0}
                                className="w-full bg-[#136dec] hover:bg-blue-700 text-white rounded-xl h-[60px] flex items-center justify-center gap-3 font-bold text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                <Archive className="h-6 w-6" />
                                <span>
                                    {isProcessing 
                                        ? "Compressing..." 
                                        : files.length > 1 
                                            ? `COMPRESS & ZIP (${files.length} FILES)` 
                                            : "COMPRESS PDF"}
                                </span>
                            </button>

                            {/* Footer Text */}
                            <p className="text-[#617289] text-xs leading-relaxed text-center mt-4 italic">
                                &quot;Stitching these together like a Frankenstein monster... but prettier.&quot;
                            </p>
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
