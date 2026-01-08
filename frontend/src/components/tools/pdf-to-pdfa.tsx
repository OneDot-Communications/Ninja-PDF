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
    Square
} from "lucide-react";
import { cn } from "@/lib/utils";
import { pdfApi } from "@/lib/services/pdf-api";
import { toast } from "@/lib/hooks/use-toast";

interface FileInfo {
    file: File;
    size: string;
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
        } catch (error) {
            console.error("Error converting to PDF/A:", error);
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
            <div className="min-h-[calc(100vh-120px)] flex items-center justify-center">
                <FileUploadHero
                    title="PDF to PDF/A"
                    description="Drag & drop your PDF here to convert to archival format"
                    onFilesSelected={handleFileSelected}
                    maxFiles={1}
                    accept={{ "application/pdf": [".pdf"] }}
                />
            </div>
        );
    }

    return (
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
                                        <Archive className="h-5 w-5 text-[#4383BF]" />
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
                                <div className="w-24 h-24 bg-[#4383BF]/10 rounded-2xl flex items-center justify-center mb-6">
                                    <Archive className="h-12 w-12 text-[#4383BF]" />
                                </div>
                                <h3 className="text-xl font-bold text-[#111418] mb-2">{fileInfo.file.name}</h3>
                                <p className="text-[#617289] text-sm mb-4">{fileInfo.size} • Ready to convert</p>

                                {/* Status Indicator */}
                                <div className="bg-[#f6f7f8] rounded-xl px-6 py-4 text-center">
                                    <div className="flex items-center gap-2 justify-center text-[#4383BF]">
                                        <Archive className="h-5 w-5" />
                                        <span className="font-bold">File uploaded successfully</span>
                                    </div>
                                    <p className="text-sm text-[#617289] mt-1">Ready to convert to PDF/A</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Sidebar - Desktop */}
                    <div className="hidden lg:block lg:w-[424px] lg:fixed lg:right-4 lg:top-20 lg:bottom-4 lg:z-10">
                        <div className="bg-white rounded-3xl border border-[#e2e8f0] p-6 h-full flex flex-col shadow-xl">
                            {/* Header */}
                            <div className="flex items-center gap-2 pb-4 border-b border-[#e2e8f0] mb-6">
                                <Settings className="h-5 w-5 text-[#111418]" />
                                <h2 className="text-[#111418] font-bold text-lg">PDF to PDF/A</h2>
                            </div>

                            {/* Content */}
                            <div className="flex-1 space-y-6 overflow-y-auto">
                                {/* Info Box */}
                                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-4">
                                    <p className="text-sm text-blue-800 leading-relaxed">
                                        PDF/A is an ISO-standardized version of the Portable Document Format (PDF) specialized for use in the archiving and long-term preservation of electronic documents.
                                    </p>
                                    <p className="text-sm text-blue-700 mt-3">
                                        Choose with what conformance level you want to convert your document:
                                    </p>
                                </div>

                                {/* Conformance Level Dropdown */}
                                <div>
                                    <label className="text-[#617289] font-bold text-xs uppercase tracking-wider mb-3 block">
                                        Set the PDF/A conformance level
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

                                {/* Selected Level Info */}
                                {selectedLevel && (
                                    <div className="bg-[#f6f7f8] rounded-xl p-4">
                                        <p className="text-xs text-[#617289] mb-3">{selectedLevel.desc}</p>
                                        <ul className="space-y-2">
                                            {selectedLevel.features.map((feature, idx) => (
                                                <li key={idx} className="flex items-start gap-2 text-xs text-[#4383BF]">
                                                    <span className="text-[#4383BF] mt-0.5">•</span>
                                                    <span>{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Allow Downgrade Checkbox */}
                                <div
                                    onClick={() => setAllowDowngrade(!allowDowngrade)}
                                    className="flex items-start gap-3 p-4 bg-[#f8f9fa] rounded-xl cursor-pointer hover:bg-gray-100 transition-colors"
                                >
                                    <div className="mt-0.5">
                                        {allowDowngrade ? (
                                            <CheckSquare className="w-5 h-5 text-[#4383BF]" />
                                        ) : (
                                            <Square className="w-5 h-5 text-gray-400" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-[#111418]">Allow Downgrade of PDF/A Compliance Level</p>
                                        <p className="text-xs text-[#617289] mt-1">
                                            In order to convert to PDF/A, when certain elements are found in the original PDF, it's possible that a conformance downgrade is needed to be able to perform the conversion.
                                        </p>
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
                                            PDF/A-2b is recommended for most archiving needs as it balances compatibility with modern features.
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

                    {/* Mobile Options Panel */}
                    <div className="lg:hidden bg-white rounded-xl border border-[#e2e8f0] shadow-sm p-6 space-y-6 mb-24">
                        {/* Info Box */}
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-4">
                            <p className="text-sm text-blue-800 leading-relaxed">
                                PDF/A is an ISO-standardized version for archiving and long-term preservation.
                            </p>
                        </div>

                        {/* Conformance Level Dropdown */}
                        <div>
                            <label className="text-[#617289] font-bold text-xs uppercase tracking-wider mb-3 block">
                                PDF/A conformance level
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
                                                        ? "bg-[#E42527]/10 text-[#E42527] font-medium"
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
                            className="flex items-start gap-3 p-4 bg-[#f8f9fa] rounded-xl cursor-pointer"
                        >
                            <div className="mt-0.5">
                                {allowDowngrade ? (
                                    <CheckSquare className="w-5 h-5 text-[#4383BF]" />
                                ) : (
                                    <Square className="w-5 h-5 text-gray-400" />
                                )}
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-bold text-[#111418]">Allow Downgrade</p>
                                <p className="text-xs text-[#617289] mt-1">
                                    Allow conformance level downgrade if needed for conversion.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Mobile Convert Button */}
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
    );
}
