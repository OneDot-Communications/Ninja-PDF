"use client";

import { useState } from "react";
import { saveAs } from "file-saver";
import FileUploadHero from "../ui/file-upload-hero";
import { Button } from "../ui/button";
import {
    Archive,
    Check,
    Info,
    FileText,
    X,
    Settings,
    Loader2,
    Lightbulb,
    ChevronDown,
    CheckSquare,
    Square,
    Trash2
} from "lucide-react";
import { cn, isPasswordError } from "@/lib/utils";
import { pdfApi } from "@/lib/services/pdf-api";
import { getPdfJs } from "@/lib/services/pdf-service";
import { toast } from "@/lib/hooks/use-toast";
import { PasswordProtectedModal } from "../ui/password-protected-modal";

interface FileInfo {
    file: File;
    size: string;
    previewUrl?: string;
}

const conformanceLevels = [
    {
        id: "1b",
        name: "PDF/A-1b",
        fullName: "PDF/A-1b (ISO 19005-1)",
        desc: "Level B (basic) conformance requirements plus new features:",
        features: [
            "Basic archiving format",
            "No transparency allowed",
            "Best for long-term preservation",
            "Maximum compatibility"
        ]
    },
    {
        id: "2b",
        name: "PDF/A-2b",
        fullName: "PDF/A-2b (ISO 19005-2)",
        desc: "Based on a PDF 1.7 (ISO 32000-1), Level B (basic) conformance requirements plus new features:",
        features: [
            "JPEG 2000 image compression",
            "Support for transparency effects and layers",
            "Embedding of OpenType fonts",
            "Provisions for digital signatures in accordance with the PAdES standards",
            "The option of embedding PDF/A files to facilitate archiving of sets of documents with a single file"
        ]
    },
    {
        id: "3b",
        name: "PDF/A-3b",
        fullName: "PDF/A-3b (ISO 19005-3)",
        desc: "Level B (basic) conformance with additional features:",
        features: [
            "Allows embedding of arbitrary file formats",
            "Modern archiving standard",
            "Full feature support",
            "Suitable for complex documents"
        ]
    }
];

