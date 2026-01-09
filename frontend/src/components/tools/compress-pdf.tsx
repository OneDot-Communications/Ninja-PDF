"use client";

import { useState, useRef, useCallback } from "react";
import { saveAs } from "file-saver";
import JSZip from "jszip";
import FileUploadHero from "../ui/file-upload-hero";
import { FileText, Archive, X, Plus, Check } from "lucide-react";
import { pdfApi } from "@/lib/services/pdf-api";
import { toast } from "@/lib/hooks/use-toast";
import { isPasswordError } from "@/lib/utils";
import * as pdfjsLib from "pdfjs-dist";
import { PasswordProtectedModal } from "../ui/password-protected-modal";

interface PagePreview {
    pageNumber: number;
    image: string;
    width: number;
    height: number;
}

export function CompressPdfTool() {
    const [files, setFiles] = useState<File[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [compressionLevel, setCompressionLevel] = useState<"recommended" | "extreme" | "less">("recommended");
    const [targetSize, setTargetSize] = useState<number>(60); // 0-100 slider value
    const [viewMode, setViewMode] = useState<"file" | "page">("file");
    const [previews, setPreviews] = useState<{ [key: string]: string }>({});
    const [showPasswordModal, setShowPasswordModal] = useState(false);
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
            const result = await pdfApi.getPagePreviews(file);
            if (result?.previews?.[0]) {
                setPreviews(prev => ({
                    ...prev,
                    [file.name]: result.previews[0].image
                }));
            }
        } catch (error: any) {
            console.error("Failed to generate preview:", error);
            if (isPasswordError(error)) {
                setShowPasswordModal(true);
            }
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
            const backendLevel = compressionLevel === "extreme" ? "extreme" : "recommended";

            if (files.length === 1) {
                const result = await pdfApi.compress(files[0], backendLevel);
                saveAs(result.blob, result.fileName || `compressed-${files[0].name}`);
            } else {
                const zip = new JSZip();

                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    toast.show({
                        title: "Compressing",
                        message: `Compressing ${i + 1} of ${files.length}: ${file.name}`,
                        variant: "default",
                        position: "top-right",
                    });

                    const result = await pdfApi.compress(file, backendLevel);
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
                <PasswordProtectedModal
                    isOpen={showPasswordModal}
                    onClose={() => setShowPasswordModal(false)}
                    toolName="compressing"
                />
            </>
        );
    }

    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    const totalPages = files.length; // Simplified - could count actual pages

    return (
        <div className="bg-[#f6f7f8] min-h-screen relative">
            <div className="max-w-[1800px] mx-auto px-4 py-4 md:py-8">
                <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
                    {/* Left Column - File Grid (Expanded like merge PDF) */}
                    <div className="flex-1 max-w-full lg:max-w-[1200px]">
                        {/* View Mode Toggle + Controls */}
                        <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-[#e2e8f0] shadow-sm p-4 mb-6">
                            <div className="flex items-center justify-between flex-wrap gap-4">
                                {/* View Toggle */}
                                <div className="bg-[#f0f2f4] rounded-lg p-1 flex">
                                    <button
                                        onClick={() => setViewMode("file")}
                                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${viewMode === "file"
                                            ? "bg-white text-[#4383BF] shadow"
                                            : "text-[#617289]"
                                            }`}
                                    >
                                        File View
                                    </button>
                                    <button
                                        onClick={() => setViewMode("page")}
                                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${viewMode === "page"
                                            ? "bg-white text-[#4383BF] shadow"
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
                                        <path d="M15 16h4v2h-4zm0-8h7v2h-7zm0 4h6v2h-6zM3 18c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2V8H3v10zM14 5h-3l-1-1H6L5 5H2v2h12z" />
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
                                <div className="space-y-3">
                                    {[{
                                        value: "extreme",
                                        title: "EXTREME COMPRESSION",
                                        desc: "Less quality, high compression"
                                    }, {
                                        value: "recommended",
                                        title: "RECOMMENDED COMPRESSION",
                                        desc: "Good quality, good compression"
                                    }, {
                                        value: "less",
                                        title: "LESS COMPRESSION",
                                        desc: "High quality, less compression"
                                    }].map((item) => {
                                        const isActive = compressionLevel === item.value;
                                        return (
                                            <button
                                                key={item.value}
                                                onClick={() => setCompressionLevel(item.value as any)}
                                                className={`w-full text-left p-4 rounded-lg transition-colors ${isActive ? "bg-[#f1f4fb] border-2 border-[#4383BF]" : "bg-[#f6f7f8] border-2 border-transparent hover:bg-[#e2e8f0]"
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <div className="text-[#e11d48] text-sm font-bold tracking-tight">
                                                            {item.title}
                                                        </div>
                                                        <div className="text-[#0f172a] text-sm mt-1">
                                                            {item.desc}
                                                        </div>
                                                    </div>
                                                    {isActive && (
                                                        <span className="w-8 h-8 bg-[#22c55e] rounded-full flex items-center justify-center text-white shadow">
                                                            <Check className="h-4 w-4" />
                                                        </span>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
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
            <PasswordProtectedModal
                isOpen={showPasswordModal}
                onClose={() => setShowPasswordModal(false)}
                toolName="compressing"
            />
        </div>
    );
}
