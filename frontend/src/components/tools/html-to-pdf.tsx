"use client";

import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/services/api";
import {
    Globe,
    Settings,
    FileText,
    Info,
    Download,
    Loader2,
    Check,
    AlertCircle,
    ExternalLink,
    ChevronDown,
    Upload,
    File,
    X
} from "lucide-react";

interface GeneratedPdf {
    blob: Blob;
    url: string;
    filename: string;
}

export function HtmlToPdfTool() {
    // Input mode: 'url' or 'file'
    const [inputMode, setInputMode] = useState<'url' | 'file'>('url');
    
    // URL input state
    const [url, setUrl] = useState("");
    const [urlError, setUrlError] = useState("");
    const [isValidUrl, setIsValidUrl] = useState(false);

    // File input state
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Conversion state
    const [isConverting, setIsConverting] = useState(false);
    const [conversionProgress, setConversionProgress] = useState("");
    const [conversionError, setConversionError] = useState("");
    const [generatedPdf, setGeneratedPdf] = useState<GeneratedPdf | null>(null);

    // Configuration state
    const [pageSize, setPageSize] = useState("A4");
    const [orientation, setOrientation] = useState("Portrait");
    const [margins, setMargins] = useState("Normal");
    const [outputFilename, setOutputFilename] = useState("converted");

    // Rendering options
    const [includeBackground, setIncludeBackground] = useState(true);
    const [enableJavascript, setEnableJavascript] = useState(true);

    // Dropdown open states
    const [sizeDropdownOpen, setSizeDropdownOpen] = useState(false);
    const [marginsDropdownOpen, setMarginsDropdownOpen] = useState(false);
    const [printMedia, setPrintMedia] = useState(false);

    // URL validation
    const validateUrl = (inputUrl: string): boolean => {
        if (!inputUrl.trim()) {
            setUrlError("");
            setIsValidUrl(false);
            return false;
        }

        try {
            const urlObj = new URL(inputUrl);
            if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
                setUrlError("URL must start with http:// or https://");
                setIsValidUrl(false);
                return false;
            }
            setUrlError("");
            setIsValidUrl(true);
            return true;
        } catch {
            setUrlError("Please enter a valid URL");
            setIsValidUrl(false);
            return false;
        }
    };

    const handleUrlChange = (value: string) => {
        setUrl(value);
        validateUrl(value);
        setGeneratedPdf(null);
        setConversionError("");
    };

    // File handling
    const handleFileSelect = (file: File) => {
        const validTypes = ['text/html', 'application/xhtml+xml'];
        const validExtensions = ['.html', '.htm', '.xhtml'];
        
        const hasValidExtension = validExtensions.some(ext => 
            file.name.toLowerCase().endsWith(ext)
        );
        
        if (!validTypes.includes(file.type) && !hasValidExtension) {
            setConversionError("Please upload an HTML file (.html, .htm)");
            return;
        }
        
        setUploadedFile(file);
        setConversionError("");
        setGeneratedPdf(null);
        
        // Set output filename based on uploaded file
        const baseName = file.name.replace(/\.[^/.]+$/, "");
        setOutputFilename(baseName);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const removeFile = () => {
        setUploadedFile(null);
        setGeneratedPdf(null);
        setConversionError("");
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const switchInputMode = (mode: 'url' | 'file') => {
        setInputMode(mode);
        setGeneratedPdf(null);
        setConversionError("");
        setConversionProgress("");
    };

    // Get page dimensions
    const getPageDimensions = () => {
        const sizes: { [key: string]: { width: number; height: number } } = {
            "A4": { width: 595.28, height: 841.89 },
            "Letter": { width: 612, height: 792 },
            "Legal": { width: 612, height: 1008 },
            "A3": { width: 841.89, height: 1190.55 },
            "A5": { width: 419.53, height: 595.28 }
        };
        const size = sizes[pageSize] || sizes["A4"];
        return orientation === "Landscape"
            ? { width: size.height, height: size.width }
            : size;
    };

    const getMarginValues = () => {
        const marginMap: { [key: string]: number } = {
            "None": 0,
            "Minimal": 20,
            "Normal": 40,
            "Wide": 60
        };
        return marginMap[margins] || 40;
    };

    // Convert to PDF - handles both URL and file modes
    const convertToPdf = async () => {
        // File mode - use backend Gotenberg API
        if (inputMode === 'file') {
            if (!uploadedFile) {
                setConversionError("Please upload an HTML file");
                return;
            }

            setIsConverting(true);
            setConversionProgress("Uploading file to server...");
            setConversionError("");

            try {
                setConversionProgress("Converting HTML to PDF...");
                
                const pdfBlob = await api.htmlToPdf(uploadedFile);
                
                setConversionProgress("Finalizing PDF...");

                setGeneratedPdf({
                    blob: pdfBlob,
                    url: URL.createObjectURL(pdfBlob),
                    filename: `${outputFilename || 'converted'}.pdf`
                });

                setConversionProgress("Conversion complete!");

            } catch (error: any) {
                console.error("Conversion failed:", error);
                setConversionError(error.message || "Failed to convert HTML to PDF");
                setGeneratedPdf(null);
            } finally {
                setIsConverting(false);
            }
            return;
        }

        // URL mode - use Gotenberg via backend API
        if (!isValidUrl || !url.trim()) {
            setConversionError("Please enter a valid URL");
            return;
        }

        setIsConverting(true);
        setConversionProgress("Connecting to PDF service...");
        setConversionError("");

        try {
            setConversionProgress("Rendering webpage to PDF...");

            // Use Gotenberg via backend API for high-quality conversion
            const pdfBlob = await api.urlToPdf(url, {
                pageSize: pageSize,
                orientation: orientation.toLowerCase(),
                margins: margins.toLowerCase(),
                printBackground: includeBackground,
                emulateMedia: printMedia ? 'print' : 'screen'
            });

            setConversionProgress("Finalizing PDF...");

            setGeneratedPdf({
                blob: pdfBlob,
                url: URL.createObjectURL(pdfBlob),
                filename: `${outputFilename || 'converted'}.pdf`
            });

            setConversionProgress("Conversion complete!");

        } catch (error: any) {
            console.error("Conversion failed:", error);

            // Provide helpful error message
            let errorMessage = "Conversion failed. ";
            if (error.message.includes('fetch') || error.message.includes('network')) {
                errorMessage += "Network error. Please check your connection.";
            } else if (error.message.includes('CORS')) {
                errorMessage += "This URL cannot be accessed due to security restrictions.";
            } else {
                errorMessage += error.message || "Please try again.";
            }

            setConversionError(errorMessage);
            setGeneratedPdf(null);
        } finally {
            setIsConverting(false);
        }
    };

    const downloadPdf = () => {
        if (!generatedPdf) return;
        const link = document.createElement('a');
        link.href = generatedPdf.url;
        link.download = generatedPdf.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const resetConversion = () => {
        setGeneratedPdf(null);
        setConversionProgress("");
        setConversionError("");
    };

    // Toggle Switch Component
    const ToggleSwitch = ({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) => (
        <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">{label}</span>
            <button
                onClick={() => { onChange(!checked); resetConversion(); }}
                className={cn(
                    "relative w-11 h-6 rounded-full transition-colors",
                    checked ? "bg-[#4383BF]" : "bg-gray-300"
                )}
            >
                <span className={cn(
                    "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow",
                    checked && "translate-x-5"
                )} />
            </button>
        </div>
    );

    // Determine if convert button should be enabled
    const canConvert = inputMode === 'file' 
        ? (uploadedFile !== null && !isConverting)
        : (isValidUrl && url.trim().length > 0 && !isConverting);

    return (
        <div className="bg-[#f6f7f8] min-h-screen pb-8">
            <div className="max-w-[1800px] mx-auto px-4 py-4">
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Left Column - Input Selection */}
                    <div className="flex-1 lg:max-w-[calc(100%-448px)]">
                        {/* Mode Toggle */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-4">
                            <div className="flex gap-2">
                                <button
                                    onClick={() => switchInputMode('url')}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all",
                                        inputMode === 'url'
                                            ? "bg-[#4383BF] text-white shadow-md"
                                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                    )}
                                >
                                    <Globe className="w-4 h-4" />
                                    From URL
                                </button>
                                <button
                                    onClick={() => switchInputMode('file')}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all",
                                        inputMode === 'file'
                                            ? "bg-[#4383BF] text-white shadow-md"
                                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                    )}
                                >
                                    <Upload className="w-4 h-4" />
                                    Upload File
                                </button>
                            </div>
                        </div>

                        {/* File Upload Card */}
                        {inputMode === 'file' && (
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-4">
                                {/* Header */}
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-12 h-12 bg-[#4383BF]/10 rounded-xl flex items-center justify-center">
                                        <File className="w-6 h-6 text-[#4383BF]" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-gray-900">Upload HTML File</h2>
                                        <p className="text-sm text-gray-500">Upload an HTML file to convert to PDF</p>
                                    </div>
                                </div>

                                {/* Drop Zone */}
                                {!uploadedFile ? (
                                    <div
                                        onDrop={handleDrop}
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onClick={() => fileInputRef.current?.click()}
                                        className={cn(
                                            "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
                                            isDragging
                                                ? "border-[#4383BF] bg-[#4383BF]/5"
                                                : "border-gray-300 hover:border-[#4383BF] hover:bg-gray-50"
                                        )}
                                    >
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".html,.htm,.xhtml,text/html"
                                            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                                            className="hidden"
                                        />
                                        <Upload className={cn(
                                            "w-12 h-12 mx-auto mb-4",
                                            isDragging ? "text-[#4383BF]" : "text-gray-400"
                                        )} />
                                        <p className="text-lg font-medium text-gray-700 mb-1">
                                            {isDragging ? "Drop your file here" : "Drag & drop your HTML file"}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            or click to browse • Supports .html, .htm files
                                        </p>
                                    </div>
                                ) : (
                                    <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-[#4383BF]/10 rounded-lg flex items-center justify-center">
                                                    <FileText className="w-5 h-5 text-[#4383BF]" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">{uploadedFile.name}</p>
                                                    <p className="text-xs text-gray-500">
                                                        {(uploadedFile.size / 1024).toFixed(1)} KB
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={removeFile}
                                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* URL Input Card */}
                        {inputMode === 'url' && (
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                            {/* Header */}
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 bg-[#4383BF]/10 rounded-xl flex items-center justify-center">
                                    <Globe className="w-6 h-6 text-[#4383BF]" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900">Webpage URL</h2>
                                    <p className="text-sm text-gray-500">Enter the URL of the webpage you want to convert</p>
                                </div>
                            </div>

                            {/* URL Input Field */}
                            <div className="space-y-3">
                                <label className="block text-sm font-medium text-gray-700">
                                    Website URL
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Globe className="w-5 h-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="url"
                                        value={url}
                                        onChange={(e) => handleUrlChange(e.target.value)}
                                        placeholder="https://example.com"
                                        className={cn(
                                            "w-full pl-12 pr-12 py-4 text-base border rounded-xl focus:outline-none focus:ring-2 transition-colors",
                                            urlError
                                                ? "border-red-300 focus:ring-red-200 bg-red-50"
                                                : isValidUrl
                                                    ? "border-green-300 focus:ring-green-200 bg-green-50"
                                                    : "border-gray-200 focus:ring-[#4383BF] bg-gray-50"
                                        )}
                                    />
                                    {/* Status Icon */}
                                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                                        {urlError && <AlertCircle className="w-5 h-5 text-red-500" />}
                                        {isValidUrl && !urlError && <Check className="w-5 h-5 text-green-500" />}
                                    </div>
                                </div>

                                {/* Error Message */}
                                {urlError && (
                                    <p className="text-sm text-red-600 flex items-center gap-1">
                                        <AlertCircle className="w-4 h-4" />
                                        {urlError}
                                    </p>
                                )}

                                {/* Helper Text */}
                                <p className="text-sm text-gray-500">
                                    Paste the link of the webpage you want to convert to PDF.
                                </p>
                            </div>

                            {/* URL Preview (when valid) */}
                            {isValidUrl && url && (
                                <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-[#4383BF]/10 rounded-lg flex items-center justify-center">
                                                <FileText className="w-5 h-5 text-[#4383BF]" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate max-w-md">
                                                    {new URL(url).hostname}
                                                </p>
                                                <p className="text-xs text-gray-500 truncate max-w-md">
                                                    {url}
                                                </p>
                                            </div>
                                        </div>
                                        <a
                                            href={url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-sm text-[#4383BF] hover:underline"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                            Preview
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>
                        )}

                        {/* Conversion Error - shown for both modes */}
                        {conversionError && (
                            <div className="mt-4 p-4 bg-red-50 rounded-xl border border-red-200">
                                <div className="flex items-center gap-2 text-red-700">
                                    <AlertCircle className="w-5 h-5" />
                                    <p className="text-sm font-medium">{conversionError}</p>
                                </div>
                            </div>
                        )}

                        {/* Info Card */}
                        <div className="mt-4 bg-blue-50 rounded-xl border border-blue-200 p-4">
                            <div className="flex items-start gap-3">
                                <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                                <div>
                                    <h3 className="text-sm font-medium text-blue-900">How it works</h3>
                                    <ul className="mt-2 text-sm text-blue-700 space-y-1">
                                        {inputMode === 'file' ? (
                                            <>
                                                <li>• Upload an HTML file (.html, .htm)</li>
                                                <li>• Click "Convert to PDF" to generate</li>
                                                <li>• Download your PDF document</li>
                                            </>
                                        ) : (
                                            <>
                                                <li>• Enter any public webpage URL</li>
                                                <li>• Configure page settings on the right</li>
                                                <li>• Click "Convert to PDF" to generate</li>
                                                <li>• Download your PDF document</li>
                                            </>
                                        )}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Configuration Panel */}
                    <div className="lg:w-[420px] lg:flex-shrink-0">
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm lg:sticky lg:top-4 lg:max-h-[calc(100vh-32px)] lg:overflow-y-auto">
                            {/* Panel Header */}
                            <div className="p-5 border-b border-gray-100">
                                <div className="flex items-center gap-2">
                                    <Settings className="w-5 h-5 text-gray-600" />
                                    <h2 className="text-lg font-semibold text-gray-900">Conversion Settings</h2>
                                </div>
                            </div>

                            <div className="p-5 pb-24 lg:pb-5 space-y-5">
                                {/* Page Settings */}
                                <div className="bg-white rounded-xl border border-gray-200 p-4">
                                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Page Settings</h3>
                                    <div className="space-y-3">
                                        {/* Size - Custom Dropdown */}
                                        <div className="relative">
                                            <label className="block text-sm text-gray-600 mb-1.5">Size</label>
                                            <button
                                                onClick={() => { setSizeDropdownOpen(!sizeDropdownOpen); setMarginsDropdownOpen(false); }}
                                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white hover:border-[#4383BF]/50 focus:outline-none focus:ring-2 focus:ring-[#4383BF]/20 focus:border-[#4383BF] transition-all flex items-center justify-between"
                                            >
                                                <span className="font-medium text-gray-900">{pageSize}</span>
                                                <ChevronDown className={cn(
                                                    "w-4 h-4 text-gray-500 transition-transform duration-200",
                                                    sizeDropdownOpen && "rotate-180"
                                                )} />
                                            </button>
                                            {sizeDropdownOpen && (
                                                <div className="absolute z-20 w-full mt-1.5 bg-white rounded-xl border border-gray-200 shadow-lg shadow-gray-200/50 py-1 animate-in fade-in slide-in-from-top-1 duration-150">
                                                    {["A4", "Letter", "Legal", "A3", "A5"].map((size) => (
                                                        <button
                                                            key={size}
                                                            onClick={() => {
                                                                setPageSize(size);
                                                                setSizeDropdownOpen(false);
                                                                resetConversion();
                                                            }}
                                                            className={cn(
                                                                "w-full px-4 py-2.5 text-sm text-left flex items-center justify-between transition-colors",
                                                                pageSize === size
                                                                    ? "bg-[#4383BF]/10 text-[#4383BF] font-medium"
                                                                    : "text-gray-700 hover:bg-gray-50"
                                                            )}
                                                        >
                                                            {size}
                                                            {pageSize === size && <Check className="w-4 h-4" />}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Orientation */}
                                        <div>
                                            <label className="block text-sm text-gray-600 mb-1.5">Orientation</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {["Portrait", "Landscape"].map((opt) => (
                                                    <button
                                                        key={opt}
                                                        onClick={() => { setOrientation(opt); resetConversion(); }}
                                                        className={cn(
                                                            "px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border",
                                                            orientation === opt
                                                                ? "bg-[#4383BF] text-white border-[#4383BF]"
                                                                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                                                        )}
                                                    >
                                                        {opt}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Margins - Custom Dropdown */}
                                        <div className="relative">
                                            <label className="block text-sm text-gray-600 mb-1.5">Margins</label>
                                            <button
                                                onClick={() => { setMarginsDropdownOpen(!marginsDropdownOpen); setSizeDropdownOpen(false); }}
                                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white hover:border-[#4383BF]/50 focus:outline-none focus:ring-2 focus:ring-[#4383BF]/20 focus:border-[#4383BF] transition-all flex items-center justify-between"
                                            >
                                                <span className="font-medium text-gray-900">{margins}</span>
                                                <ChevronDown className={cn(
                                                    "w-4 h-4 text-gray-500 transition-transform duration-200",
                                                    marginsDropdownOpen && "rotate-180"
                                                )} />
                                            </button>
                                            {marginsDropdownOpen && (
                                                <div className="absolute z-20 w-full mt-1.5 bg-white rounded-xl border border-gray-200 shadow-lg shadow-gray-200/50 py-1 animate-in fade-in slide-in-from-top-1 duration-150">
                                                    {["None", "Minimal", "Normal", "Wide"].map((margin) => (
                                                        <button
                                                            key={margin}
                                                            onClick={() => {
                                                                setMargins(margin);
                                                                setMarginsDropdownOpen(false);
                                                                resetConversion();
                                                            }}
                                                            className={cn(
                                                                "w-full px-4 py-2.5 text-sm text-left flex items-center justify-between transition-colors",
                                                                margins === margin
                                                                    ? "bg-[#4383BF]/10 text-[#4383BF] font-medium"
                                                                    : "text-gray-700 hover:bg-gray-50"
                                                            )}
                                                        >
                                                            {margin}
                                                            {margins === margin && <Check className="w-4 h-4" />}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Rendering Options */}
                                <div className="bg-white rounded-xl border border-gray-200 p-4">
                                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Rendering Options</h3>
                                    <div className="space-y-3">
                                        <ToggleSwitch
                                            checked={includeBackground}
                                            onChange={setIncludeBackground}
                                            label="Include background"
                                        />
                                        <ToggleSwitch
                                            checked={enableJavascript}
                                            onChange={setEnableJavascript}
                                            label="Enable JavaScript"
                                        />
                                        <ToggleSwitch
                                            checked={printMedia}
                                            onChange={setPrintMedia}
                                            label="Print media"
                                        />
                                    </div>
                                </div>

                                {/* About Conversion Info */}
                                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-4">
                                    <div className="flex items-start gap-3">
                                        <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                                        <div>
                                            <h3 className="text-sm font-semibold text-blue-900">About Conversion</h3>
                                            <p className="text-xs text-blue-700 mt-1">
                                                Enter a public webpage URL and click convert. The PDF will preserve the page layout, links, and styling.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Output Filename */}
                                <div className="bg-white rounded-xl border border-gray-200 p-4">
                                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Output Filename</h3>
                                    <input
                                        type="text"
                                        value={outputFilename}
                                        onChange={(e) => { setOutputFilename(e.target.value); resetConversion(); }}
                                        placeholder="converted"
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4383BF] bg-gray-50"
                                    />
                                </div>

                                {/* Summary */}
                                <div className="bg-white rounded-xl border border-gray-200 p-4">
                                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Summary</h3>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-600">URL Status</span>
                                            <span className={cn(
                                                "text-sm font-semibold",
                                                isValidUrl ? "text-green-600" : "text-gray-400"
                                            )}>
                                                {isValidUrl ? "Valid" : "Not entered"}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-600">Page Size</span>
                                            <span className="text-sm font-semibold text-gray-900">{pageSize}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-600">Orientation</span>
                                            <span className="text-sm font-semibold text-gray-900">{orientation}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Convert Button - Hidden on mobile since there's a fixed bottom bar */}
                            <div className="hidden lg:block p-5 pt-0">
                                <div className="pt-4 border-t border-gray-100">
                                    {/* Progress Text */}
                                    {conversionProgress && (
                                        <p className="text-sm text-center text-gray-600 mb-3">{conversionProgress}</p>
                                    )}

                                    {!generatedPdf ? (
                                        <button
                                            onClick={convertToPdf}
                                            disabled={!canConvert}
                                            className="w-full h-14 bg-[#4383BF] hover:bg-[#3A74A8] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-lg rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-[#4383BF]/20"
                                        >
                                            {isConverting ? (
                                                <>
                                                    <Loader2 className="h-5 w-5 animate-spin" />
                                                    Converting...
                                                </>
                                            ) : (
                                                <>
                                                    <FileText className="h-5 w-5" />
                                                    Convert to PDF
                                                </>
                                            )}
                                        </button>
                                    ) : (
                                        <button
                                            onClick={downloadPdf}
                                            className="w-full h-14 bg-green-600 hover:bg-green-700 text-white font-bold text-lg rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg"
                                        >
                                            <Download className="h-5 w-5" />
                                            Download PDF
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Mobile Bottom Bar */}
                    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-40">
                        {conversionProgress && (
                            <p className="text-sm text-center text-gray-600 mb-2">{conversionProgress}</p>
                        )}
                        {!generatedPdf ? (
                            <button
                                onClick={convertToPdf}
                                disabled={!canConvert}
                                className="w-full h-14 bg-[#4383BF] hover:bg-[#3A74A8] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-lg rounded-xl flex items-center justify-center gap-2 transition-colors"
                            >
                                {isConverting ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        Converting...
                                    </>
                                ) : (
                                    <>
                                        <FileText className="h-5 w-5" />
                                        Convert to PDF
                                    </>
                                )}
                            </button>
                        ) : (
                            <button
                                onClick={downloadPdf}
                                className="w-full h-14 bg-green-600 hover:bg-green-700 text-white font-bold text-lg rounded-xl flex items-center justify-center gap-2 transition-colors"
                            >
                                <Download className="h-5 w-5" />
                                Download PDF
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