export function PdfToPdfATool() {
    const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [conformance, setConformance] = useState<"1b" | "2b" | "3b">("2b");
    const [allowDowngrade, setAllowDowngrade] = useState(true);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const formatFileSize = (bytes: number): string => {
        if (bytes >= 1024 * 1024) {
            return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        }
        return `${(bytes / 1024).toFixed(0)} KB`;
    };

    const generatePdfPreview = async (file: File): Promise<string> => {
        try {
            const pdfjsLib = await getPdfJs();
            const arrayBuffer = await file.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);

            const pdf = await (pdfjsLib as any).getDocument({
                data: uint8Array,
                cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
                cMapPacked: true,
            }).promise;

            // Render first page with good quality for single preview
            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 1.5 }); // Higher scale for better quality
            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d");
            if (context) {
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                await page.render({ canvasContext: context, viewport }).promise;
                return canvas.toDataURL('image/jpeg', 0.85); // High quality JPEG
            }

            return "";
        } catch (error) {
            console.warn("PDF preview generation failed:", error);
            return "";
        }
    };

    const handleFileSelected = async (files: File[]) => {
        if (files.length > 0) {
            const file = files[0];
            setLoadingPreview(true);
            
            const preview = await generatePdfPreview(file);
            
            setFileInfo({
                file,
                size: formatFileSize(file.size),
                previewUrl: preview,
            });
            
            setLoadingPreview(false);
        }
    };

    const removeFile = () => {
        setFileInfo(null);
    };

    const convertToPdfA = async () => {
        if (!fileInfo) return;
        setIsProcessing(true);

        try {
            const result = await pdfApi.pdfToPdfa(fileInfo.file);
            saveAs(result.blob, result.fileName);

            toast.show({
                title: "Success",
                message: "PDF converted to PDF/A successfully!",
                variant: "success",
                position: "top-right",
            });

            setFileInfo(null);
            setFileInfo(null);
        } catch (error: any) {
            console.error("Error converting to PDF/A:", error);

            if (isPasswordError(error)) {
                setShowPasswordModal(true);
                setIsProcessing(false);
                return;
            }

            toast.show({
                title: "Conversion Failed",
                message: "Failed to convert to PDF/A. Please try again.",
                variant: "error",
                position: "top-right",
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const selectedLevel = conformanceLevels.find(l => l.id === conformance);

    if (!fileInfo) {
        return (
            <>
                <div className="min-h-[calc(100vh-120px)] flex items-center justify-center">
                    <FileUploadHero
                        title="PDF to PDF/A"
                        description="Drag & drop your PDF here to convert to archival format"
                        onFilesSelected={handleFileSelected}
                        maxFiles={1}
                        accept={{ "application/pdf": [".pdf"] }}
                    />
                </div>
                <PasswordProtectedModal
                    isOpen={showPasswordModal}
                    onClose={() => setShowPasswordModal(false)}
                    toolName="converting"
                />
            </>
        );
    }

    return (
        <>
            <div className="bg-[#f6f7f8] min-h-screen relative overflow-hidden">
                <div className="max-w-[1800px] mx-auto px-4 py-4 md:py-6 overflow-hidden">
                    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 overflow-hidden">
                        {/* Left Column - File Preview */}
                        <div className="flex-1 max-w-full lg:max-w-[1200px]">
                            {/* File Preview Card */}
                            <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm p-4 lg:p-6 h-[calc(100vh-120px)] lg:h-[calc(100vh-120px)] flex flex-col overflow-hidden relative">
                                {/* Delete Button */}
                                <div className="absolute top-4 right-4 z-10">
                                    <button
                                        onClick={removeFile}
                                        className="bg-red-500 hover:bg-red-600 text-white rounded-lg p-2 shadow-md transition-all hover:shadow-lg"
                                        title="Delete file"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>

                                {/* Mobile Settings Button */}
                                <div className="lg:hidden absolute bottom-20 left-4 z-10">
                                    <button
                                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                        className="bg-[#4383BF] hover:bg-[#3A74A8] text-white rounded-lg px-4 py-2 flex items-center gap-2 font-semibold text-sm shadow-lg transition-all"
                                    >
                                        <Settings className="h-4 w-4" />
                                        <span>Options</span>
                                    </button>
                                </div>

                                {/* PDF Preview */}
                                <div className="flex-1 flex items-center justify-center overflow-hidden">
                                    {loadingPreview ? (
                                        <div className="flex flex-col items-center justify-center">
                                            <Loader2 className="h-12 w-12 text-[#4383BF] animate-spin mb-4" />
                                            <p className="text-sm text-[#617289]">Generating preview...</p>
                                        </div>
                                    ) : fileInfo.previewUrl ? (
                                        <img
                                            src={fileInfo.previewUrl}
                                            alt="PDF Preview"
                                            className="max-w-full max-h-full object-contain rounded-lg border-2 border-[#e2e8f0] shadow-lg"
                                        />
                                    ) : (
                                        <div className="w-24 h-24 bg-[#4383BF]/10 rounded-2xl flex items-center justify-center">
                                            <Archive className="h-12 w-12 text-[#4383BF]" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right Sidebar - Desktop */}
                        <div className="hidden lg:block lg:w-[400px] lg:fixed lg:right-4 lg:top-20 lg:bottom-4 lg:z-10">
                            <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6 h-full flex flex-col shadow-xl overflow-hidden">
                                {/* File Info & Remove */}
                                <div className="pb-4 border-b border-[#e2e8f0] mb-6">
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div className="w-10 h-10 bg-[#4383BF]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <Archive className="h-5 w-5 text-[#4383BF]" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h2 className="text-sm font-bold text-gray-900 truncate">{fileInfo.file.name}</h2>
                                                <p className="text-xs text-gray-500">{fileInfo.size}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={removeFile}
                                            className="rounded-lg p-2 hover:bg-red-50 transition-colors text-gray-400 hover:text-red-600 flex-shrink-0"
                                            title="Remove file"
                                        >
                                            <X className="h-5 w-5" />
                                        </button>
                                    </div>
                                    <div className="bg-gradient-to-r from-[#4383BF]/10 to-[#4383BF]/5 rounded-lg px-3 py-2">
                                        <p className="text-xs text-[#4383BF] font-medium">Ready to convert to PDF/A</p>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="flex-1 space-y-5 overflow-y-auto">

                                    {/* Conformance Level Dropdown */}
                                    <div>
                                        <label className="text-[#617289] font-semibold text-xs uppercase tracking-wider mb-2 block">
                                            Conformance Level
                                        </label>
                                        <div className="relative">
                                            <button
                                                onClick={() => setDropdownOpen(!dropdownOpen)}
                                                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-white hover:border-[#4383BF]/50 focus:outline-none focus:ring-2 focus:ring-[#4383BF]/20 focus:border-[#4383BF] transition-all flex items-center justify-between"
                                            >
                                                <span className="font-medium text-gray-900">{selectedLevel?.name}</span>
                                                <ChevronDown className={cn(
                                                    "w-4 h-4 text-gray-500 transition-transform duration-200",
                                                    dropdownOpen && "rotate-180"
                                                )} />
                                            </button>
                                            {dropdownOpen && (
                                                <div className="absolute z-20 w-full mt-1.5 bg-white rounded-xl border border-gray-200 shadow-lg shadow-gray-200/50 py-1 animate-in fade-in slide-in-from-top-1 duration-150">
                                                    {conformanceLevels.map((level) => (
                                                        <button
                                                            key={level.id}
                                                            onClick={() => {
                                                                setConformance(level.id as any);
                                                                setDropdownOpen(false);
                                                            }}
                                                            className={cn(
                                                                "w-full px-4 py-3 text-sm text-left flex items-center justify-between transition-colors",
                                                                conformance === level.id
                                                                    ? "bg-[#4383BF]/10 text-[#4383BF] font-medium"
                                                                    : "text-gray-700 hover:bg-gray-50"
                                                            )}
                                                        >
                                                            {level.name}
                                                            {conformance === level.id && <Check className="w-4 h-4" />}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Allow Downgrade Checkbox */}
                                    <div
                                        onClick={() => setAllowDowngrade(!allowDowngrade)}
                                        className="flex items-start gap-3 p-3 bg-[#f8f9fa] rounded-xl cursor-pointer hover:bg-gray-100 transition-colors"
                                    >
                                        <div className="mt-0.5">
                                            {allowDowngrade ? (
                                                <CheckSquare className="w-5 h-5 text-[#4383BF]" />
                                            ) : (
                                                <Square className="w-5 h-5 text-gray-400" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-[#111418]">Auto-optimize compatibility</p>
                                            <p className="text-xs text-[#617289] mt-0.5">
                                                Allow automatic level adjustment for successful conversion
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Convert Button */}
                                <div className="mt-auto pt-6">
                                    <Button
                                        onClick={convertToPdfA}
                                        disabled={isProcessing}
                                        className="w-full h-[60px] bg-[#4383BF] hover:bg-[#3A74A8] text-white rounded-xl flex items-center justify-center gap-2 font-bold text-lg shadow-lg disabled:opacity-50"
                                    >
                                        {isProcessing ? (
                                            <>
                                                <Loader2 className="h-6 w-6 animate-spin" />
                                                <span>Converting...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Archive className="h-6 w-6" />
                                                <span>Convert to PDF/A</span>
                                            </>
                                        )}
                                    </Button>

                                    {/* Footer */}
                                    <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
                                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                        </svg>
                                        <span>File processed securely. We do not store your data.</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Mobile Options Bottom Sheet */}
                        {mobileMenuOpen && (
                            <>
                                {/* Backdrop */}
                                <div 
                                    className="lg:hidden fixed inset-0 bg-black/50 z-40 animate-in fade-in duration-200"
                                    onClick={() => setMobileMenuOpen(false)}
                                />
                                
                                {/* Bottom Sheet */}
                                <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom duration-300">
                                    <div className="p-6 max-h-[70vh] overflow-y-auto">
                                        {/* Handle Bar */}
                                        <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-6"></div>
                                        
                                        {/* File Info */}
                                        <div className="flex items-center gap-3 pb-4 border-b border-[#e2e8f0] mb-5">
                                            <div className="w-10 h-10 bg-[#4383BF]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <Archive className="h-5 w-5 text-[#4383BF]" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h2 className="text-sm font-bold text-gray-900 truncate">{fileInfo.file.name}</h2>
                                                <p className="text-xs text-gray-500">{fileInfo.size}</p>
                                            </div>
                                        </div>

                                        {/* Conformance Level Dropdown */}
                                        <div className="mb-5">
                                            <label className="text-[#617289] font-semibold text-xs uppercase tracking-wider mb-2 block">
                                                Conformance Level
                                            </label>
                                            <div className="relative">
                                                <button
                                                    onClick={() => setDropdownOpen(!dropdownOpen)}
                                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-white flex items-center justify-between"
                                                >
                                                    <span className="font-medium text-gray-900">{selectedLevel?.name}</span>
                                                    <ChevronDown className={cn(
                                                        "w-4 h-4 text-gray-500 transition-transform duration-200",
                                                        dropdownOpen && "rotate-180"
                                                    )} />
                                                </button>
                                                {dropdownOpen && (
                                                    <div className="absolute z-20 w-full mt-1.5 bg-white rounded-xl border border-gray-200 shadow-lg py-1">
                                                        {conformanceLevels.map((level) => (
                                                            <button
                                                                key={level.id}
                                                                onClick={() => {
                                                                    setConformance(level.id as any);
                                                                    setDropdownOpen(false);
                                                                }}
                                                                className={cn(
                                                                    "w-full px-4 py-3 text-sm text-left flex items-center justify-between",
                                                                    conformance === level.id
                                                                        ? "bg-[#4383BF]/10 text-[#4383BF] font-medium"
                                                                        : "text-gray-700"
                                                                )}
                                                            >
                                                                {level.name}
                                                                {conformance === level.id && <Check className="w-4 h-4" />}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Allow Downgrade Checkbox */}
                                        <div
                                            onClick={() => setAllowDowngrade(!allowDowngrade)}
                                            className="flex items-start gap-3 p-3 bg-[#f8f9fa] rounded-xl cursor-pointer"
                                        >
                                            <div className="mt-0.5">
                                                {allowDowngrade ? (
                                                    <CheckSquare className="w-5 h-5 text-[#4383BF]" />
                                                ) : (
                                                    <Square className="w-5 h-5 text-gray-400" />
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-semibold text-[#111418]">Auto-optimize</p>
                                                <p className="text-xs text-[#617289] mt-0.5">
                                                    Allow automatic adjustment for conversion
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Mobile Convert Button - Permanently Fixed */}
                        <div className="lg:hidden fixed bottom-4 left-4 right-4 z-40">
                            <Button
                                onClick={convertToPdfA}
                                disabled={isProcessing}
                                className="w-full h-14 bg-[#4383BF] hover:bg-[#3A74A8] text-white rounded-xl flex items-center justify-center gap-2 font-bold text-sm shadow-lg disabled:opacity-50"
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        <span>Converting...</span>
                                    </>
                                ) : (
                                    <>
                                        <Archive className="h-5 w-5" />
                                        <span>Convert to PDF/A</span>
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
                toolName="converting"
            />
        </>
    );
}
