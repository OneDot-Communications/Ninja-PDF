"use client";

import { useState } from "react";
import FileUploadHero from "../ui/file-upload-hero";
import { Button } from "../ui/button";
import { Wrench, FileText, Loader2, Lightbulb, X, Settings, RefreshCw, Eye } from "lucide-react";
import { PasswordProtectedModal } from "../ui/password-protected-modal";
import { pdfStrategyManager } from "@/lib/services/pdf-service";
import { toast } from "@/lib/hooks/use-toast";
import { saveAs } from "file-saver";
import { isPasswordError } from "@/lib/utils";

interface FileInfo {
    file: File;
    size: string;
}

export function RepairPdfTool() {
    const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState<string>("");
    const [repairMode, setRepairMode] = useState<"auto" | "visual">("auto");
    const [showPasswordModal, setShowPasswordModal] = useState(false);

    const formatFileSize = (bytes: number): string => {
        if (bytes >= 1024 * 1024) {
            return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        }
        return `${(bytes / 1024).toFixed(0)} KB`;
    };

    const handleFileSelected = (files: File[]) => {
        if (files.length > 0) {
            const file = files[0];
            setFileInfo({
                file,
                size: formatFileSize(file.size),
            });
        }
    };

    const removeFile = () => {
        setFileInfo(null);
        setProgress("");
    };

    const repairPdf = async () => {
        if (!fileInfo) return;

        setIsProcessing(true);
        setProgress("Analyzing PDF structure...");

        try {
            setProgress("Attempting repair...");

            const result = await pdfStrategyManager.execute('repair', [fileInfo.file], {
                repairMode
            });

            saveAs(result.blob, result.fileName || `repaired-${fileInfo.file.name}`);

            toast.show({
                title: "Success",
                message: "PDF repaired successfully!",
                variant: "success",
                position: "top-right",
            });

            // Clear file after success
            setFileInfo(null);
            setProgress("");

        } catch (error: any) {
            console.error("Error repairing PDF:", error);
            setProgress("");

            if (isPasswordError(error)) {
                setShowPasswordModal(true);
                setIsProcessing(false);
                return;
            }

            toast.show({
                title: "Repair Failed",
                message: error.message || "Failed to repair PDF. The file may be too severely corrupted.",
                variant: "error",
                position: "top-right",
            });
        } finally {
            setIsProcessing(false);
        }
    };

    if (!fileInfo) {
        return (
            <>
                <div className="min-h-[calc(100vh-120px)] flex items-center justify-center">
                    <FileUploadHero
                        title="Repair PDF"
                        description="Drag & drop your damaged PDF here"
                        onFilesSelected={handleFileSelected}
                        maxFiles={1}
                        accept={{ "application/pdf": [".pdf"] }}
                    />
                </div>
                <PasswordProtectedModal
                    isOpen={showPasswordModal}
                    onClose={() => setShowPasswordModal(false)}
                    toolName="repairing"
                />
            </>
        );
    }

    return (
        <>
            <div className="bg-[#f6f7f8] min-h-screen relative">
                <div className="max-w-[1800px] mx-auto px-4 py-4 md:py-8">
                    <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
                        {/* Left Column - File Info */}
                        <div className="flex-1 max-w-full lg:max-w-[1200px]">
                            {/* Control Bar */}
                            <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-[#e2e8f0] shadow-sm mb-4 p-4">
                                <div className="flex items-center justify-between flex-wrap gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-[#4383BF]/10 rounded-lg flex items-center justify-center">
                                            <Wrench className="h-5 w-5 text-[#4383BF]" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-gray-900">{fileInfo.file.name}</h2>
                                            <p className="text-sm text-gray-500">PDF • {fileInfo.size}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={removeFile}
                                        className="rounded-lg flex items-center gap-2 px-3 py-2 hover:bg-red-50 transition-colors text-gray-600 hover:text-red-600"
                                    >
                                        <X className="h-5 w-5" />
                                        <span className="font-bold text-sm">Remove File</span>
                                    </button>
                                </div>
                            </div>

                            {/* File Preview Card */}
                            <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm p-8">
                                <div className="flex flex-col items-center justify-center py-12">
                                    <div className="w-24 h-24 bg-[#f0f2f4] rounded-2xl flex items-center justify-center mb-6">
                                        <FileText className="h-12 w-12 text-[#617289]" />
                                    </div>
                                    <h3 className="text-xl font-bold text-[#111418] mb-2">{fileInfo.file.name}</h3>
                                    <p className="text-[#617289] text-sm mb-4">{fileInfo.size} • Ready to repair</p>

                                    {/* Status Indicator */}
                                    <div className="bg-[#f6f7f8] rounded-xl px-6 py-4 text-center">
                                        <div className="flex items-center gap-2 justify-center text-[#4383BF]">
                                            <Wrench className="h-5 w-5" />
                                            <span className="font-bold">File uploaded successfully</span>
                                        </div>
                                        <p className="text-sm text-[#617289] mt-1">Ready to repair</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Sidebar */}
                        <div className="hidden lg:block lg:w-[424px] lg:fixed lg:right-4 lg:top-20 lg:bottom-4 lg:z-10">
                            <div className="bg-white rounded-3xl border border-[#e2e8f0] p-6 h-full flex flex-col shadow-xl">
                                {/* Header */}
                                <div className="flex items-center gap-2 pb-4 border-b border-[#e2e8f0] mb-6">
                                    <Settings className="h-5 w-5 text-[#111418]" />
                                    <h2 className="text-[#111418] font-bold text-lg">Repair Options</h2>
                                </div>

                                {/* Settings */}
                                <div className="flex-1 space-y-6 overflow-y-auto">
                                    {/* Repair Mode */}
                                    <div>
                                        <label className="text-[#617289] font-bold text-xs uppercase tracking-wider mb-3 block">
                                            Repair Mode
                                        </label>
                                        <div className="space-y-3">
                                            <div
                                                onClick={() => setRepairMode("auto")}
                                                className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all ${repairMode === "auto"
                                                    ? "bg-[#4383BF]/10 border-2 border-[#4383BF]"
                                                    : "bg-[#f6f7f8] border-2 border-transparent hover:bg-[#f0f2f4]"
                                                    }`}
                                            >
                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${repairMode === "auto" ? "bg-[#4383BF] text-white" : "bg-white text-[#617289]"
                                                    }`}>
                                                    <RefreshCw className="h-5 w-5" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="text-[#111418] font-bold text-sm">Auto Repair</div>
                                                    <div className="text-xs text-[#617289]">Try standard repair first, then visual recovery</div>
                                                </div>
                                                {repairMode === "auto" && (
                                                    <div className="w-5 h-5 rounded-full bg-[#4383BF] flex items-center justify-center">
                                                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                    </div>
                                                )}
                                            </div>

                                            <div
                                                onClick={() => setRepairMode("visual")}
                                                className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all ${repairMode === "visual"
                                                    ? "bg-[#4383BF]/10 border-2 border-[#4383BF]"
                                                    : "bg-[#f6f7f8] border-2 border-transparent hover:bg-[#f0f2f4]"
                                                    }`}
                                            >
                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${repairMode === "visual" ? "bg-[#4383BF] text-white" : "bg-white text-[#617289]"
                                                    }`}>
                                                    <Eye className="h-5 w-5" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="text-[#111418] font-bold text-sm">Visual Recovery</div>
                                                    <div className="text-xs text-[#617289]">Force rasterization for severely damaged files</div>
                                                </div>
                                                {repairMode === "visual" && (
                                                    <div className="w-5 h-5 rounded-full bg-[#4383BF] flex items-center justify-center">
                                                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Summary */}
                                    <div className="bg-[#f6f7f8] rounded-xl p-4">
                                        <div className="text-[#617289] font-bold text-xs uppercase tracking-wider mb-3">
                                            Summary
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[#617289] text-sm">File Name</span>
                                                <span className="text-[#111418] font-bold text-sm truncate max-w-[180px]" title={fileInfo.file.name}>
                                                    {fileInfo.file.name.length > 20
                                                        ? fileInfo.file.name.substring(0, 17) + '...'
                                                        : fileInfo.file.name}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-[#617289] text-sm">File Size</span>
                                                <span className="text-[#111418] font-bold text-sm">{fileInfo.size}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-[#617289] text-sm">File Type</span>
                                                <span className="text-[#111418] font-bold text-sm">PDF</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-[#617289] text-sm">Status</span>
                                                <span className="text-[#4383BF] font-bold text-sm">Ready to repair</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tip Box */}
                                    <div className="bg-[#f8f9fa] rounded-2xl p-4 flex gap-3">
                                        <div className="mt-0.5">
                                            <div className="w-5 h-5 flex items-center justify-center">
                                                <Lightbulb className="h-4 w-4 text-[#fbbf24] fill-current" />
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[#617289] text-xs font-bold uppercase tracking-wider mb-1">Tip</p>
                                            <p className="text-[#617289] text-sm leading-relaxed">
                                                Repair works best on partially corrupted PDFs. Very damaged files may recover limited content.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Repair Button */}
                                <div className="mt-auto pt-6">
                                    <Button
                                        onClick={repairPdf}
                                        disabled={isProcessing}
                                        className="w-full h-[60px] bg-[#4383BF] hover:bg-[#3470A0] text-white rounded-xl flex items-center justify-center gap-2 font-bold text-lg shadow-lg disabled:opacity-50"
                                    >
                                        {isProcessing ? (
                                            <>
                                                <Loader2 className="h-6 w-6 animate-spin" />
                                                <span className="flex flex-col items-center">
                                                    <span className="font-bold">Repairing...</span>
                                                    {progress && <span className="text-xs font-normal mt-1 opacity-80">{progress}</span>}
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <Wrench className="h-6 w-6" />
                                                <span>Repair PDF</span>
                                            </>
                                        )}
                                    </Button>

                                    {/* Footer */}
                                    <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
                                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                        </svg>
                                        <span>File processed locally. We do not store your data.</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Mobile Repair Button */}
                        <div className="lg:hidden fixed bottom-4 left-4 right-4 z-40">
                            <Button
                                onClick={repairPdf}
                                disabled={isProcessing}
                                className="w-full h-14 bg-[#4383BF] hover:bg-[#3470A0] text-white rounded-xl flex items-center justify-center gap-2 font-bold text-sm shadow-lg disabled:opacity-50"
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        <span className="flex flex-col items-start">
                                            <span className="font-bold">Repairing...</span>
                                            {progress && <span className="text-xs font-normal opacity-80">{progress}</span>}
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <Wrench className="h-5 w-5" />
                                        <span>Repair PDF</span>
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
            <PasswordProtectedModal
                isOpen={showPasswordModal}
                onClose={() => setShowPasswordModal(false)}
                toolName="repairing"
            />
        </>
    );
}
