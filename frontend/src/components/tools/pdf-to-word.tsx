"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { saveAs } from "file-saver";
import FileUploadHero from "../ui/file-upload-hero";
import { Button } from "../ui/button";
import { ArrowRight, FileText, X } from "lucide-react";
import { pdfApi } from "@/lib/services/pdf-api";
import { api } from "@/lib/services/api";
import { toast } from "@/lib/hooks/use-toast";

interface PagePreview {
    pageNumber: number;
    image: string;
    width: number;
    height: number;
}

export function PdfToWordTool() {
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [pagePreview, setPagePreview] = useState<string>("");
    const [useOcr, setUseOcr] = useState(false);
    const [language, setLanguage] = useState("eng");
    const fileRef = useRef<File | null>(null);

    // Keep ref in sync with state for event handlers
    useEffect(() => {
        fileRef.current = file;
    }, [file]);

    // Warn user before leaving page if file is uploaded
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (fileRef.current) {
                e.preventDefault();
                e.returnValue = '';
                return '';
            }
        };

        // Handle browser back/forward button
        const handlePopState = (e: PopStateEvent) => {
            if (fileRef.current) {
                const confirmLeave = window.confirm(
                    'You have an uploaded PDF that hasn\'t been converted yet. Are you sure you want to leave this page?'
                );
                if (!confirmLeave) {
                    // Push state back to prevent navigation
                    window.history.pushState(null, '', window.location.href);
                }
            }
        };

        // Push initial state so we can intercept back button
        window.history.pushState(null, '', window.location.href);

        window.addEventListener('beforeunload', handleBeforeUnload);
        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.removeEventListener('popstate', handlePopState);
        };
    }, []);

    const handleFileSelected = async (files: File[]) => {
        if (files.length > 0) {
            const selectedFile = files[0];
            setFile(selectedFile);
            await loadPdfPreview(selectedFile);
        }
    };

    const loadPdfPreview = async (file: File) => {
        setLoadingPreview(true);
        try {
            const result = await api.getPdfPagePreviews(file);
            if (result && result.previews && result.previews.length > 0) {
                setPagePreview(result.previews[0].image);
            }
        } catch (error) {
            console.error("Error loading PDF preview", error);
        } finally {
            setLoadingPreview(false);
        }
    };

    const convertToWord = async () => {
        if (!file) return;
        setIsProcessing(true);

        try {
            const result = await pdfApi.pdfToWord(file, { useOcr, language });
            saveAs(result.blob, result.fileName);

            toast.show({
                title: "Success",
                message: "PDF converted to Word successfully!",
                variant: "success",
                position: "top-right",
            });
        } catch (error: any) {
            console.error("Error converting PDF to Word:", error);
            toast.show({
                title: "Conversion Failed",
                message: error?.message || "Failed to convert PDF to Word. Please try again.",
                variant: "error",
                position: "top-right",
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRemoveFile = () => {
        setFile(null);
        setPagePreview("");
        setUseOcr(false);
        setLanguage("eng");
    };

    if (!file) {
        return (
            <div className="min-h-[calc(100vh-120px)] flex items-center justify-center">
                <FileUploadHero
                    title="PDF to Word"
                    onFilesSelected={handleFileSelected}
                    maxFiles={1}
                    accept={{ "application/pdf": [".pdf"] }}
                />
            </div>
        );
    }

    return (
        <div className="bg-[#f6f7f8] min-h-screen relative pb-24 lg:pb-8">
            <div className="max-w-[1800px] mx-auto px-4 py-4 md:py-8">
                <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
                    {/* Left Column - PDF Preview */}
                    <div className="flex-1 max-w-full lg:max-w-[calc(100%-448px)] lg:mr-[448px]">
                        {/* Header */}
                        <div className="mb-4 md:mb-6">
                            <h1 className="text-[#111418] text-2xl md:text-3xl lg:text-[32px] font-bold leading-8 md:leading-10 mb-2" style={{letterSpacing: '-0.8px'}}>
                                PDF to Word
                            </h1>
                        </div>

                        {/* PDF Preview Area */}
                        <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden h-[calc(100vh-180px)] flex flex-col">
                            {/* Remove Button */}
                            <div className="border-b border-[#e2e8f0] px-4 py-3 flex items-center justify-between bg-[#f8f9fa] flex-shrink-0">
                                <span className="text-[#617289] text-sm font-medium">Preview</span>
                                <button
                                    onClick={handleRemoveFile}
                                    className="p-1.5 rounded-lg hover:bg-red-50 transition-colors group"
                                    title="Remove file"
                                >
                                    <X className="h-5 w-5 text-[#617289] group-hover:text-red-600" />
                                </button>
                            </div>

                            {/* Preview Content */}
                            <div className="flex-1 overflow-y-auto p-4 flex items-start justify-center">
                                {loadingPreview ? (
                                    <div className="flex flex-col items-center gap-4 p-8 w-full">
                                        <div className="w-16 h-16 border-4 border-[#4383BF] border-t-transparent rounded-full animate-spin"></div>
                                        <p className="text-[#617289] font-medium">Loading PDF preview...</p>
                                    </div>
                                ) : pagePreview ? (
                                    <div className="w-full max-w-2xl flex flex-col items-center gap-3 pt-4 pb-4">
                                        <img 
                                            src={pagePreview} 
                                            alt="PDF Preview" 
                                            className="w-full h-auto rounded-lg shadow-sm"
                                        />
                                        <p className="text-[#617289] text-sm font-medium">{file.name}</p>
                                    </div>
                                ) : (
                                    <div className="text-center p-8">
                                        <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                                        <p className="text-[#617289] font-medium">No preview available</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Mobile Action Bar */}
                    <div className="lg:hidden fixed bottom-4 left-4 right-4 z-40">
                        <Button
                            onClick={convertToWord}
                            disabled={isProcessing}
                            className="w-full h-14 bg-[#4383BF] hover:bg-[#3470A0] text-white rounded-xl flex items-center justify-center gap-2 font-bold text-sm shadow-lg disabled:opacity-50"
                        >
                            <span>{isProcessing ? 'Converting...' : 'Convert to Word'}</span>
                            <ArrowRight className="h-5 w-5" />
                        </Button>
                    </div>

                    {/* Right Sidebar - Configuration (Desktop only) */}
                    <div className="hidden lg:block lg:w-[424px] lg:fixed lg:right-4 lg:top-24 lg:h-[calc(100vh-120px)] lg:z-10">
                        <div className="bg-white rounded-3xl border border-[#e2e8f0] p-6 h-full flex flex-col shadow-xl">
                            {/* Header */}
                            <div className="mb-6">
                                <h2 className="text-[#111418] font-bold text-lg leading-7">Configuration</h2>
                                <p className="text-[#617289] text-sm leading-5 mt-1">Customize your conversion settings.</p>
                            </div>

                            {/* OCR Toggle */}
                            <div className="bg-[#f6f7f8] rounded-xl border border-[#dbe0e6] p-4 mb-6">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-start gap-2">
                                        <svg className="w-5 h-5 text-[#136dec] mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <div>
                                            <h3 className="text-[#111418] font-bold text-base">Use OCR?</h3>
                                            <p className="text-[#617289] text-xs font-medium mt-0.5">For Scanned Documents</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setUseOcr(!useOcr)}
                                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                                            useOcr ? 'bg-[#4383BF]' : 'bg-gray-300'
                                        }`}
                                    >
                                        <span
                                            className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform ${
                                                useOcr ? 'translate-x-6' : 'translate-x-0.5'
                                            }`}
                                        />
                                    </button>
                                </div>

                                {/* Language Selector */}
                                <div className="rounded-lg border border-[#e5e7eb] p-3">
                                    <label className="text-[#617289] font-bold text-xs tracking-wider uppercase block mb-2">
                                        Document Language
                                    </label>
                                    <select
                                        value={language}
                                        onChange={(e) => setLanguage(e.target.value)}
                                        disabled={!useOcr}
                                        className="w-full bg-transparent text-[#111418] text-sm focus:outline-none disabled:opacity-50 cursor-pointer"
                                    >
                                        <option value="eng">English</option>
                                        <option value="spa">Spanish</option>
                                        <option value="fra">French</option>
                                        <option value="deu">German</option>
                                        <option value="ita">Italian</option>
                                        <option value="por">Portuguese</option>
                                        <option value="rus">Russian</option>
                                        <option value="chi_sim">Chinese (Simplified)</option>
                                        <option value="jpn">Japanese</option>
                                        <option value="kor">Korean</option>
                                    </select>
                                </div>
                            </div>

                            {/* Spacer */}
                            <div className="flex-1"></div>

                            {/* Convert Button - Fixed at bottom */}
                            <div className="mt-auto">
                                <Button
                                    onClick={convertToWord}
                                    disabled={isProcessing}
                                    className="w-full h-[60px] bg-[#136dec] hover:bg-blue-700 text-white rounded-xl flex items-center justify-center gap-2 font-bold text-lg shadow-lg disabled:opacity-50"
                                >
                                    <span>{isProcessing ? "Converting..." : "Convert to Word"}</span>
                                    <ArrowRight className="h-6 w-6" />
                                </Button>
                                {isProcessing && (
                                    <div className="text-center mt-3">
                                        <div className="flex items-center justify-center gap-2">
                                            <svg className="w-4 h-4 text-[#94a3b8] animate-spin" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            <span className="text-[#617289] text-xs italic">
                                                Converting to Word...
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
