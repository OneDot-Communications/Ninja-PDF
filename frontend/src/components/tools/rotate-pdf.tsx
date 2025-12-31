"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { saveAs } from "file-saver";
import FileUploadHero from "../ui/file-upload-hero"; // Hero uploader (big CTA, full-page drag overlay)
import { Button } from "../ui/button";
import {
    FileText,
    RotateCw,
    Plus,
    RotateCcw
} from "lucide-react";
import { pdfStrategyManager, getPdfJs } from "@/lib/services/pdf-service";
import { pdfApi } from "@/lib/services/pdf-api";
import { toast } from "@/lib/hooks/use-toast";
import { cn } from "@/lib/utils";

// Page item interface
interface PageItem {
    id: string;
    originalIndex: number; // 0-based index in original file
    rotation: number; // Additional rotation (0, 90, 180, 270)
    isBlank?: boolean;
}



export function RotatePdfTool() {
    // File and PDF state
    // State
    const [file, setFile] = useState<File | null>(null);
    const [pdfProxy, setPdfProxy] = useState<any>(null);
    const [pages, setPages] = useState<PageItem[]>([]);
    const [numPages, setNumPages] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [loadingThumbnails, setLoadingThumbnails] = useState(false);
    const [thumbnails, setThumbnails] = useState<string[]>([]);
    const [rotationAngle, setRotationAngle] = useState(90);

    // Refs
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelected = async (files: File[]) => {
        if (files.length > 0) {
            const selectedFile = files[0];
            setFile(selectedFile);
            setPages([]);

            try {
                const pdfjsLib = await getPdfJs();
                const arrayBuffer = await selectedFile.arrayBuffer();
                const pdf = await (pdfjsLib as any).getDocument({
                    data: new Uint8Array(arrayBuffer),
                    verbosity: 0
                }).promise;
                setPdfProxy(pdf);
                setNumPages(pdf.numPages);

                // Generate thumbnails
                await generateThumbnails(selectedFile);

                // Create initial page items
                const newPages: PageItem[] = [];
                for (let i = 0; i < pdf.numPages; i++) {
                    newPages.push({
                        id: Math.random().toString(36).substr(2, 9),
                        originalIndex: i,
                        rotation: 0
                    });
                }
                setPages(newPages);

            } catch (error: any) {
                console.error("Error loading PDF:", error);
                setFile(null);
                setPdfProxy(null);

                let errorMessage = "Failed to load PDF. Please try again.";
                if (error.message?.includes('Invalid PDF structure') || error.name === 'InvalidPDFException') {
                    errorMessage = "The PDF file appears to be corrupted. Try using the Repair PDF tool first.";
                } else if (error.message?.includes('password') || error.name === 'PasswordException') {
                    errorMessage = "The PDF is password-protected. Please remove the password first.";
                } else if (error.message?.includes('encrypted')) {
                    errorMessage = "The PDF is encrypted and cannot be processed.";
                }

                toast.show({
                    title: "Load Failed",
                    message: errorMessage,
                    variant: "error",
                    position: "top-right",
                });
            }
        }
    };

    // Generate thumbnails for all pages
    const generateThumbnails = async (file: File) => {
        setLoadingThumbnails(true);
        try {
            const pdfjsLib = await getPdfJs();
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await (pdfjsLib as any).getDocument({
                data: new Uint8Array(arrayBuffer),
                verbosity: 0
            }).promise;

            const thumbs: string[] = [];

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 0.2 }); // Small thumbnail scale

                const canvas = document.createElement("canvas");
                const context = canvas.getContext("2d");

                if (!context) continue;

                canvas.height = viewport.height;
                canvas.width = viewport.width;

                await page.render({
                    canvasContext: context,
                    viewport: viewport,
                    canvas: canvas,
                }).promise;

                thumbs.push(canvas.toDataURL());
            }

            setThumbnails(thumbs);
        } catch (error) {
            console.error("Error generating thumbnails:", error);
        } finally {
            setLoadingThumbnails(false);
        }
    };



    // Rotate all pages
    const rotateAll = (direction: "cw" | "ccw") => {
        const angle = direction === "cw" ? rotationAngle : -rotationAngle;
        setPages(prev => prev.map(p => ({ ...p, rotation: (p.rotation + angle + 360) % 360 })));
    };

    // Reset all rotations
    const resetRotations = () => {
        setPages(prev => prev.map(p => ({ ...p, rotation: 0 })));
    };

    // Save rotated PDF
    const savePdf = async () => {
        if (!file || pages.length === 0) return;
        setIsProcessing(true);

        try {
            const result = await pdfApi.rotate(file, {
                pages
            });

            saveAs(result.blob, result.fileName || `rotated-${file.name}`);

            toast.show({
                title: "Success",
                message: "PDF rotated successfully!",
                variant: "success",
                position: "top-right",
            });
        } catch (error: any) {
            console.error("Error rotating PDF:", error);

            let errorMessage = "Failed to rotate PDF. Please try again.";
            if (error.message?.includes('corrupted') || error.message?.includes('Invalid PDF structure')) {
                errorMessage = "The PDF file appears to be corrupted. Try using the Repair PDF tool first.";
            } else if (error.message?.includes('encrypted') || error.message?.includes('password')) {
                errorMessage = "The PDF is encrypted. Please use the Unlock PDF tool first.";
            }

            toast.show({
                title: "Operation Failed",
                message: errorMessage,
                variant: "error",
                position: "top-right",
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleFileClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFilesAppend = async (newFiles: File[]) => {
        if (!file || newFiles.length === 0) return;
        setIsProcessing(true);

        try {
            // Merge existing file with new files
            const result = await pdfApi.merge([file, ...newFiles]);
            const mergedFilename = file.name; // Keep original name or use result.fileName
            const mergedFile = new File([result.blob], mergedFilename, { type: "application/pdf" });

            // Reload PDF to get new page count
            const pdfjsLib = await getPdfJs();
            const arrayBuffer = await mergedFile.arrayBuffer();
            const pdf = await (pdfjsLib as any).getDocument({
                data: new Uint8Array(arrayBuffer),
                verbosity: 0
            }).promise;

            // Update file and proxy
            setFile(mergedFile);
            setPdfProxy(pdf);

            const oldNumPages = numPages;
            const newNumPagesTotal = pdf.numPages;
            setNumPages(newNumPagesTotal);



            // Regenerate thumbnails for the NEW merged file
            await generateThumbnails(mergedFile);

            // Update pages state: preserve old rotations, add new pages with 0 rotation
            const newPagesToAdd: PageItem[] = [];
            for (let i = oldNumPages; i < newNumPagesTotal; i++) {
                newPagesToAdd.push({
                    id: Math.random().toString(36).substr(2, 9),
                    originalIndex: i, // Index in the merged file
                    rotation: 0
                });
            }

            setPages(prev => [...prev, ...newPagesToAdd]);



            toast.show({
                title: "Files Added",
                message: `Success! Document now has ${newNumPagesTotal} pages.`,
                variant: "success",
                position: "top-right",
            });

        } catch (error) {
            console.error("Error appending files:", error);
            toast.show({
                title: "Append Failed",
                message: "Failed to merge files. Please try again.",
                variant: "error",
                position: "top-right",
            });
        } finally {
            setIsProcessing(false);
            // Reset input so change event fires again if same file selected
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const textRotateAll = (angle: number) => {
        setPages(prev => prev.map(p => ({ ...p, rotation: angle })));
        setRotationAngle(angle);
    };

    // If no file, show file upload
    if (!file) {
        return (
            <div className="min-h-[calc(100vh-120px)] flex items-center justify-center">
                <FileUploadHero
                    title="Rotate PDF"
                    onFilesSelected={handleFileSelected}
                    maxFiles={1}
                    accept={{ "application/pdf": [".pdf"] }}
                />
            </div>
        );
    }

    return (
        <div className="bg-[#f6f7f8] min-h-screen pb-8 flex flex-row">
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col p-8 lg:mr-[380px]">
                {/* Header */}
                <div className="flex flex-col mb-8">
                    <h1 className="text-4xl font-extrabold text-[#111418] mb-3">Rotate PDF Pages</h1>
                    <div className="flex items-center justify-between">
                        <p className="text-[#617289] text-base">Click on pages to rotate individually or use the global controls below. <br /> Righty-tighty, lefty-loosey!</p>

                        {/* File Pill */}
                        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-[#e2e8f0] shadow-sm">
                            <FileText className="h-4 w-4 text-[#617289]" />
                            <span className="text-[#111418] text-sm font-bold">{file.name}</span>
                        </div>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="bg-white rounded-xl shadow-sm border border-[#e2e8f0] p-4 mb-8 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => rotateAll('ccw')}
                            className="flex items-center gap-2 hover:bg-gray-50 px-3 py-2 rounded-lg transition-colors group"
                        >
                            <RotateCcw className="h-5 w-5 text-[#136dec] group-hover:scale-110 transition-transform" />
                            <span className="text-[#111418] font-bold text-sm">Rotate All Left</span>
                        </button>
                        <button
                            onClick={() => rotateAll('cw')}
                            className="flex items-center gap-2 hover:bg-gray-50 px-3 py-2 rounded-lg transition-colors group"
                        >
                            <RotateCw className="h-5 w-5 text-[#136dec] group-hover:scale-110 transition-transform" />
                            <span className="text-[#111418] font-bold text-sm">Rotate All Right</span>
                        </button>
                    </div>

                    <button
                        onClick={resetRotations}
                        className="flex items-center gap-2 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors group text-[#ef4444]"
                    >
                        <RotateCcw className="h-4 w-4 group-hover:rotate-[-45deg] transition-transform" />
                        <span className="font-bold text-sm">Reset</span>
                    </button>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {pages.map((page, index) => (
                        <div key={page.id} className="flex flex-col gap-3">
                            {/* Card */}
                            <div
                                onClick={() => {
                                    // Click rotates 90deg CW
                                    setPages(prev => prev.map(p =>
                                        p.id === page.id ? { ...p, rotation: (p.rotation + 90) % 360 } : p
                                    ));
                                }}
                                className="group relative bg-white rounded-2xl shadow-sm border border-[#e2e8f0] aspect-[3/4] p-4 cursor-pointer hover:shadow-md transition-all flex items-center justify-center overflow-hidden"
                            >
                                {/* Thumbnail Container with Rotation */}
                                <div
                                    className="relative w-full h-full flex items-center justify-center transition-transform duration-300 ease-out"
                                    style={{ transform: `rotate(${page.rotation}deg)` }}
                                >
                                    {loadingThumbnails ? (
                                        <div className="text-gray-400 text-xs font-medium">Loading...</div>
                                    ) : thumbnails[index] ? (
                                        <img
                                            src={thumbnails[index]}
                                            alt={`Page ${index + 1}`}
                                            className="max-w-full max-h-full object-contain shadow-sm"
                                        />
                                    ) : (
                                        <div className="bg-gray-50 w-full h-full rounded flex items-center justify-center">
                                            <FileText className="text-gray-300 h-10 w-10" />
                                        </div>
                                    )}
                                </div>

                                {/* Hover Overlay */}
                                <div className="absolute inset-0 bg-[#136dec]/0 group-hover:bg-[#136dec]/5 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                    <div className="bg-white/90 backdrop-blur rounded-full p-3 shadow-lg transform scale-75 group-hover:scale-100 transition-all duration-200">
                                        <RotateCw className="h-6 w-6 text-[#136dec]" />
                                    </div>
                                </div>
                            </div>

                            {/* Page Info */}
                            <div className="text-center">
                                <span className="text-[#617289] text-xs font-bold uppercase tracking-wide">Page {index + 1}</span>
                            </div>
                        </div>
                    ))}

                    {/* Add File Card */}
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={handleFileClick}
                            className="bg-white border-2 border-dashed border-[#e2e8f0] rounded-2xl aspect-[3/4] flex flex-col items-center justify-center gap-3 hover:border-[#136dec] hover:bg-[#136dec]/5 transition-all group"
                        >
                            <div className="w-12 h-12 rounded-full bg-[#f1f5f9] flex items-center justify-center group-hover:bg-white group-hover:shadow-sm transition-all">
                                <Plus className="h-6 w-6 text-[#94a3b8] group-hover:text-[#136dec]" />
                            </div>
                            <span className="text-[#94a3b8] font-bold text-sm group-hover:text-[#136dec]">Add File</span>
                            <span className="text-[#cbd5e1] text-xs px-4 text-center group-hover:text-[#136dec]/60">Append pages</span>
                        </button>
                    </div>
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                            const selectedFiles = Array.from(e.target.files);
                            if (file) {
                                handleFilesAppend(selectedFiles);
                            } else {
                                handleFileSelected(selectedFiles);
                            }
                        }
                    }}
                />
            </div>

            {/* Right Sidebar - Sticky Card */}
            <div className="hidden lg:block w-[350px] fixed right-8 top-24 bottom-8 z-10">
                <div className="bg-white rounded-2xl shadow-xl border border-[#e2e8f0] p-6 h-full flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-[#111418] font-extrabold text-xl">Rotate Settings</h2>
                        <button onClick={resetRotations} className="text-[#136dec] text-xs font-bold hover:underline">Reset</button>
                    </div>
                    <p className="text-[#617289] text-sm mb-6">Customize your angle</p>

                    {/* Rotation Control */}
                    <div className="mb-auto">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <RotateCw className="h-5 w-5 text-[#136dec]" />
                                <span className="text-[#111418] font-bold text-base">Rotation</span>
                            </div>
                            <div className="bg-[#f1f5f9] px-3 py-1 rounded text-[#111418] font-bold text-sm">
                                {rotationAngle}°
                            </div>
                        </div>

                        <div className="flex gap-2">
                            {[90, 180, 270].map((angle) => (
                                <button
                                    key={angle}
                                    onClick={() => textRotateAll(angle)}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${false
                                        ? "bg-[#eff6ff] border-[#136dec] text-[#136dec]"
                                        : "bg-white border-[#e2e8f0] text-[#617289] hover:border-[#136dec] hover:text-[#136dec]"
                                        }`}
                                >
                                    {angle}°
                                </button>
                            ))}
                        </div>

                        <div className="mt-8 p-4 bg-[#f8fafc] rounded-xl border border-[#e2e8f0]">
                            <div className="flex items-start gap-3">
                                <div className="bg-yellow-100 p-2 rounded-full mt-1">
                                    <div className="h-2 w-2 bg-yellow-400 rounded-full animate-pulse" />
                                </div>
                                <div>
                                    <h4 className="text-[#111418] font-bold text-sm mb-1">Quick Tip</h4>
                                    <p className="text-[#617289] text-xs leading-relaxed">
                                        You can verify the visual orientation of each page in the preview grid before downloading.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Download Button */}
                    <div className="mt-8">
                        <Button
                            onClick={savePdf}
                            disabled={isProcessing}
                            className="w-full h-14 text-lg font-bold bg-[#136dec] hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
                        >
                            {isProcessing ? "Processing..." : (
                                <>
                                    Download Document
                                </>
                            )}
                        </Button>
                        <p className="text-[#94a3b8] text-xs text-center mt-4">
                            Don't worry, we didn't make you dizzy.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
