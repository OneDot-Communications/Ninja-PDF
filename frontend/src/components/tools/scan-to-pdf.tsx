"use client";

import { useState } from "react";
import { saveAs } from "file-saver";
import FileUploadHero from "../ui/file-upload-hero";
import { Button } from "../ui/button";
import { FileText, Plus, Loader2, SortAsc, SortDesc, Trash2, Settings, Lightbulb, X, Layout } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { toast } from "@/lib/hooks/use-toast";
import { useRouter } from "next/navigation";

interface ImageFileInfo {
    id: string;
    file: File;
    previewUrl: string;
    size: string;
    selected: boolean;
}

type ViewMode = "file" | "page";

export function ScanToPdfTool() {
    const router = useRouter();
    const [files, setFiles] = useState<ImageFileInfo[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState<string>("");
    const [viewMode, setViewMode] = useState<ViewMode>("file");

    // PDF Settings
    const [pageSize, setPageSize] = useState<"a4" | "letter" | "legal">("a4");
    const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
    const [margin, setMargin] = useState<"none" | "normal" | "wide">("normal");

    // Scan Enhancement Options (UI only - no actual processing)
    const [autoEnhance, setAutoEnhance] = useState(false);
    const [convertGrayscale, setConvertGrayscale] = useState(false);
    const [increaseContrast, setIncreaseContrast] = useState(false);

    const handleFilesSelected = (newFiles: File[]) => {
        const imageFiles = newFiles.filter(f => f.type.startsWith("image/"));

        const processedFiles = imageFiles.map(file => {
            const sizeInMB = (file.size / 1024 / 1024).toFixed(1);
            const sizeInKB = (file.size / 1024).toFixed(0);
            const size = file.size >= 1024 * 1024 ? `${sizeInMB} MB` : `${sizeInKB} KB`;

            return {
                id: Math.random().toString(36).substr(2, 9),
                file,
                previewUrl: URL.createObjectURL(file),
                size,
                selected: true,
            };
        });

        setFiles(prev => [...prev, ...processedFiles]);
    };

    const removeFile = (id: string) => {
        const fileToRemove = files.find(f => f.id === id);
        if (fileToRemove) {
            URL.revokeObjectURL(fileToRemove.previewUrl);
        }
        setFiles(prev => prev.filter(f => f.id !== id));
    };

    const toggleFileSelection = (id: string) => {
        setFiles(prev => prev.map(f => f.id === id ? { ...f, selected: !f.selected } : f));
    };

    const onDragEnd = (result: any) => {
        if (!result.destination) return;
        const items = Array.from(files);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);
        setFiles(items);
    };

    const sortFiles = (direction: "asc" | "desc") => {
        const sorted = [...files].sort((a, b) => {
            const nameA = a.file.name.toLowerCase();
            const nameB = b.file.name.toLowerCase();
            return direction === "asc" ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
        });
        setFiles(sorted);
    };

    const clearAll = () => {
        if (confirm("Clear all images?")) {
            files.forEach(f => URL.revokeObjectURL(f.previewUrl));
            setFiles([]);
        }
    };

    const selectedFiles = files.filter(f => f.selected);

    const convertToPdf = async () => {
        if (selectedFiles.length === 0) {
            toast.show({
                title: "No Images Selected",
                message: "Please select at least one image to convert.",
                variant: "error",
                position: "top-right",
            });
            return;
        }

        setIsProcessing(true);
        setProgress("Preparing images...");

        try {
            const { PDFDocument } = await import("pdf-lib");
            const pdfDoc = await PDFDocument.create();

            // Page dimensions based on settings
            const pageSizes = {
                a4: { width: 595.28, height: 841.89 },
                letter: { width: 612, height: 792 },
                legal: { width: 612, height: 1008 },
            };

            const margins = {
                none: 0,
                normal: 40,
                wide: 72,
            };

            let pageWidth = pageSizes[pageSize].width;
            let pageHeight = pageSizes[pageSize].height;

            if (orientation === "landscape") {
                [pageWidth, pageHeight] = [pageHeight, pageWidth];
            }

            const marginSize = margins[margin as keyof typeof margins] || 40;

            // Helper function to convert image to PNG using canvas
            const convertToPngBuffer = async (file: File): Promise<ArrayBuffer> => {
                return new Promise((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        const ctx = canvas.getContext('2d');
                        if (!ctx) {
                            reject(new Error('Failed to get canvas context'));
                            return;
                        }
                        ctx.drawImage(img, 0, 0);
                        canvas.toBlob((blob) => {
                            if (blob) {
                                blob.arrayBuffer().then(resolve).catch(reject);
                            } else {
                                reject(new Error('Failed to convert to PNG'));
                            }
                        }, 'image/png');
                    };
                    img.onerror = () => reject(new Error('Failed to load image'));
                    img.src = URL.createObjectURL(file);
                });
            };

            for (let i = 0; i < selectedFiles.length; i++) {
                const fileInfo = selectedFiles[i];
                setProgress(`Processing ${i + 1} of ${selectedFiles.length}: ${fileInfo.file.name}`);

                let image;

                if (fileInfo.file.type === "image/png") {
                    const arrayBuffer = await fileInfo.file.arrayBuffer();
                    image = await pdfDoc.embedPng(arrayBuffer);
                } else if (fileInfo.file.type === "image/jpeg") {
                    const arrayBuffer = await fileInfo.file.arrayBuffer();
                    image = await pdfDoc.embedJpg(arrayBuffer);
                } else {
                    // Convert WebP and other formats to PNG using canvas
                    const pngBuffer = await convertToPngBuffer(fileInfo.file);
                    image = await pdfDoc.embedPng(pngBuffer);
                }

                const page = pdfDoc.addPage([pageWidth, pageHeight]);

                // Calculate image dimensions to fit within margins
                const maxWidth = pageWidth - (marginSize * 2);
                const maxHeight = pageHeight - (marginSize * 2);

                let imgWidth = image.width;
                let imgHeight = image.height;

                // Scale to fit
                const scale = Math.min(maxWidth / imgWidth, maxHeight / imgHeight);
                imgWidth *= scale;
                imgHeight *= scale;

                // Center the image
                const drawX = marginSize + (maxWidth - imgWidth) / 2;
                const drawY = marginSize + (maxHeight - imgHeight) / 2;

                page.drawImage(image, {
                    x: drawX,
                    y: drawY,
                    width: imgWidth,
                    height: imgHeight,
                });
            }

            setProgress("Generating PDF...");
            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
            saveAs(blob, `scanned-document-${Date.now()}.pdf`);

            toast.show({
                title: "Success",
                message: `PDF created with ${selectedFiles.length} page(s)!`,
                variant: "success",
                position: "top-right",
            });

            // Clear files after conversion
            files.forEach(f => URL.revokeObjectURL(f.previewUrl));
            setFiles([]);
            setProgress("");
        } catch (error: any) {
            console.error("Error converting to PDF:", error);
            setProgress("");

            toast.show({
                title: "Conversion Failed",
                message: "Failed to convert images. Please try again.",
                variant: "error",
                position: "top-right",
            });
        } finally {
            setIsProcessing(false);
        }
    };

    if (files.length === 0) {
        return (
            <div className="min-h-[calc(100vh-120px)] flex items-center justify-center">
                <FileUploadHero
                    title="Scan to PDF"
                    buttonText="Select Images"
                    description="Drag & drop your images here"
                    onFilesSelected={handleFilesSelected}
                    accept={{
                        "image/jpeg": [".jpg", ".jpeg"],
                        "image/png": [".png"],
                        "image/webp": [".webp"]
                    }}
                    maxFiles={50}
                />
            </div>
        );
    }

    return (
        <div className="bg-[#f6f7f8] min-h-screen relative">
            <div className="max-w-[1800px] mx-auto px-4 py-4 md:py-8">
                <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
                    {/* Left Column - Files Grid */}
                    <div className="flex-1 max-w-full lg:max-w-[1200px]">
                        {/* Control Bar */}
                        <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-[#e2e8f0] shadow-sm mb-4 p-4">
                            <div className="flex items-center justify-between flex-wrap gap-4">
                                {/* View Toggle */}
                                <div className="bg-[#f0f2f4] rounded-lg p-1 flex">
                                    <button
                                        onClick={() => setViewMode("file")}
                                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${viewMode === "file"
                                            ? "bg-white text-[#136dec] shadow-sm"
                                            : "text-[#617289]"
                                            }`}
                                    >
                                        File View
                                    </button>
                                    <button
                                        onClick={() => setViewMode("page")}
                                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${viewMode === "page"
                                            ? "bg-white text-[#136dec] shadow-sm"
                                            : "text-[#617289]"
                                            }`}
                                    >
                                        Page View
                                    </button>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2">
                                    {/* Sort Buttons */}
                                    <div className="bg-[#f0f2f4] rounded-lg flex p-1">
                                        <button
                                            onClick={() => sortFiles("asc")}
                                            className="rounded-md w-9 h-10 flex items-center justify-center hover:bg-white/50 transition-colors"
                                            title="Sort A-Z"
                                        >
                                            <SortAsc className="h-5 w-5 text-[#617289]" />
                                        </button>
                                        <button
                                            onClick={() => sortFiles("desc")}
                                            className="rounded-md w-9 h-10 flex items-center justify-center hover:bg-white/50 transition-colors"
                                            title="Sort Z-A"
                                        >
                                            <SortDesc className="h-5 w-5 text-[#617289]" />
                                        </button>
                                    </div>

                                    <div className="bg-[#cbd5e1] w-px h-6"></div>

                                    {/* Clear All */}
                                    <button
                                        onClick={clearAll}
                                        className="rounded-lg flex items-center gap-2 px-3 py-2 hover:bg-[#f0f2f4] transition-colors"
                                    >
                                        <Trash2 className="h-5 w-5 text-[#617289]" />
                                        <span className="text-[#617289] font-bold text-sm">Clear All</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Files Grid with Drag & Drop */}
                        <DragDropContext onDragEnd={onDragEnd}>
                            <Droppable droppableId="files" direction="horizontal">
                                {(provided) => (
                                    <div
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-4"
                                    >
                                        {files.map((fileInfo, index) => (
                                            <Draggable key={fileInfo.id} draggableId={fileInfo.id} index={index}>
                                                {(provided) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        className={`bg-white rounded-xl border-2 shadow-sm hover:shadow-md transition-all w-full max-w-[204.8px] mx-auto cursor-move ${fileInfo.selected ? "border-[#4383BF]" : "border-transparent"
                                                            }`}
                                                        onClick={() => toggleFileSelection(fileInfo.id)}
                                                    >
                                                        {/* Preview Area */}
                                                        <div className="bg-[#f1f5f9] w-full aspect-[3/4] relative rounded-t-xl overflow-hidden">
                                                            {/* Badge */}
                                                            <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm rounded-full w-5 h-5 flex items-center justify-center z-10">
                                                                <span className="text-white font-bold text-xs leading-4">{index + 1}</span>
                                                            </div>

                                                            {/* Remove Button */}
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    removeFile(fileInfo.id);
                                                                }}
                                                                className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center z-10 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
                                                            >
                                                                <X className="h-3 w-3" />
                                                            </button>

                                                            {/* Selection Checkbox */}
                                                            <div className="absolute bottom-2 right-2 z-10">
                                                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${fileInfo.selected
                                                                    ? "bg-[#4383BF] border-[#4383BF]"
                                                                    : "bg-white border-gray-300"
                                                                    }`}>
                                                                    {fileInfo.selected && (
                                                                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                                        </svg>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Image Preview */}
                                                            <img
                                                                src={fileInfo.previewUrl}
                                                                alt={fileInfo.file.name}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </div>

                                                        {/* File Info */}
                                                        <div className="p-3">
                                                            <h3 className="text-[#111418] font-bold text-sm leading-[17.5px] mb-1 truncate" title={fileInfo.file.name}>
                                                                {fileInfo.file.name.replace(/\.(jpg|jpeg|png|webp)$/i, '')}
                                                            </h3>
                                                            <p className="text-[#617289] font-medium text-xs leading-4">
                                                                {fileInfo.file.type.split('/')[1].toUpperCase()} • {fileInfo.size}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}

                                        {/* Add More Files Card */}
                                        <div
                                            onClick={() => {
                                                const input = document.createElement("input");
                                                input.type = "file";
                                                input.multiple = true;
                                                input.accept = "image/jpeg,image/png,image/webp";
                                                input.onchange = (e) => {
                                                    const files = Array.from((e.target as HTMLInputElement).files || []);
                                                    handleFilesSelected(files);
                                                };
                                                input.click();
                                            }}
                                            className="bg-[rgba(19,109,236,0.05)] rounded-xl border-2 border-dashed border-[rgba(19,109,236,0.40)] w-full max-w-[204.8px] mx-auto aspect-[204.8/273.08] flex flex-col items-center justify-center cursor-pointer hover:bg-[rgba(19,109,236,0.10)] transition-colors"
                                        >
                                            <div className="bg-[rgba(19,109,236,0.10)] rounded-full w-12 h-12 flex items-center justify-center mb-4">
                                                <Plus className="h-7 w-7 text-[#4383BF]" />
                                            </div>
                                            <div className="text-center px-4">
                                                <div className="text-[#4383BF] font-bold text-sm mb-1">Add more images</div>
                                                <div className="text-[rgba(19,109,236,0.70)] text-xs">or drag & drop here</div>
                                            </div>
                                        </div>

                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </DragDropContext>

                        {/* Mobile Options Panel - Visible only on mobile */}
                        <div className="lg:hidden bg-white rounded-xl border border-[#e2e8f0] shadow-sm p-6 space-y-6 mt-4 mb-24">
                            {/* Header */}
                            <div className="flex items-center gap-2 pb-4 border-b border-[#e2e8f0]">
                                <Settings className="h-5 w-5 text-[#111418]" />
                                <h2 className="text-[#111418] font-bold text-lg">PDF Settings</h2>
                            </div>

                            {/* Page Size */}
                            <div>
                                <label className="text-[#617289] font-bold text-xs uppercase tracking-wider mb-3 block">
                                    Page Size
                                </label>
                                <div className="flex gap-2">
                                    {[
                                        { value: "a4", label: "A4" },
                                        { value: "letter", label: "Letter" },
                                        { value: "legal", label: "Legal" },
                                    ].map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => setPageSize(opt.value as any)}
                                            className={`flex-1 px-3 py-3 rounded-full font-bold text-sm transition-all ${pageSize === opt.value
                                                    ? "bg-[#4383BF] text-white shadow-md"
                                                    : "bg-[#f0f2f4] text-[#617289] hover:bg-[#e2e8f0]"
                                                }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Orientation */}
                            <div>
                                <label className="text-[#617289] font-bold text-xs uppercase tracking-wider mb-3 block">
                                    Orientation
                                </label>
                                <div className="flex gap-2">
                                    {[
                                        { value: "portrait", label: "Portrait" },
                                        { value: "landscape", label: "Landscape" },
                                    ].map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => setOrientation(opt.value as any)}
                                            className={`flex-1 px-4 py-3 rounded-full font-bold text-sm transition-all ${orientation === opt.value
                                                    ? "bg-[#4383BF] text-white shadow-md"
                                                    : "bg-[#f0f2f4] text-[#617289] hover:bg-[#e2e8f0]"
                                                }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Margins */}
                            <div>
                                <label className="text-[#617289] font-bold text-xs uppercase tracking-wider mb-3 block">
                                    Margins
                                </label>
                                <div className="flex gap-2">
                                    {[
                                        { value: "none", label: "None" },
                                        { value: "normal", label: "Normal" },
                                        { value: "wide", label: "Wide" },
                                    ].map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => setMargin(opt.value as any)}
                                            className={`flex-1 px-3 py-3 rounded-full font-bold text-sm transition-all ${margin === opt.value
                                                    ? "bg-[#4383BF] text-white shadow-md"
                                                    : "bg-[#f0f2f4] text-[#617289] hover:bg-[#e2e8f0]"
                                                }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Scan Enhancements */}
                            <div>
                                <label className="text-[#617289] font-bold text-xs uppercase tracking-wider mb-3 block">
                                    Scan Enhancements
                                </label>
                                <div className="space-y-3">
                                    <label className="flex items-center gap-3 bg-[#f6f7f8] rounded-xl p-4 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={autoEnhance}
                                            onChange={(e) => setAutoEnhance(e.target.checked)}
                                            className="w-5 h-5 rounded border-gray-300 text-[#4383BF] focus:ring-[#4383BF]"
                                        />
                                        <span className="text-[#111418] text-sm font-medium">Auto enhance</span>
                                    </label>
                                    <label className="flex items-center gap-3 bg-[#f6f7f8] rounded-xl p-4 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={convertGrayscale}
                                            onChange={(e) => setConvertGrayscale(e.target.checked)}
                                            className="w-5 h-5 rounded border-gray-300 text-[#4383BF] focus:ring-[#4383BF]"
                                        />
                                        <span className="text-[#111418] text-sm font-medium">Convert to grayscale</span>
                                    </label>
                                    <label className="flex items-center gap-3 bg-[#f6f7f8] rounded-xl p-4 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={increaseContrast}
                                            onChange={(e) => setIncreaseContrast(e.target.checked)}
                                            className="w-5 h-5 rounded border-gray-300 text-[#4383BF] focus:ring-[#4383BF]"
                                        />
                                        <span className="text-[#111418] text-sm font-medium">Increase contrast</span>
                                    </label>
                                </div>
                            </div>

                            {/* Summary */}
                            <div className="bg-[#f6f7f8] rounded-xl p-4">
                                <div className="text-[#617289] font-bold text-xs uppercase tracking-wider mb-3">
                                    Summary
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[#617289] text-sm">Total Images</span>
                                        <span className="text-[#111418] font-bold text-sm">{files.length}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[#617289] text-sm">Selected Images</span>
                                        <span className="text-[#111418] font-bold text-sm">{selectedFiles.length}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Sidebar */}
                    <div className="hidden lg:block lg:w-[424px] lg:fixed lg:right-4 lg:top-24 lg:h-[calc(100vh-120px)] lg:z-10">
                        <div className="bg-white rounded-3xl border border-[#e2e8f0] p-6 h-full flex flex-col shadow-xl">
                            {/* Header */}
                            <div className="flex items-center gap-2 pb-4 border-b border-[#e2e8f0] mb-6">
                                <Layout className="h-5 w-5 text-[#111418]" />
                                <h2 className="text-[#111418] font-bold text-lg">PDF Settings</h2>
                            </div>

                            {/* Settings */}
                            <div className="flex-1 space-y-6 overflow-y-auto">
                                {/* Page Size */}
                                <div>
                                    <label className="text-[#617289] font-bold text-xs uppercase tracking-wider mb-3 block">
                                        Page Size
                                    </label>
                                    <div className="flex gap-2">
                                        {[
                                            { value: "a4", label: "A4" },
                                            { value: "letter", label: "Letter" },
                                            { value: "legal", label: "Legal" },
                                        ].map((opt) => (
                                            <button
                                                key={opt.value}
                                                onClick={() => setPageSize(opt.value as any)}
                                                className={`flex-1 px-3 py-3 rounded-lg font-bold text-sm transition-all ${pageSize === opt.value
                                                    ? "bg-[#4383BF] text-white shadow-md"
                                                    : "bg-[#f0f2f4] text-[#617289] hover:bg-[#e2e8f0]"
                                                    }`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Orientation */}
                                <div>
                                    <label className="text-[#617289] font-bold text-xs uppercase tracking-wider mb-3 block">
                                        Orientation
                                    </label>
                                    <div className="flex gap-2">
                                        {[
                                            { value: "portrait", label: "Portrait" },
                                            { value: "landscape", label: "Landscape" },
                                        ].map((opt) => (
                                            <button
                                                key={opt.value}
                                                onClick={() => setOrientation(opt.value as any)}
                                                className={`flex-1 px-4 py-3 rounded-lg font-bold text-sm transition-all ${orientation === opt.value
                                                    ? "bg-[#4383BF] text-white shadow-md"
                                                    : "bg-[#f0f2f4] text-[#617289] hover:bg-[#e2e8f0]"
                                                    }`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Margins */}
                                <div>
                                    <label className="text-[#617289] font-bold text-xs uppercase tracking-wider mb-3 block">
                                        Margins
                                    </label>
                                    <div className="flex gap-2">
                                        {[
                                            { value: "none", label: "None" },
                                            { value: "normal", label: "Normal" },
                                            { value: "wide", label: "Wide" },
                                        ].map((opt) => (
                                            <button
                                                key={opt.value}
                                                onClick={() => setMargin(opt.value as any)}
                                                className={`flex-1 px-3 py-3 rounded-lg font-bold text-sm transition-all ${margin === opt.value
                                                    ? "bg-[#4383BF] text-white shadow-md"
                                                    : "bg-[#f0f2f4] text-[#617289] hover:bg-[#e2e8f0]"
                                                    }`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Scan Enhancements */}
                                <div>
                                    <label className="text-[#617289] font-bold text-xs uppercase tracking-wider mb-3 block">
                                        Scan Enhancements
                                    </label>
                                    <div className="space-y-3">
                                        <label className="flex items-center gap-3 bg-[#f6f7f8] rounded-xl p-4 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={autoEnhance}
                                                onChange={(e) => setAutoEnhance(e.target.checked)}
                                                className="w-5 h-5 rounded border-gray-300 text-[#4383BF] focus:ring-[#4383BF]"
                                            />
                                            <span className="text-[#111418] text-sm font-medium">Auto enhance</span>
                                        </label>
                                        <label className="flex items-center gap-3 bg-[#f6f7f8] rounded-xl p-4 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={convertGrayscale}
                                                onChange={(e) => setConvertGrayscale(e.target.checked)}
                                                className="w-5 h-5 rounded border-gray-300 text-[#4383BF] focus:ring-[#4383BF]"
                                            />
                                            <span className="text-[#111418] text-sm font-medium">Convert to grayscale</span>
                                        </label>
                                        <label className="flex items-center gap-3 bg-[#f6f7f8] rounded-xl p-4 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={increaseContrast}
                                                onChange={(e) => setIncreaseContrast(e.target.checked)}
                                                className="w-5 h-5 rounded border-gray-300 text-[#4383BF] focus:ring-[#4383BF]"
                                            />
                                            <span className="text-[#111418] text-sm font-medium">Increase contrast</span>
                                        </label>
                                    </div>
                                </div>

                                {/* Summary */}
                                <div className="bg-[#f6f7f8] rounded-xl p-4">
                                    <div className="text-[#617289] font-bold text-xs uppercase tracking-wider mb-3">
                                        Summary
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[#617289] text-sm">Total Images</span>
                                            <span className="text-[#111418] font-bold text-sm">{files.length}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[#617289] text-sm">Selected Images</span>
                                            <span className="text-[#111418] font-bold text-sm">{selectedFiles.length}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[#617289] text-sm">Output Format</span>
                                            <span className="text-[#111418] font-bold text-sm">PDF</span>
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
                                            Upload clear, well-lit images for the best scan quality.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Convert Button */}
                            <div className="mt-6 pt-4 border-t border-[#e2e8f0]">
                                <Button
                                    onClick={convertToPdf}
                                    disabled={isProcessing || selectedFiles.length === 0}
                                    className="w-full h-[60px] bg-[#4383BF] hover:bg-[#3470A0] text-white rounded-xl flex items-center justify-center gap-2 font-bold text-lg shadow-lg disabled:opacity-50"
                                >
                                    {isProcessing ? (
                                        <>
                                            <Loader2 className="h-6 w-6 animate-spin" />
                                            <span className="flex flex-col items-center">
                                                <span className="font-bold">Converting...</span>
                                                {progress && <span className="text-xs font-normal mt-1 opacity-80">{progress}</span>}
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <FileText className="h-6 w-6" />
                                            <span>Convert to PDF</span>
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Mobile Convert Button */}
                    <div className="lg:hidden fixed bottom-4 left-4 right-4 z-40">
                        <Button
                            onClick={convertToPdf}
                            disabled={isProcessing || selectedFiles.length === 0}
                            className="w-full h-14 bg-[#4383BF] hover:bg-[#3470A0] text-white rounded-xl flex items-center justify-center gap-2 font-bold text-sm shadow-lg disabled:opacity-50"
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    <span className="flex flex-col items-start">
                                        <span className="font-bold">Converting...</span>
                                        {progress && <span className="text-xs font-normal opacity-80">{progress}</span>}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <FileText className="h-5 w-5" />
                                    <span>Convert to PDF</span>
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
