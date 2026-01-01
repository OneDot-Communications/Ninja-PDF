import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Settings,
    ArrowRight,
    FileText,
    PlusCircle,
    Trash2,
    HelpCircle,
    RectangleVertical,
    RectangleHorizontal,
    ArrowDownAZ,
    ArrowUpAZ,
    LayoutGrid,
    List,
    FileSpreadsheet,
    Presentation
} from "lucide-react";
import { cn } from "@/lib/utils";
import FileUploadHero from "@/components/ui/file-upload-hero";
import Image from "next/image";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/services/api";

interface FileWithPreview {
    file: File;
    preview?: string;
}

interface ConversionLayoutProps {
    toolName: string;
    files: File[];
    onFilesSelected: (files: File[]) => void;
    onRemoveFile: (index: number) => void;
    onClearAll: () => void;
    onConvert: () => void;
    isProcessing: boolean;
    accept: Record<string, string[]>;
    options?: {
        orientation?: "portrait" | "landscape";
        margin?: "small" | "normal" | "big";
        pdfa?: boolean;
    };
    setOptions?: (options: any) => void;
}

export function ConversionLayout({
    toolName,
    files,
    onFilesSelected,
    onRemoveFile,
    onClearAll,
    onConvert,
    isProcessing,
    accept,
    options,
    setOptions
}: ConversionLayoutProps) {
    const [viewMode, setViewMode] = useState<"file" | "page">("file");
    const [filesWithPreviews, setFilesWithPreviews] = useState<FileWithPreview[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Generate file previews when files change
    useEffect(() => {
        const generatePreviews = async () => {
            const previews = await Promise.all(
                files.map(async (file) => {
                    try {
                        console.log(`Generating preview for: ${file.name}`);
                        const ext = file.name.split('.').pop()?.toLowerCase();

                        // Client-side preview for DOCX
                        if (ext === 'docx') {
                            try {
                                const arrayBuffer = await file.arrayBuffer();
                                const mammoth = await import("mammoth");
                                const result = await mammoth.convertToHtml({ arrayBuffer });

                                if (result.value) {
                                    // Create generic preview container
                                    const container = document.createElement('div');
                                    container.innerHTML = `<div style="padding: 20px; font-family: Arial; font-size: 10px; color: black; background: white; width: 600px; height: 800px; overflow: hidden;">${result.value}</div>`;
                                    container.style.position = 'fixed';
                                    container.style.left = '-9999px';
                                    container.style.top = '0';
                                    container.style.width = '600px';
                                    container.style.height = '800px';
                                    container.style.backgroundColor = 'white';
                                    container.style.zIndex = '-1000';
                                    document.body.appendChild(container);

                                    try {
                                        const html2canvas = (await import("html2canvas")).default;
                                        const canvas = await html2canvas(container, {
                                            width: 600,
                                            height: 800,
                                            scale: 0.5 // Thumbnail quality
                                        });
                                        const dataUrl = canvas.toDataURL("image/png");
                                        return {
                                            file,
                                            preview: dataUrl,
                                            fileType: ext
                                        };
                                    } finally {
                                        document.body.removeChild(container);
                                    }
                                }
                            } catch (clientError) {
                                console.warn("Client-side DOCX preview failed, falling back to icon", clientError);
                            }
                        }

                        // Generate actual preview from backend for other files
                        // Or if client-side failed
                        if (ext !== 'docx') { // Skip backend fallback for docx if we want to force client side or if client side failed (above catch handles it)
                            const result = await api.getOfficeFilePreview(file);
                            console.log(`Preview generated successfully for: ${file.name}`);
                            return {
                                file,
                                preview: result.preview,
                                fileType: ext
                            };
                        }

                        // Default return if docx processing failed or fallthrough
                        return {
                            file,
                            preview: undefined, // Will default to icon
                            fileType: ext
                        };

                    } catch (error) {
                        console.error(`Failed to generate preview for ${file.name}:`, error);
                        // Fallback to colored icon on error
                        return {
                            file,
                            preview: undefined,
                            fileType: file.name.split('.').pop()?.toLowerCase()
                        };
                    }
                })
            );
            setFilesWithPreviews(previews);
        };
        generatePreviews();
    }, [files]);

    // Helper to get file icon and color based on extension
    const getFileIconAndColor = (fileName: string) => {
        const ext = fileName.split('.').pop()?.toLowerCase();

        switch (ext) {
            case 'doc':
            case 'docx':
                return {
                    Icon: FileText,
                    bgColor: 'bg-gradient-to-br from-blue-500 to-blue-600',
                    iconColor: 'text-white'
                };
            case 'ppt':
            case 'pptx':
                return {
                    Icon: Presentation,
                    bgColor: 'bg-gradient-to-br from-orange-500 to-red-600',
                    iconColor: 'text-white'
                };
            case 'xls':
            case 'xlsx':
                return {
                    Icon: FileSpreadsheet,
                    bgColor: 'bg-gradient-to-br from-green-500 to-green-600',
                    iconColor: 'text-white'
                };
            default:
                return {
                    Icon: FileText,
                    bgColor: 'bg-gradient-to-br from-slate-300 to-slate-400',
                    iconColor: 'text-white'
                };
        }
    };

    const handleOrientationChange = (orientation: "portrait" | "landscape") => {
        if (setOptions && options) {
            setOptions({ ...options, orientation });
        }
    };

    const handleMarginChange = (margin: "small" | "normal" | "big") => {
        if (setOptions && options) {
            setOptions({ ...options, margin });
        }
    };

    const handlePdfaChange = (checked: boolean) => {
        if (setOptions && options) {
            setOptions({ ...options, pdfa: checked });
        }
    };

    if (files.length === 0) {
        return (
            <div className="min-h-[calc(100vh-120px)] flex items-center justify-center">
                <FileUploadHero
                    title={toolName}
                    onFilesSelected={onFilesSelected}
                    maxFiles={10}
                    accept={accept}
                />
            </div>
        );
    }

    return (
        <div className="bg-[#f6f7f8] min-h-screen relative">
            <div className="flex flex-col lg:flex-row gap-6 p-6">
                {/* Main Content Area */}
                <div className="flex-1 lg:mr-[440px]">
                    {/* Toolbar */}
                    <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm mb-6">
                        <div className="bg-[#f0f2f4] rounded-lg p-1 flex items-center">
                            <button
                                onClick={() => setViewMode("file")}
                                className={cn(
                                    "px-4 py-1.5 rounded-md text-sm font-bold transition-all flex items-center gap-2",
                                    viewMode === "file"
                                        ? "bg-white text-[#136dec] shadow-sm"
                                        : "text-[#617289] hover:text-[#136dec]"
                                )}
                            >
                                <List className="w-4 h-4" />
                                File View
                            </button>
                            <button
                                onClick={() => setViewMode("page")}
                                className={cn(
                                    "px-4 py-1.5 rounded-md text-sm font-bold transition-all flex items-center gap-2",
                                    viewMode === "page"
                                        ? "bg-white text-[#136dec] shadow-sm"
                                        : "text-[#617289] hover:text-[#136dec]"
                                )}
                            >
                                <LayoutGrid className="w-4 h-4" />
                                Page View
                            </button>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="bg-[#f0f2f4] rounded-lg p-1 flex items-center">
                                <button className="p-2 hover:bg-white rounded-md transition-all text-[#617289]">
                                    <ArrowDownAZ className="w-5 h-5" />
                                </button>
                                <button className="p-2 hover:bg-white rounded-md transition-all text-[#617289]">
                                    <ArrowUpAZ className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="h-6 w-px bg-slate-300"></div>
                            <button
                                onClick={onClearAll}
                                className="flex items-center gap-2 text-[#617289] hover:text-red-500 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50"
                            >
                                <Trash2 className="w-5 h-5" />
                                <span className="font-bold text-sm">Clear All</span>
                            </button>
                        </div>
                    </div>

                    {/* File Grid - Dynamic based on view mode */}
                    <div className={cn(
                        "grid gap-6",
                        viewMode === "file"
                            ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
                            : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
                    )}>
                        {filesWithPreviews.map((item, index) => {
                            const { Icon, bgColor, iconColor } = getFileIconAndColor(item.file.name);

                            return (
                                <div key={index} className={cn(
                                    "bg-white rounded-xl shadow-sm border border-transparent hover:border-[#4383BF]/20 transition-all group relative",
                                    viewMode === "file" ? "p-4" : "p-2"
                                )}>
                                    <div className={cn(
                                        "rounded-lg mb-4 relative flex items-center justify-center overflow-hidden",
                                        viewMode === "file" ? "aspect-[3/4]" : "aspect-[3/4]",
                                        viewMode === "page" && "mb-2",
                                        !item.preview && bgColor
                                    )}>
                                        <div className={cn(
                                            "absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white font-bold px-2 py-0.5 rounded-full z-10",
                                            viewMode === "file" ? "text-[10px]" : "text-[8px]"
                                        )}>
                                            {index + 1}
                                        </div>

                                        {/* Show actual preview image if available */}
                                        {item.preview ? (
                                            <Image
                                                src={item.preview}
                                                alt={item.file.name}
                                                width={viewMode === "file" ? 400 : 200}
                                                height={viewMode === "file" ? 533 : 267}
                                                className="object-contain w-full h-full"
                                            />
                                        ) : (
                                            /* Fallback to colored icon if preview not available */
                                            <Icon className={cn(
                                                iconColor,
                                                viewMode === "file" ? "w-20 h-20" : "w-12 h-12"
                                            )} />
                                        )}

                                        <button
                                            onClick={() => onRemoveFile(index)}
                                            className={cn(
                                                "absolute top-2 right-2 bg-white/90 hover:bg-red-500 text-slate-700 hover:text-white rounded-full opacity-0 group-hover:opacity-100 transition-all z-10 shadow-lg",
                                                viewMode === "file" ? "p-1.5" : "p-1"
                                            )}
                                        >
                                            <Trash2 className={cn(
                                                viewMode === "file" ? "w-4 h-4" : "w-3 h-3"
                                            )} />
                                        </button>
                                    </div>
                                    <div>
                                        <h3 className={cn(
                                            "font-bold text-[#111418] truncate",
                                            viewMode === "file" ? "text-sm" : "text-[10px]"
                                        )} title={item.file.name}>
                                            {item.file.name}
                                        </h3>
                                        {viewMode === "file" && (
                                            <p className="text-[#617289] text-xs font-medium mt-1">
                                                {(item.file.size / 1024 / 1024).toFixed(2)} MB
                                            </p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {/* Add More Card */}
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-[#4383BF]/5 border-2 border-dashed border-[#4383BF]/40 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-[#4383BF]/10 transition-all min-h-[280px]"
                        >
                            <div className="bg-[#4383BF]/10 rounded-full p-3 mb-4">
                                <PlusCircle className="w-8 h-8 text-[#4383BF]" />
                            </div>
                            <span className="text-[#4383BF] font-bold text-sm mb-1">Add more files</span>
                            <span className="text-[#4383BF]/70 text-xs">or drag & drop here</span>
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                accept={Object.keys(accept).join(",")}
                                className="hidden"
                                onChange={(e) => {
                                    if (e.target.files) {
                                        onFilesSelected(Array.from(e.target.files));
                                    }
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Right Sidebar - Fixed Configuration Panel */}
                <div className="hidden lg:block lg:w-[424px] lg:fixed lg:right-4 lg:top-24 lg:h-[calc(100vh-120px)] lg:z-10">
                    <div className="bg-white rounded-3xl border border-[#e2e8f0] p-6 h-full flex flex-col shadow-xl">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-[#111418] text-lg font-bold flex items-center gap-2">
                                Configuration
                            </h2>
                            <Settings className="text-[#94a3b8] w-6 h-6" />
                        </div>

                        {/* Scrollable Options Area */}
                        <div className="flex-1 overflow-y-auto">
                            {/* Page Orientation */}
                            <div className="mb-8">
                                <h3 className="text-[#111418] text-sm font-bold mb-4">Page Orientation</h3>
                                <div className="bg-[#f6f7f8] rounded-lg p-1 flex">
                                    <button
                                        onClick={() => handleOrientationChange("portrait")}
                                        className={cn(
                                            "flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-all",
                                            options?.orientation === "portrait"
                                                ? "bg-white text-[#136dec] shadow-sm font-bold"
                                                : "text-[#617289] hover:text-[#136dec] font-medium"
                                        )}
                                    >
                                        <RectangleVertical className="w-5 h-5" />
                                        Portrait
                                    </button>
                                    <div className="w-px bg-slate-300 my-2 mx-1"></div>
                                    <button
                                        onClick={() => handleOrientationChange("landscape")}
                                        className={cn(
                                            "flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-all",
                                            options?.orientation === "landscape"
                                                ? "bg-white text-[#136dec] shadow-sm font-bold"
                                                : "text-[#617289] hover:text-[#136dec] font-medium"
                                        )}
                                    >
                                        <RectangleHorizontal className="w-5 h-5" />
                                        Landscape
                                    </button>
                                </div>
                            </div>

                            {/* Margins */}
                            <div className="mb-8">
                                <h3 className="text-[#111418] text-sm font-bold mb-4">Margins</h3>
                                <div className="grid grid-cols-3 gap-4">
                                    <button
                                        onClick={() => handleMarginChange("small")}
                                        className={cn(
                                            "flex flex-col items-center gap-3 p-3 rounded-lg border transition-all",
                                            options?.margin === "small"
                                                ? "bg-[#136dec]/5 border-[#136dec]"
                                                : "border-slate-200 hover:border-[#136dec]/50"
                                        )}
                                    >
                                        <div className="bg-white border border-slate-300 w-8 h-10 relative rounded-sm">
                                            <div className="absolute inset-[2px] border border-slate-300 rounded-[1px]"></div>
                                        </div>
                                        <span className={cn("text-xs font-medium", options?.margin === "small" ? "text-[#4383BF]" : "text-[#617289]")}>Small</span>
                                    </button>

                                    <button
                                        onClick={() => handleMarginChange("normal")}
                                        className={cn(
                                            "flex flex-col items-center gap-3 p-3 rounded-lg border transition-all",
                                            options?.margin === "normal"
                                                ? "bg-[#136dec]/5 border-[#136dec]"
                                                : "border-slate-200 hover:border-[#136dec]/50"
                                        )}
                                    >
                                        <div className="bg-white border border-slate-300 w-8 h-10 relative rounded-sm">
                                            <div className="absolute inset-[4px] border border-slate-300 rounded-[1px]"></div>
                                        </div>
                                        <span className={cn("text-xs font-medium", options?.margin === "normal" ? "text-[#136dec]" : "text-[#617289]")}>Normal</span>
                                    </button>

                                    <button
                                        onClick={() => handleMarginChange("big")}
                                        className={cn(
                                            "flex flex-col items-center gap-3 p-3 rounded-lg border transition-all",
                                            options?.margin === "big"
                                                ? "bg-[#136dec]/5 border-[#136dec]"
                                                : "border-slate-200 hover:border-[#136dec]/50"
                                        )}
                                    >
                                        <div className="bg-white border border-slate-300 w-8 h-10 relative rounded-sm">
                                            <div className="absolute inset-[6px] border border-slate-300 rounded-[1px]"></div>
                                        </div>
                                        <span className={cn("text-xs font-medium", options?.margin === "big" ? "text-[#136dec]" : "text-[#617289]")}>Big</span>
                                    </button>
                                </div>
                            </div>

                            {/* PDF/A Checkbox */}
                            <div className="mb-8 bg-[#f6f7f8] rounded-lg border border-[#dbe0e6] p-4 flex items-start gap-3">
                                <div className="pt-0.5">
                                    <Switch
                                        checked={options?.pdfa}
                                        onCheckedChange={handlePdfaChange}
                                    />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-[#111418] text-sm font-bold mb-1">Create PDF/A</h4>
                                    <p className="text-[#617289] text-xs">Ensures long-term preservation of the document (Archival Standard).</p>
                                </div>
                                <HelpCircle className="text-[#617289] w-5 h-5" />
                            </div>
                        </div>

                        {/* Convert Button - Fixed at bottom */}
                        <div className="mt-auto pt-4">
                            <Button
                                onClick={onConvert}
                                disabled={isProcessing || files.length === 0}
                                className="w-[374px] h-[60px] bg-[#136dec] hover:bg-[#115bb5] text-white rounded-xl text-lg font-bold shadow-lg shadow-[#136dec]/40 flex items-center justify-center gap-2"
                            >
                                {isProcessing ? "Converting..." : "Convert To PDF"}
                                {!isProcessing && <ArrowRight className="w-6 h-6" />}
                            </Button>
                            <p className="text-[#94a3b8] text-[10px] text-center mt-4">
                                By converting, you agree to our Terms of Service.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
