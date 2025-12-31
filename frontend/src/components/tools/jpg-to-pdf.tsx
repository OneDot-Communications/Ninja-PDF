"use client";

import { useState } from "react";
import { saveAs } from "file-saver";
import FileUploadHero from "../ui/file-upload-hero";
import { Button } from "../ui/button";
import { FileText, Plus, Image as ImageIcon, Loader2, SortAsc, SortDesc, Trash2, Settings } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { pdfApi } from "@/lib/services/pdf-api";
import { toast } from "@/lib/hooks/use-toast";
import { useRouter } from "next/navigation";

interface ImageFileInfo {
    id: string;
    file: File;
    previewUrl: string;
    size: string;
}

type ViewMode = "file" | "page";

export function JpgToPdfTool() {
    const router = useRouter();
    const [files, setFiles] = useState<ImageFileInfo[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState<string>("");
    const [viewMode, setViewMode] = useState<ViewMode>("file");

    // Options
    const [pageSize, setPageSize] = useState<"auto" | "a4" | "letter">("a4");
    const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
    const [margin, setMargin] = useState<"none" | "small" | "large">("small");
    const [combineIntoOne, setCombineIntoOne] = useState(true);

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
        if (confirm("Clear all files?")) {
            files.forEach(f => URL.revokeObjectURL(f.previewUrl));
            setFiles([]);
        }
    };

    const convertToPdf = async () => {
        if (files.length === 0) return;
        setIsProcessing(true);
        setProgress("Preparing images...");

        try {
            const fileObjects = files.map(f => f.file);
            const { pdfStrategyManager } = await import("@/lib/services/pdf-service");
            const JSZip = (await import("jszip")).default;
            
            if (combineIntoOne || files.length === 1) {
                // Single PDF with all images
                setProgress(`Converting ${files.length} image${files.length > 1 ? 's' : ''} to PDF...`);
                
                const result = await pdfStrategyManager.execute("convert-to-pdf", fileObjects, {
                    pageSize,
                    orientation,
                    margin,
                });

                setProgress("Starting download...");
                setTimeout(() => {
                    saveAs(result.blob, result.fileName || "images-to-pdf.pdf");
                }, 100);
            } else {
                // Separate PDF for each image - create ZIP
                const zip = new JSZip();
                
                for (let i = 0; i < files.length; i++) {
                    const fileInfo = files[i];
                    
                    setProgress(`Converting ${i + 1} of ${files.length}: ${fileInfo.file.name}`);
                    
                    const result = await pdfStrategyManager.execute("convert-to-pdf", [fileInfo.file], {
                        pageSize,
                        orientation,
                        margin,
                    });
                    
                    const baseName = fileInfo.file.name.replace(/\.(jpg|jpeg|png|gif|webp|bmp)$/i, '');
                    zip.file(`${baseName}.pdf`, result.blob);
                }

                setProgress("Creating ZIP file...");
                
                const zipBlob = await zip.generateAsync({ 
                    type: "blob",
                    compression: "DEFLATE",
                    compressionOptions: { level: 6 }
                });
                
                setProgress("Starting download...");
                setTimeout(() => {
                    saveAs(zipBlob, `images-to-pdf-${Date.now()}.zip`);
                }, 100);
            }

            toast.show({
                title: "Success",
                message: "Images converted to PDF successfully!",
                variant: "success",
                position: "top-right",
            });

            // Clear files after conversion
            files.forEach(f => URL.revokeObjectURL(f.previewUrl));
            setFiles([]);
            setProgress("");
        } catch (error: any) {
            console.error("Error converting images to PDF:", error);
            setProgress("");

            if (error.message && error.message.includes("QUOTA_EXCEEDED")) {
                toast.show({
                    title: "Limit Reached",
                    message: "You have reached your daily limit for this tool.",
                    variant: "warning",
                    position: "top-right",
                    actions: {
                        label: "Upgrade to Unlimited",
                        onClick: () => router.push('/pricing')
                    }
                });
            } else {
                toast.show({
                    title: "Conversion Failed",
                    message: "Failed to convert images. Please try again.",
                    variant: "error",
                    position: "top-right",
                });
            }
        } finally {
            setIsProcessing(false);
        }
    };

    if (files.length === 0) {
        return (
            <div className="min-h-[calc(100vh-120px)] flex items-center justify-center">
                <FileUploadHero
                    title="JPG to PDF"
                    onFilesSelected={handleFilesSelected}
                    accept={{ "image/jpeg": [".jpg", ".jpeg"], "image/png": [".png"], "image/gif": [".gif"], "image/webp": [".webp"], "image/bmp": [".bmp"] }}
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
                                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${
                                            viewMode === "file"
                                                ? "bg-white text-[#136dec] shadow-sm"
                                                : "text-[#617289]"
                                        }`}
                                    >
                                        File View
                                    </button>
                                    <button
                                        onClick={() => setViewMode("page")}
                                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${
                                            viewMode === "page"
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
                                                        className="bg-white rounded-xl border-0 shadow-sm hover:shadow-md transition-shadow w-full max-w-[204.8px] mx-auto cursor-move"
                                                    >
                                                        {/* Preview Area */}
                                                        <div className="bg-[#f1f5f9] w-full aspect-[3/4] relative rounded-t-xl overflow-hidden">
                                                            {/* Badge */}
                                                            <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm rounded-full w-5 h-5 flex items-center justify-center z-10">
                                                                <span className="text-white font-bold text-xs leading-4">{index + 1}</span>
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
                                                                {fileInfo.file.name.replace(/\.(jpg|jpeg|png|gif|webp|bmp)$/i, '')}
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
                                                input.accept = "image/jpeg,image/png,image/gif,image/webp,image/bmp";
                                                input.onchange = (e) => {
                                                    const files = Array.from((e.target as HTMLInputElement).files || []);
                                                    handleFilesSelected(files);
                                                };
                                                input.click();
                                            }}
                                            className="bg-[rgba(19,109,236,0.05)] rounded-xl border-2 border-dashed border-[rgba(19,109,236,0.40)] w-full max-w-[204.8px] mx-auto aspect-[204.8/273.08] flex flex-col items-center justify-center cursor-pointer hover:bg-[rgba(19,109,236,0.10)] transition-colors"
                                        >
                                            <div className="bg-[rgba(19,109,236,0.10)] rounded-full w-12 h-12 flex items-center justify-center mb-4">
                                                <Plus className="h-7 w-7 text-[#136dec]" />
                                            </div>
                                            <div className="text-center px-4">
                                                <div className="text-[#136dec] font-bold text-sm mb-1">Add more files</div>
                                                <div className="text-[rgba(19,109,236,0.70)] text-xs">or drag & drop here</div>
                                            </div>
                                        </div>

                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </DragDropContext>
                    </div>

                    {/* Right Sidebar - Conversion Settings */}
                    <div className="hidden lg:block lg:w-[424px] lg:fixed lg:right-4 lg:top-24 lg:h-[calc(100vh-120px)] lg:z-10">
                        <div className="bg-white rounded-3xl border border-[#e2e8f0] p-6 h-full flex flex-col shadow-xl">
                            {/* Header */}
                            <div className="mb-6">
                                <h2 className="text-[#111418] font-bold text-lg flex items-center gap-2">
                                    <Settings className="h-5 w-5" />
                                    PDF Settings
                                </h2>
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
                                            { value: "auto", label: "Auto" },
                                            { value: "a4", label: "A4" },
                                            { value: "letter", label: "Letter" },
                                        ].map((opt) => (
                                            <button
                                                key={opt.value}
                                                onClick={() => setPageSize(opt.value as any)}
                                                className={`flex-1 px-3 py-3 rounded-lg font-bold text-sm transition-all ${
                                                    pageSize === opt.value
                                                        ? "bg-[#136dec] text-white shadow-md"
                                                        : "bg-[#f0f2f4] text-[#617289] hover:bg-[#e2e8f0]"
                                                }`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Orientation */}
                                {pageSize !== "auto" && (
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
                                                    className={`flex-1 px-4 py-3 rounded-lg font-bold text-sm transition-all ${
                                                        orientation === opt.value
                                                            ? "bg-[#136dec] text-white shadow-md"
                                                            : "bg-[#f0f2f4] text-[#617289] hover:bg-[#e2e8f0]"
                                                    }`}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Margins */}
                                {pageSize !== "auto" && (
                                    <div>
                                        <label className="text-[#617289] font-bold text-xs uppercase tracking-wider mb-3 block">
                                            Margins
                                        </label>
                                        <div className="flex gap-2">
                                            {[
                                                { value: "none", label: "None" },
                                                { value: "small", label: "Small" },
                                                { value: "large", label: "Large" },
                                            ].map((opt) => (
                                                <button
                                                    key={opt.value}
                                                    onClick={() => setMargin(opt.value as any)}
                                                    className={`flex-1 px-3 py-3 rounded-lg font-bold text-sm transition-all ${
                                                        margin === opt.value
                                                            ? "bg-[#136dec] text-white shadow-md"
                                                            : "bg-[#f0f2f4] text-[#617289] hover:bg-[#e2e8f0]"
                                                    }`}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Combine Toggle */}
                                {files.length > 1 && (
                                    <div>
                                        <label className="text-[#617289] font-bold text-xs uppercase tracking-wider mb-3 block">
                                            Output Mode
                                        </label>
                                        <div className="flex items-center gap-3 bg-[#f6f7f8] rounded-xl p-4">
                                            <input
                                                type="checkbox"
                                                id="combine"
                                                checked={combineIntoOne}
                                                onChange={(e) => setCombineIntoOne(e.target.checked)}
                                                className="w-5 h-5 rounded border-gray-300 text-[#136dec] focus:ring-[#136dec]"
                                            />
                                            <label htmlFor="combine" className="text-[#111418] text-sm font-medium cursor-pointer select-none flex-1">
                                                Combine all images into one PDF
                                            </label>
                                        </div>
                                        <p className="text-[#94a3b8] text-xs mt-2">
                                            {combineIntoOne 
                                                ? "All images will be merged into a single PDF file" 
                                                : "Each image will be saved as a separate PDF in a ZIP file"}
                                        </p>
                                    </div>
                                )}

                                {/* Summary */}
                                <div className="bg-[#f6f7f8] rounded-xl p-4">
                                    <div className="text-[#617289] font-bold text-xs uppercase tracking-wider mb-3">
                                        Summary
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[#617289] text-sm">Images</span>
                                            <span className="text-[#111418] font-bold text-sm">{files.length}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[#617289] text-sm">Output</span>
                                            <span className="text-[#111418] font-bold text-sm">
                                                {combineIntoOne || files.length === 1 ? "Single PDF" : `${files.length} PDFs (ZIP)`}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[#617289] text-sm">Size</span>
                                            <span className="text-[#111418] font-bold text-sm uppercase">{pageSize}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Convert Button */}
                            <div className="mt-6">
                                <Button
                                    onClick={convertToPdf}
                                    disabled={isProcessing || files.length === 0}
                                    className="w-full h-[60px] bg-[#136dec] hover:bg-blue-700 text-white rounded-xl flex items-center justify-center gap-2 font-bold text-lg shadow-lg disabled:opacity-50"
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
                            disabled={isProcessing || files.length === 0}
                            className="w-full h-14 bg-[#136dec] hover:bg-blue-700 text-white rounded-xl flex items-center justify-center gap-2 font-bold text-sm shadow-lg disabled:opacity-50"
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
