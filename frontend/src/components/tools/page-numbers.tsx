"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { saveAs } from "file-saver";
import FileUploadHero from "../ui/file-upload-hero";
import {
    Hash,
    ChevronLeft,
    ChevronRight,
    Download,
    Sliders,
    Palette,
} from "lucide-react";
import { pdfStrategyManager, getPdfJs } from "@/lib/services/pdf-service";
import { toast } from "@/lib/hooks/use-toast";
import { cn } from "@/lib/utils";

// Page number element interface
interface PageNumberElement {
    id: string;
    format: "n" | "page-n" | "n-of-m" | "page-n-of-m";
    startFrom: number;
    pageRange: string;
    fontFamily: string;
    fontSize: number;
    color: string;
    margin: number;
    position: "bottom-center" | "bottom-right" | "top-right" | "top-left" | "bottom-left" | "top-center";
    fontWeight: string;
    fontStyle: string;
    textDecoration: string;
    opacity: number;
    rotation: number;
    verticalAlignment: "top" | "middle" | "bottom";
    horizontalAlignment: "left" | "center" | "right";
}

export function PageNumbersTool() {
    const [file, setFile] = useState<File | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [numPages, setNumPages] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [pageNumberElement, setPageNumberElement] = useState<PageNumberElement | null>(null);
    const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);

    const [format, setFormat] = useState<"n" | "page-n" | "n-of-m" | "page-n-of-m">("n-of-m");
    const [startFrom, setStartFrom] = useState(1);
    const [pageRange, setPageRange] = useState("");
    const [fontFamily, setFontFamily] = useState("Helvetica");
    const [fontSize, setFontSize] = useState(12);
    const [color, setColor] = useState("#000000");
    const [margin, setMargin] = useState(20);
    const [position, setPosition] = useState<"bottom-center" | "bottom-right" | "top-right" | "top-left" | "bottom-left" | "top-center">("bottom-center");
    const [isBold, setIsBold] = useState(false);
    const [isItalic, setIsItalic] = useState(false);
    const [isUnderline, setIsUnderline] = useState(false);
    const [opacity, setOpacity] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [verticalAlignment, setVerticalAlignment] = useState<"top" | "middle" | "bottom">("bottom");
    const [horizontalAlignment, setHorizontalAlignment] = useState<"left" | "center" | "right">("center");

    const positionOptions = [
        { id: "top-left", label: "Top Left" },
        { id: "top-center", label: "Top Center" },
        { id: "top-right", label: "Top Right" },
        { id: "bottom-left", label: "Bottom Left" },
        { id: "bottom-center", label: "Bottom Center" },
        { id: "bottom-right", label: "Bottom Right" }
    ];

    const handleFileSelected = async (files: File[]) => {
        if (files.length > 0) {
            setFile(files[0]);
            setCurrentPage(1);

            const pdfjsLib = await getPdfJs();
            const arrayBuffer = await files[0].arrayBuffer();
            const pdf = await (pdfjsLib as any).getDocument(new Uint8Array(arrayBuffer)).promise;
            setNumPages(pdf.numPages);

            canvasRefs.current = Array(pdf.numPages).fill(null);

            const newPageNumberElement: PageNumberElement = {
                id: Math.random().toString(36).substr(2, 9),
                format,
                startFrom,
                pageRange,
                fontFamily,
                fontSize,
                color,
                margin,
                position,
                fontWeight: isBold ? 'bold' : 'normal',
                fontStyle: isItalic ? 'italic' : 'normal',
                textDecoration: isUnderline ? 'underline' : 'none',
                opacity,
                rotation,
                verticalAlignment,
                horizontalAlignment
            };

            setPageNumberElement(newPageNumberElement);
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
        return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    };

    useEffect(() => {
        if (!file) return;

        const renderAllPages = async () => {
            const pdfjsLib = await getPdfJs();
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await (pdfjsLib as any).getDocument(new Uint8Array(arrayBuffer)).promise;

            // Render all pages
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 0.5 }); // Smaller scale for grid view

                let canvas = canvasRefs.current[i - 1];
                if (!canvas) continue;

                const context = canvas.getContext("2d")!;
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                await page.render({
                    canvasContext: context,
                    viewport: viewport,
                }).promise;
            }
        };

        renderAllPages();
    }, [file]);

    const applyPageNumbers = async () => {
        if (!file || !pageNumberElement) return;
        setIsProcessing(true);

        try {
            // Format page range for backend (e.g., "1-5" or "1-12")
            const toPage = pageRange ? parseInt(pageRange) : numPages;
            const formattedPageRange = `${startFrom}-${toPage}`;

            const result = await pdfStrategyManager.execute('page-numbers', [file], {
                ...pageNumberElement,
                format,
                startFrom: 1, // Always start numbering from 1
                pageRange: formattedPageRange, // Send as "fromPage-toPage"
                fontFamily,
                fontSize,
                color,
                margin,
                position
            });

            saveAs(result.blob, result.fileName || `numbered-${file.name}`);

            toast.show({
                title: "Success",
                message: "Page numbers added successfully!",
                variant: "success",
                position: "top-right",
            });
        } catch (error: any) {
            toast.show({
                title: "Operation Failed",
                message: error.message || "Failed to add page numbers. Please try again.",
                variant: "error",
                position: "top-right",
            });
        } finally {
            setIsProcessing(false);
        }
    };


    const shouldShowPageNumber = (pageNum: number): boolean => {
        // Calculate FROM and TO page range
        const fromPage = startFrom;
        const toPage = pageRange ? parseInt(pageRange) : numPages;


        // Show page number if current page is within the range
        return pageNum >= fromPage && pageNum <= toPage;
    };

    const generatePageNumberText = (pageNum: number) => {
        // Calculate the actual number to display
        // If we start from page 3, page 3 should show "1", page 4 shows "2", etc.
        const displayNumber = pageNum - startFrom + 1;

        switch (format) {
            case "n":
                return `${displayNumber}`;
            case "page-n":
                return `Page ${displayNumber}`;
            case "n-of-m":
                const totalInRange = (pageRange ? parseInt(pageRange) : numPages) - startFrom + 1;
                return `${displayNumber} of ${totalInRange}`;
            case "page-n-of-m":
                const totalPages = (pageRange ? parseInt(pageRange) : numPages) - startFrom + 1;
                return `Page ${displayNumber} of ${totalPages}`;
            default:
                return `${displayNumber}`;
        }
    };

    if (!file) {
        return (
            <div className="min-h-[calc(100vh-120px)] flex items-center justify-center">
                <FileUploadHero
                    title="Add Page Numbers"
                    onFilesSelected={handleFileSelected}
                    maxFiles={1}
                    accept={{ "application/pdf": [".pdf"] }}
                />
            </div>
        );
    }

    return (
        <div className="bg-[#f8f9fa] min-h-screen pb-8">
            <div className="max-w-[1800px] mx-auto px-4 py-4">
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Left Column - Page Grid */}
                    <div className="flex-1 lg:max-w-[calc(100%-448px)]">
                        {/* Control Bar */}
                        <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-gray-200 shadow-sm p-4 mb-6">
                            <div className="flex items-center justify-between flex-wrap gap-4">
                                <div className="flex items-center gap-2">
                                    <h2 className="text-lg font-bold text-gray-900">{file.name}</h2>
                                    <span className="text-sm text-gray-500">({formatFileSize(file.size)})</span>
                                </div>
                                <button
                                    onClick={() => {
                                        setFile(null);
                                        setPageNumberElement(null);
                                    }}
                                    className="flex items-center gap-2 text-gray-600 hover:text-red-600 transition-colors px-3 py-2 rounded-lg hover:bg-red-50"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    <span className="text-sm font-bold">Remove File</span>
                                </button>
                            </div>
                        </div>

                        {/* Grid of Pages */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {Array.from({ length: numPages }).map((_, index) => (
                                <div
                                    key={index}
                                    className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
                                >
                                    {/* Preview Area */}
                                    <div className="relative bg-gray-50 h-[300px] flex items-center justify-center overflow-hidden">
                                        <div className="relative shadow-md max-w-full max-h-full">
                                            <canvas
                                                ref={(el) => {
                                                    if (el) canvasRefs.current[index] = el;
                                                }}
                                                className="block max-w-full max-h-[280px] object-contain"
                                            />
                                            {/* Page number overlay preview */}
                                            {shouldShowPageNumber(index + 1) && (
                                                <div
                                                    className="absolute text-sm font-medium pointer-events-none"
                                                    style={{
                                                        color,
                                                        fontSize: `${fontSize * 0.5}px`, // Scale for preview
                                                        fontFamily,
                                                        fontWeight: isBold ? 'bold' : 'normal',
                                                        fontStyle: isItalic ? 'italic' : 'normal',
                                                        textDecoration: isUnderline ? 'underline' : 'none',
                                                        opacity,
                                                        ...(position.includes('bottom') ? { bottom: `${margin * 0.5}px` } : { top: `${margin * 0.5}px` }),
                                                        ...(position.includes('left') ? { left: `${margin * 0.5}px` } :
                                                            position.includes('right') ? { right: `${margin * 0.5}px` } :
                                                                { left: '50%', transform: 'translateX(-50%)' })
                                                    }}
                                                >
                                                    {generatePageNumberText(index + 1)}
                                                </div>
                                            )}
                                        </div>
                                        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm rounded-full px-2 py-1 text-white text-xs font-bold">
                                            Page {index + 1}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Sidebar - Configuration */}
                    <div className="lg:w-[424px] lg:fixed lg:right-4 lg:top-20 lg:bottom-4">
                        <div className="bg-white rounded-2xl shadow-lg p-6 w-full h-full overflow-y-auto flex flex-col">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-semibold text-gray-900">Page Number</h2>
                                <button className="p-1 hover:bg-gray-100 rounded">
                                    <Sliders className="h-5 w-5 text-gray-600" />
                                </button>
                            </div>

                            {/* Pagination Logic Section */}
                            <div className="mb-6">
                                {/* <div className="flex items-center gap-2 mb-2">
                            <div className="w-5 h-5 bg-blue-500 rounded flex items-center justify-center flex-shrink-0">
                                <Hash className="h-3 w-3 text-white" />
                            </div>
                            <h3 className="font-semibold text-gray-900">Pagination Logic</h3>
                        </div>
                        <p className="text-xs text-gray-500 mb-4">Configure range, style, and placement</p> */}

                                {/* Page Range */}
                                <div className="mb-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-sm font-medium text-gray-700">Page Range</label>
                                        <button
                                            onClick={() => {
                                                setStartFrom(1);
                                                setPageRange("");
                                            }}
                                            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                                        >
                                            Reset
                                        </button>
                                    </div>
                                    <div className="text-xs text-gray-500 mb-2">(Which pages should have numbers?)</div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs text-gray-600 block mb-1">From Page</label>
                                            <input
                                                type="number"
                                                min="1"
                                                max={numPages}
                                                value={startFrom}
                                                onChange={(e) => setStartFrom(parseInt(e.target.value) || 1)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-600 block mb-1">To Page</label>
                                            <input
                                                type="number"
                                                min={startFrom}
                                                max={numPages}
                                                placeholder={numPages.toString()}
                                                value={pageRange}
                                                onChange={(e) => setPageRange(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Number Format */}
                            <div className="mb-6">
                                <label className="text-sm font-medium text-gray-700 block mb-2">Number Format</label>
                                <select
                                    value={format}
                                    onChange={(e) => setFormat(e.target.value as any)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                >
                                    <option value="n">1</option>
                                    <option value="page-n">Page 1</option>
                                    <option value="n-of-m">1 of N</option>
                                    <option value="page-n-of-m">Page 1 of N</option>
                                </select>
                                <p className="text-xs text-gray-500 mt-2">
                                    Pro tip: "Page X of Y" is great for contracts. Roman numerals for prefaces.
                                </p>
                            </div>

                            {/* Typography */}
                            <div className="mb-6">
                                <label className="text-sm font-medium text-gray-700 block mb-3">Typography</label>

                                {/* Single Row: Font, Color, Size */}
                                <div className="flex gap-3">
                                    {/* Font Family Selector */}
                                    <div className="flex-1 relative">
                                        <select
                                            value={fontFamily}
                                            onChange={(e) => setFontFamily(e.target.value)}
                                            className="w-full h-12 appearance-none rounded-xl border border-gray-300 pl-4 pr-8 bg-white text-gray-900 text-sm font-medium focus:border-blue-600 outline-none"
                                        >
                                            <option value="Helvetica">Helvetica</option>
                                            <option value="Times-Roman">Times New Roman</option>
                                            <option value="Courier">Courier</option>
                                            <option value="Arial">Arial</option>
                                        </select>
                                        {/* Chevron Icon */}
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                                            <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                                                <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </div>
                                    </div>

                                    {/* Color Picker */}
                                    <div className="relative">
                                        <div className="w-12 h-12 rounded-xl border border-gray-300 bg-white flex items-center justify-center cursor-pointer hover:border-blue-600 transition-colors">
                                            <div className="w-6 h-6 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: color }} />
                                        </div>
                                        <input
                                            type="color"
                                            value={color}
                                            onChange={(e) => setColor(e.target.value)}
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                        />
                                    </div>

                                    {/* Font Size Input */}
                                    <div className="w-20 relative">
                                        <input
                                            type="number"
                                            value={fontSize}
                                            onChange={(e) => setFontSize(Number(e.target.value))}
                                            className="w-full h-12 rounded-xl border border-gray-300 pl-3 pr-8 bg-white text-gray-900 text-sm font-medium focus:border-blue-600 outline-none text-center"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-medium pointer-events-none">px</span>
                                    </div>
                                </div>
                            </div>

                            {/* Placement Section */}
                            <div className="mb-8">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-medium text-gray-700">Placement</h3>
                                </div>

                                <div className="bg-[#f8fafc] border border-gray-200 rounded-2xl p-4">
                                    <div className="flex gap-6">
                                        {/* 3x3 Grid */}
                                        <div className="grid grid-cols-3 gap-2 w-[100px] flex-shrink-0">
                                            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => {
                                                const row = Math.floor(i / 3);
                                                const col = i % 3;
                                                const positionMap = [
                                                    "top-left", "top-center", "top-right",
                                                    "bottom-left", "bottom-center", "bottom-right",
                                                    "bottom-left", "bottom-center", "bottom-right"
                                                ];
                                                const gridPosition = positionMap[i];

                                                return (
                                                    <button
                                                        key={i}
                                                        onClick={() => setPosition(gridPosition as any)}
                                                        className={cn(
                                                            "aspect-square rounded border transition-all flex items-center justify-center",
                                                            position === gridPosition
                                                                ? "bg-[#4383BF] border-[#4383BF] text-white"
                                                                : "bg-white border-gray-300 hover:border-gray-400"
                                                        )}
                                                    >
                                                        {position === gridPosition && (
                                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                                <path d="M7 2a1 1 0 00-.707 1.707L7 4.414v3.758a1 1 0 01-.293.707l-4 4C.817 14.769 2.156 18 4.828 18h10.343c2.673 0 4.012-3.231 2.122-5.121l-4-4A1 1 0 0113 8.172V4.414l.707-.707A1 1 0 0013 2H7zm2 6.172V4h2v4.172a3 3 0 00.879 2.12l1.027 1.028a4 4 0 00-2.171.102l-.47.156a4 4 0 01-2.53 0l-.563-.187a1.993 1.993 0 00-.114-.035l1.063-1.063A3 3 0 009 8.172z" />
                                                            </svg>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* Info & Current Position */}
                                        <div className="flex flex-col justify-between flex-1">
                                            <p className="text-gray-600 text-xs leading-relaxed">
                                                Click a grid cell to position the page number.
                                            </p>
                                            <div className="mt-2">
                                                <div className="bg-white border border-gray-200 rounded-md px-2 py-1 text-xs font-medium text-gray-700 inline-block">
                                                    {position.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Apply Button - pushed to bottom */}
                            <div className="mt-auto pt-6">
                                <button
                                    onClick={applyPageNumbers}
                                    disabled={isProcessing}
                                    className="w-full bg-[#4383BF] hover:bg-[#3470A0] text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <Download className="h-5 w-5" />
                                    {isProcessing ? "Processing..." : "Apply Page Numbers"}
                                </button>

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
                </div>
            </div>
        </div>
    );
}