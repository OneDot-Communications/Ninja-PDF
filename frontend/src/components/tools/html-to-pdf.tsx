"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
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
    ChevronDown
} from "lucide-react";

interface GeneratedPdf {
    blob: Blob;
    url: string;
    filename: string;
}

export function HtmlToPdfTool() {
    // URL input state
    const [url, setUrl] = useState("");
    const [urlError, setUrlError] = useState("");
    const [isValidUrl, setIsValidUrl] = useState(false);

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

    // Convert URL to PDF using html2pdf.app API service
    const convertToPdf = async () => {
        if (!isValidUrl || !url.trim()) {
            setConversionError("Please enter a valid URL");
            return;
        }

        setIsConverting(true);
        setConversionProgress("Connecting to PDF service...");
        setConversionError("");

        try {
            setConversionProgress("Rendering webpage to PDF...");

            // Use html2pdf.app API (free tier available)
            // This service renders the actual webpage with all styles, icons, and layout
            const apiUrl = 'https://api.html2pdf.app/v1/generate';

            // Build request parameters
            const params = new URLSearchParams({
                url: url,
                apiKey: 'demo', // Demo key for testing - replace with your own for production
                format: pageSize,
                orientation: orientation.toLowerCase(),
                marginTop: margins === 'None' ? '0' : margins === 'Minimal' ? '5mm' : margins === 'Wide' ? '20mm' : '10mm',
                marginBottom: margins === 'None' ? '0' : margins === 'Minimal' ? '5mm' : margins === 'Wide' ? '20mm' : '10mm',
                marginLeft: margins === 'None' ? '0' : margins === 'Minimal' ? '5mm' : margins === 'Wide' ? '20mm' : '10mm',
                marginRight: margins === 'None' ? '0' : margins === 'Minimal' ? '5mm' : margins === 'Wide' ? '20mm' : '10mm',
                printBackground: includeBackground.toString(),
                preferCSSPageSize: 'false',
                javascript: enableJavascript.toString(),
                emulateMedia: printMedia ? 'print' : 'screen'
            });

            // Make API request
            const response = await fetch(`${apiUrl}?${params.toString()}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/pdf'
                }
            });

            if (!response.ok) {
                // If the direct API fails, try alternative approach with POST
                setConversionProgress("Trying alternative rendering method...");

                // Fallback: Use PDFCrowd-style POST request
                const fallbackResponse = await fetch('https://api.pdfendpoint.com/v1/convert', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        url: url,
                        pdf_options: {
                            format: pageSize,
                            landscape: orientation === 'Landscape',
                            print_background: includeBackground,
                            margin: {
                                top: margins === 'None' ? '0' : margins === 'Minimal' ? '10px' : margins === 'Wide' ? '40px' : '20px',
                                bottom: margins === 'None' ? '0' : margins === 'Minimal' ? '10px' : margins === 'Wide' ? '40px' : '20px',
                                left: margins === 'None' ? '0' : margins === 'Minimal' ? '10px' : margins === 'Wide' ? '40px' : '20px',
                                right: margins === 'None' ? '0' : margins === 'Minimal' ? '10px' : margins === 'Wide' ? '40px' : '20px'
                            }
                        }
                    })
                });

                if (!fallbackResponse.ok) {
                    throw new Error("PDF service temporarily unavailable. Please try again later.");
                }

                const fallbackData = await fallbackResponse.json();
                if (fallbackData.pdf_url) {
                    // Download the PDF from the URL
                    const pdfResponse = await fetch(fallbackData.pdf_url);
                    const pdfBlob = await pdfResponse.blob();

                    setGeneratedPdf({
                        blob: pdfBlob,
                        url: URL.createObjectURL(pdfBlob),
                        filename: `${outputFilename || 'converted'}.pdf`
                    });

                    setConversionProgress("Conversion complete!");
                    return;
                }
            }

            // Get PDF blob from response
            const pdfBlob = await response.blob();

            if (pdfBlob.size < 1000) {
                // If blob is too small, it might be an error response
                const text = await pdfBlob.text();
                if (text.includes('error') || text.includes('Error')) {
                    throw new Error("Failed to render webpage. The URL may be inaccessible or blocked.");
                }
            }

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
    const canConvert = isValidUrl && url.trim().length > 0 && !isConverting;

    return (
        <div className="bg-[#f6f7f8] min-h-screen pb-8">
            <div className="max-w-[1800px] mx-auto px-4 py-4">
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Left Column - URL Input */}
                    <div className="flex-1 lg:max-w-[calc(100%-448px)]">
                        {/* URL Input Card */}
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

                            {/* Conversion Error */}
                            {conversionError && (
                                <div className="mt-4 p-4 bg-red-50 rounded-xl border border-red-200">
                                    <div className="flex items-center gap-2 text-red-700">
                                        <AlertCircle className="w-5 h-5" />
                                        <p className="text-sm font-medium">{conversionError}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Info Card */}
                        <div className="mt-4 bg-blue-50 rounded-xl border border-blue-200 p-4">
                            <div className="flex items-start gap-3">
                                <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                                <div>
                                    <h3 className="text-sm font-medium text-blue-900">How it works</h3>
                                    <ul className="mt-2 text-sm text-blue-700 space-y-1">
                                        <li>• Enter any public webpage URL</li>
                                        <li>• Configure page settings on the right</li>
                                        <li>• Click "Convert to PDF" to generate</li>
                                        <li>• Download your PDF document</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Configuration Panel */}
                    <div className="lg:w-[420px] lg:flex-shrink-0">
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm lg:sticky lg:top-4 lg:max-h-[calc(100vh-32px)] flex flex-col relative overflow-hidden">
                            {/* Panel Header */}
                            <div className="p-5 border-b border-gray-100">
                                <div className="flex items-center gap-2">
                                    <Settings className="w-5 h-5 text-gray-600" />
                                    <h2 className="text-lg font-semibold text-gray-900">Conversion Settings</h2>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-5 pb-24 lg:pb-5 space-y-5">
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

                        </div> {/* End of Scrollable Content */}

                        {/* Convert Button - Fixed Sticky Footer */}
                        <div className="p-5 border-t border-gray-100 bg-white z-20">
                            <div className="pt-4 border-t border-gray-100">
                                {/* Progress Text */}
                                {conversionProgress && (
                                    <p className="text-sm text-center text-gray-600 mb-3">{conversionProgress}</p>
                                )}

                                {!generatedPdf ? (
                                    <button
                                        onClick={convertToPdf}
                                        disabled={!canConvert}
                                        className="w-full h-16 sm:h-[72px] lg:h-[64px] flex-shrink-0 bg-[#4383BF] hover:bg-[#3A74A8] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-lg rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-[#4383BF]/20"
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
                                        className="w-full h-16 sm:h-[72px] lg:h-[64px] flex-shrink-0 bg-green-600 hover:bg-green-700 text-white font-bold text-lg rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg"
                                    >
                                        <Download className="h-5 w-5" />
                                        Download PDF
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>


            </div>
        </div>
    );
}
