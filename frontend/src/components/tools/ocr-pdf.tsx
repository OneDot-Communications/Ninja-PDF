"use client";

import { useState } from "react";
import FileUploadHero from "../ui/file-upload-hero";
import { Button } from "../ui/button";
import { Download, Settings, Plus, Check } from "lucide-react";
import { PasswordProtectedModal } from "../ui/password-protected-modal";
import { saveAs } from "file-saver";
import { cn, isPasswordError } from "@/lib/utils";
import { pdfStrategyManager } from "@/lib/services/pdf-service";
import { toast } from "@/lib/hooks/use-toast";

const LANGUAGES = [
    { code: "eng", name: "English" },
    { code: "spa", name: "Spanish" },
    { code: "fra", name: "French" },
    { code: "deu", name: "German" },
    { code: "ita", name: "Italian" },
    { code: "por", name: "Portuguese" },
    { code: "rus", name: "Russian" },
    { code: "chi_sim", name: "Chinese (Simplified)" },
    { code: "jpn", name: "Japanese" },
];

export function OcrPdfTool() {
    const [files, setFiles] = useState<File[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [activeView, setActiveView] = useState<"file" | "page">("file");
    const [outputType, setOutputType] = useState<"searchable" | "text">("searchable");
    const [selectedLang, setSelectedLang] = useState("eng");
    const [cleanUp, setCleanUp] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);

    const handleFilesSelected = (newFiles: File[]) => {
        setFiles((prev) => [...prev, ...newFiles]);
    };

    const removeFile = (index: number) => {
        setFiles(files.filter((_, i) => i !== index));
    };

    const clearAll = () => {
        setFiles([]);
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
        return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    };

    const processOcr = async () => {
        if (files.length === 0) return;
        setIsProcessing(true);

        try {
            const result = await pdfStrategyManager.execute('ocr', files, {
                lang: selectedLang,
                outputType: outputType,
                cleanUp: cleanUp,
                onProgress: (m: any) => {
                    if (m.status === 'recognizing text') {
                        toast.show({
                            title: "Processing",
                            message: `Recognizing text... ${Math.round(m.progress * 100)}%`,
                            variant: "default",
                            position: "top-right",
                        });
                    }
                }
            });

            const fileName = outputType === "searchable"
                ? `ocr-${files[0].name.replace(/\.[^/.]+$/, "")}.pdf`
                : `ocr-${files[0].name.replace(/\.[^/.]+$/, "")}.txt`;

            saveAs(result.blob, fileName);

            toast.show({
                title: "Success",
                message: "OCR processing completed successfully!",
                variant: "success",
                position: "top-right",
            });
        } catch (error: any) {
            console.error("OCR Error:", error);

            if (isPasswordError(error)) {
                setShowPasswordModal(true);
                setIsProcessing(false);
                return;
            }

            toast.show({
                title: "Error",
                message: error.message || "Failed to process OCR. Please try again.",
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
                        title="OCR PDF"
                        onFilesSelected={handleFilesSelected}
                        maxFiles={10}
                        accept={{ "application/pdf": [".pdf"], "image/png": [".png"], "image/jpeg": [".jpg", ".jpeg"] }}
                    />
                </div>
                <PasswordProtectedModal
                    isOpen={showPasswordModal}
                    onClose={() => setShowPasswordModal(false)}
                    toolName="ocr"
                />
            </>
        );
    }

    return (
        <>
            <div className="bg-[#f6f7f8] min-h-screen pb-8">
                <div className="max-w-[1800px] mx-auto px-4 py-4">
                    <div className="flex flex-col lg:flex-row gap-6">
                        {/* Left Column - Files Grid */}
                        <div className="flex-1 lg:max-w-[calc(100%-448px)]">
                            {/* Top Toolbar */}
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6 p-4">
                                <div className="flex items-center justify-between">
                                    {/* View Tabs */}
                                    <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                                        <button
                                            onClick={() => setActiveView("file")}
                                            className={cn(
                                                "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                                                activeView === "file"
                                                    ? "bg-white text-gray-900 shadow-sm"
                                                    : "text-gray-600 hover:text-gray-900"
                                            )}
                                        >
                                            File View
                                        </button>
                                        <button
                                            onClick={() => setActiveView("page")}
                                            className={cn(
                                                "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                                                activeView === "page"
                                                    ? "bg-white text-gray-900 shadow-sm"
                                                    : "text-gray-600 hover:text-gray-900"
                                            )}
                                        >
                                            Page View
                                        </button>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-3">
                                        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                            </svg>
                                        </button>
                                        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={clearAll}
                                            className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                        >
                                            Clear All
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Files Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {files.map((file, index) => (
                                    <div
                                        key={index}
                                        className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                                    >
                                        {/* File Preview */}
                                        <div className="relative bg-gray-100 h-48 flex items-center justify-center">
                                            <div className="absolute top-2 left-2 bg-gray-800 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                                                {index + 1}
                                            </div>
                                            <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                        </div>
                                        {/* File Info */}
                                        <div className="p-3">
                                            <h3 className="text-sm font-medium text-gray-900 truncate" title={file.name}>
                                                {file.name}
                                            </h3>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {formatFileSize(file.size)}
                                            </p>
                                        </div>
                                    </div>
                                ))}

                                {/* Add More Files Card */}
                                <label className="bg-white rounded-xl border-2 border-dashed border-blue-300 hover:border-blue-500 cursor-pointer overflow-hidden group transition-colors">
                                    <input
                                        type="file"
                                        multiple
                                        accept=".pdf,.png,.jpg,.jpeg"
                                        onChange={(e) => {
                                            if (e.target.files) {
                                                handleFilesSelected(Array.from(e.target.files));
                                            }
                                        }}
                                        className="hidden"
                                    />
                                    <div className="h-48 flex flex-col items-center justify-center text-blue-600 group-hover:text-blue-700">
                                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                                            <Plus className="w-6 h-6" />
                                        </div>
                                        <p className="text-sm font-medium">Add more files</p>
                                        <p className="text-xs text-gray-500 mt-1">or drag & drop here</p>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Right Sidebar - Sticky Full Height Card */}
                        <div className="hidden lg:block w-[424px] fixed right-4 top-24 bottom-4 z-10">
                            <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xl h-full flex flex-col">
                                {/* Header */}
                                <div className="flex items-center justify-between mb-6 flex-shrink-0">
                                    <div>
                                        <h2 className="text-lg font-bold text-gray-900">Configuration</h2>
                                    </div>
                                    <button className="p-2 hover:bg-gray-100 rounded-lg">
                                        <Settings className="w-5 h-5 text-gray-600" />
                                    </button>
                                </div>

                                {/* Scrollable Content */}
                                <div className="flex-1 overflow-y-auto pr-2 mb-6">
                                    {/* Output Type Section */}
                                    <div className="mb-6">
                                        <label className="text-sm font-medium text-gray-700 block mb-3">How do you want it?</label>

                                        {/* Searchable PDF Option */}
                                        <div
                                            onClick={() => setOutputType("searchable")}
                                            className={cn(
                                                "border-2 rounded-xl p-4 mb-3 cursor-pointer transition-all",
                                                outputType === "searchable"
                                                    ? "border-blue-500 bg-blue-50"
                                                    : "border-gray-200 hover:border-gray-300"
                                            )}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <h3 className="text-sm font-semibold text-gray-900 mb-1">Searchable PDF</h3>
                                                    <p className="text-xs text-gray-600">Image over text. Keeps formatting.</p>
                                                </div>
                                                {outputType === "searchable" && (
                                                    <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 ml-2">
                                                        <Check className="w-3 h-3 text-white" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Pure Text Option */}
                                        <div
                                            onClick={() => setOutputType("text")}
                                            className={cn(
                                                "border-2 rounded-xl p-4 cursor-pointer transition-all",
                                                outputType === "text"
                                                    ? "border-blue-500 bg-blue-50"
                                                    : "border-gray-200 hover:border-gray-300"
                                            )}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <h3 className="text-sm font-semibold text-gray-900 mb-1">Pure Text (.txt)</h3>
                                                    <p className="text-xs text-gray-600">Just the raw words. No styling.</p>
                                                </div>
                                                {outputType === "text" && (
                                                    <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 ml-2">
                                                        <Check className="w-3 h-3 text-white" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Document Language */}
                                    <div className="mb-6">
                                        <label className="text-sm font-medium text-gray-700 block mb-2">Document Language</label>
                                        <select
                                            value={selectedLang}
                                            onChange={(e) => setSelectedLang(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none"
                                            style={{
                                                backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23666' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                                                backgroundRepeat: 'no-repeat',
                                                backgroundPosition: 'right 12px center',
                                                paddingRight: '36px'
                                            }}
                                        >
                                            {LANGUAGES.map((lang) => (
                                                <option key={lang.code} value={lang.code}>
                                                    {lang.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Clean up Toggle */}
                                    <div className="mb-8">
                                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                            <div>
                                                <h3 className="text-sm font-medium text-gray-900">Clean up?</h3>
                                                <p className="text-xs text-gray-500">Auto-rotate & deskew pages</p>
                                            </div>
                                            <button
                                                onClick={() => setCleanUp(!cleanUp)}
                                                className={cn(
                                                    "w-11 h-6 rounded-full transition-colors relative",
                                                    cleanUp ? "bg-blue-600" : "bg-gray-300"
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-4 h-4 bg-white rounded-full shadow-sm absolute top-1 transition-transform",
                                                    cleanUp ? "left-6" : "left-1"
                                                )} />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Download Button - Fixed at bottom */}
                                <div className="mt-auto pt-4 flex-shrink-0">
                                    <button
                                        onClick={processOcr}
                                        disabled={isProcessing || files.length === 0}
                                        className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-blue-500/20 mb-3"
                                    >
                                        <Download className="h-5 w-5" />
                                        {isProcessing ? "Processing..." : "Download Document"}
                                    </button>

                                    {/* Footer */}
                                    <div className="text-center text-xs text-gray-500">
                                        Don't worry, we didn't make you dizzy.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Copyright */}
                    <div className="text-center text-xs text-gray-500 mt-8">
                        Â© 2023 Iâ¤ï¸Blue PDF. All rights reserved.
                    </div>
                </div>
            </div>
            <PasswordProtectedModal
                isOpen={showPasswordModal}
                onClose={() => setShowPasswordModal(false)}
                toolName="ocr"
            />
        </>
    );
}
