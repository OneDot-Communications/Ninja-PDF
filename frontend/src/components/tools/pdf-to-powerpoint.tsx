"use client";

import { useState, useRef } from "react";
import { saveAs } from "file-saver";
import JSZip from "jszip";
import FileUploadHero from "../ui/file-upload-hero";
import { FileText, Trash2, Plus, ArrowRight, Settings as SettingsIcon, CheckCircle } from "lucide-react";
import { pdfApi } from "@/lib/services/pdf-api";
import { toast } from "@/lib/hooks/use-toast";
import { api } from "@/lib/services/api";

type ConversionMode = "optimize" | "maintain";

interface UploadedFile {
    file: File;
    slidesDetected: number;
    uploadTime: Date;
}

export function PdfToPowerPointTool() {
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [conversionMode, setConversionMode] = useState<ConversionMode>("optimize");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelected = async (files: File[]) => {
        const pdfFiles = files.filter(f => f.type === "application/pdf");
        
        for (const file of pdfFiles) {
            // Detect slides/pages
            try {
                const result = await api.getPdfPagePreviews(file);
                const slidesCount = result?.previews?.length || 0;
                
                setUploadedFiles(prev => [...prev, {
                    file,
                    slidesDetected: slidesCount,
                    uploadTime: new Date()
                }]);
            } catch (error) {
                console.error("Failed to detect slides:", error);
                setUploadedFiles(prev => [...prev, {
                    file,
                    slidesDetected: 0,
                    uploadTime: new Date()
                }]);
            }
        }
    };

    const removeFile = (index: number) => {
        setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleAddMoreFiles = () => {
        fileInputRef.current?.click();
    };

    const convertToPptx = async () => {
        if (uploadedFiles.length === 0) return;
        setIsProcessing(true);

        try {
            if (uploadedFiles.length === 1) {
                // Single file conversion
                const result = await pdfApi.pdfToPowerpoint(uploadedFiles[0].file);
                saveAs(result.blob, result.fileName || `${uploadedFiles[0].file.name.replace('.pdf', '')}.pptx`);
                
                toast.show({
                    title: "Success",
                    message: "PDF converted to PowerPoint successfully!",
                    variant: "success",
                    position: "top-right",
                });
            } else {
                // Multiple files - create ZIP
                const zip = new JSZip();
                
                for (let i = 0; i < uploadedFiles.length; i++) {
                    const uploadedFile = uploadedFiles[i];
                    
                    toast.show({
                        title: "Converting",
                        message: `Converting ${i + 1} of ${uploadedFiles.length}: ${uploadedFile.file.name}`,
                        variant: "default",
                        position: "top-right",
                    });
                    
                    const result = await pdfApi.pdfToPowerpoint(uploadedFile.file);
                    const fileName = result.fileName || `${uploadedFile.file.name.replace('.pdf', '')}.pptx`;
                    zip.file(fileName, result.blob);
                }

                toast.show({
                    title: "Creating ZIP",
                    message: "Packaging PowerPoint files...",
                    variant: "default",
                    position: "top-right",
                });
                
                const zipBlob = await zip.generateAsync({ type: "blob" });
                saveAs(zipBlob, `pdf-to-pptx-${Date.now()}.zip`);
                
                toast.show({
                    title: "Success",
                    message: `${uploadedFiles.length} PDFs converted and saved as ZIP!`,
                    variant: "success",
                    position: "top-right",
                });
            }

            // Clear files after conversion
            setUploadedFiles([]);
        } catch (error: any) {
            console.error("Error converting PDF to PowerPoint:", error);
            toast.show({
                title: "Conversion Failed",
                message: error.message || "Failed to convert PDF to PowerPoint. Please try again.",
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

    const formatTime = (date: Date) => {
        const now = new Date();
        const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
        
        if (diff < 60) return "Just now";
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        return `${Math.floor(diff / 3600)}h ago`;
    };

    const estimatedTime = uploadedFiles.length * 12; // 12 seconds per file

    if (uploadedFiles.length === 0) {
        return (
            <div className="min-h-[calc(100vh-120px)] flex items-center justify-center">
                <FileUploadHero
                    title="PDF to PowerPoint"
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

    return (
        <div className="bg-[#f6f7f8] min-h-screen pb-8">
            <div className="max-w-[1800px] mx-auto px-4 py-8">
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Left Column - Main Content */}
                    <div className="flex-1 lg:max-w-[calc(100%-448px)]">
                        {/* Uploaded Files Section */}
                        <div className="mb-8">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-[#94a3b8] text-sm font-bold tracking-wider uppercase">
                                    Uploaded Files
                                </h2>
                                <div className="bg-[#f1f5f9] rounded px-2 py-1">
                                    <span className="text-[#94a3b8] text-xs font-medium">Batch 1</span>
                                </div>
                            </div>

                            {/* File List */}
                            <div className="space-y-4">
                                {uploadedFiles.map((uploadedFile, index) => (
                                    <div
                                        key={index}
                                        className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-4 flex items-center gap-4"
                                    >
                                        {/* PDF Icon */}
                                        <div className="bg-[#fef2f2] rounded-xl w-14 h-14 flex items-center justify-center flex-shrink-0">
                                            <FileText className="h-8 w-8 text-[#ef4444]" />
                                        </div>

                                        {/* File Info */}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-[#0f172a] text-base font-bold leading-6 truncate">
                                                {uploadedFile.file.name}
                                            </h3>
                                            <div className="flex items-center gap-2 text-[#64748b] text-sm">
                                                <span>{formatFileSize(uploadedFile.file.size)}</span>
                                                <span className="w-1 h-1 bg-[#cbd5e1] rounded-full"></span>
                                                <span>{formatTime(uploadedFile.uploadTime)}</span>
                                            </div>
                                        </div>

                                        {/* Slides Detected Badge */}
                                        <div className="bg-[#eef2ff] border border-[#e0e7ff] rounded-lg px-3 py-2 flex items-center gap-2">
                                            <CheckCircle className="h-4 w-4 text-[#136dec]" />
                                            <span className="text-[#136dec] text-sm font-bold whitespace-nowrap">
                                                {uploadedFile.slidesDetected} Slides detected
                                            </span>
                                        </div>

                                        {/* Delete Button */}
                                        <button
                                            onClick={() => removeFile(index)}
                                            className="p-2 rounded-lg hover:bg-red-50 transition-colors group"
                                        >
                                            <Trash2 className="h-6 w-6 text-[#94a3b8] group-hover:text-red-600" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Conversion Settings Section */}
                        <div className="mb-8">
                            <h2 className="text-[#94a3b8] text-sm font-bold tracking-wider uppercase mb-6">
                                Conversion Settings
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Optimize Text Mode */}
                                <button
                                    onClick={() => setConversionMode("optimize")}
                                    className={`text-left p-6 rounded-xl border-2 transition-all ${
                                        conversionMode === "optimize"
                                            ? "bg-[rgba(19,109,236,0.03)] border-[#136dec]"
                                            : "bg-white border-[#e2e8f0]"
                                    }`}
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div
                                            className={`w-5 h-5 rounded-full border-4 ${
                                                conversionMode === "optimize"
                                                    ? "border-[#136dec]"
                                                    : "border-[#cbd5e1]"
                                            }`}
                                        ></div>
                                        <svg className="w-6 h-6 text-[#cbd5e1]" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6zm2-8h8v2H8v-2zm0 4h8v2H8v-2z"/>
                                        </svg>
                                    </div>
                                    <h3 className="text-[#0f172a] text-base font-bold mb-2">
                                        Optimize text for editing
                                    </h3>
                                    <p className="text-[#64748b] text-sm leading-relaxed">
                                        Best for content changes. We'll extract text into editable text boxes, grouping paragraphs intelligently.
                                    </p>
                                </button>

                                {/* Maintain Layout Mode */}
                                <button
                                    onClick={() => setConversionMode("maintain")}
                                    className={`text-left p-6 rounded-xl border-2 transition-all ${
                                        conversionMode === "maintain"
                                            ? "bg-[rgba(19,109,236,0.03)] border-[#136dec]"
                                            : "bg-white border-[#e2e8f0]"
                                    }`}
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div
                                            className={`w-5 h-5 rounded-full border-4 ${
                                                conversionMode === "maintain"
                                                    ? "border-[#136dec]"
                                                    : "border-[#cbd5e1]"
                                            }`}
                                        ></div>
                                        <svg className="w-6 h-6 text-[#cbd5e1]" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M4 11h6V5H4v6zm0 8h6v-6H4v6zm8 0h6v-6h-6v6zm0-8h6V5h-6v6z"/>
                                        </svg>
                                    </div>
                                    <h3 className="text-[#0f172a] text-base font-bold mb-2">
                                        Maintain original layout
                                    </h3>
                                    <p className="text-[#64748b] text-sm leading-relaxed">
                                        Best for visuals. We'll preserve the exact look of your slides, using images for complex elements.
                                    </p>
                                </button>
                            </div>
                        </div>

                        {/* Add More Files Button */}
                        <button
                            onClick={handleAddMoreFiles}
                            className="w-full border border-[#e2e8f0] rounded-lg py-6 flex items-center justify-center gap-3 hover:bg-gray-50 transition-colors"
                        >
                            <Plus className="h-6 w-6 text-[#475569]" />
                            <span className="text-[#475569] text-base font-bold">Add more files</span>
                        </button>
                    </div>

                    {/* Right Sidebar - Export Settings */}
                    <div className="lg:w-[424px] lg:fixed lg:right-4 lg:top-24">
                        <div className="bg-white rounded-3xl border border-[#e2e8f0] p-6 shadow-xl">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-[#0f172a] font-bold text-lg">Export Settings</h2>
                                <SettingsIcon className="h-6 w-6 text-[#94a3b8]" />
                            </div>

                            {/* Conversion Mode Summary */}
                            <div className="mb-6">
                                <h3 className="text-[#94a3b8] text-xs font-bold tracking-wider uppercase mb-4">
                                    Conversion Mode
                                </h3>

                                {/* Selected Mode - Optimize */}
                                <div
                                    className={`rounded-xl border-2 p-4 mb-3 ${
                                        conversionMode === "optimize"
                                            ? "bg-[rgba(19,109,236,0.03)] border-[#136dec]"
                                            : "bg-[#f8fafc] border-[#e2e8f0]"
                                    }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div
                                            className={`w-4 h-4 rounded-full border-4 mt-0.5 ${
                                                conversionMode === "optimize"
                                                    ? "border-[#136dec]"
                                                    : "border-[#cbd5e1]"
                                            }`}
                                        ></div>
                                        <div className="flex-1">
                                            <h4 className="text-[#0f172a] text-sm font-bold mb-1">
                                                Optimize text for editing
                                            </h4>
                                            <p className="text-[#64748b] text-xs leading-relaxed">
                                                Extracts text into editable boxes. Best for content changes.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Unselected Mode - Maintain */}
                                <div
                                    className={`rounded-xl border-2 p-4 ${
                                        conversionMode === "maintain"
                                            ? "bg-[rgba(19,109,236,0.03)] border-[#136dec]"
                                            : "bg-[#f8fafc] border-[#e2e8f0]"
                                    }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div
                                            className={`w-4 h-4 rounded-full border-4 mt-0.5 ${
                                                conversionMode === "maintain"
                                                    ? "border-[#136dec]"
                                                    : "border-[#cbd5e1]"
                                            }`}
                                        ></div>
                                        <div className="flex-1">
                                            <h4 className="text-[#0f172a] text-sm font-bold mb-1">
                                                Maintain original layout
                                            </h4>
                                            <p className="text-[#64748b] text-xs leading-relaxed">
                                                Preserves exact look using images for complex elements.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Statistics */}
                            <div className="border border-[#e2e8f0] rounded-lg p-4 mb-6">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-[#64748b] text-sm">Total files</span>
                                    <span className="text-[#0f172a] text-sm font-bold">{uploadedFiles.length}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[#64748b] text-sm">Est. processing time</span>
                                    <span className="text-[#0f172a] text-sm font-bold">~{estimatedTime}s</span>
                                </div>
                            </div>

                            {/* Convert Button */}
                            <button
                                onClick={convertToPptx}
                                disabled={isProcessing || uploadedFiles.length === 0}
                                className="w-full bg-[#136dec] hover:bg-blue-700 text-white rounded-xl h-[60px] flex items-center justify-center gap-3 font-bold text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all mb-4"
                            >
                                <span>
                                    {isProcessing
                                        ? "Converting..."
                                        : uploadedFiles.length > 1
                                        ? `CONVERT TO PPTX (${uploadedFiles.length})`
                                        : "CONVERT TO PPTX"}
                                </span>
                                <ArrowRight className="h-6 w-6" />
                            </button>

                            {/* Terms */}
                            <p className="text-[#94a3b8] text-[10px] leading-relaxed text-center">
                                By converting, you agree to our Terms of Service.
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
