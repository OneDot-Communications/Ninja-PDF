"use client";

import { useState, useEffect } from "react";
import { saveAs } from "file-saver";
import { FileUpload } from "../ui/file-upload";
import { Button } from "../ui/button";
import { ArrowRight, RotateCw, RotateCcw, RefreshCw, Loader2, CheckSquare, Square } from "lucide-react";
import { cn } from "../../lib/utils";
import { pdfStrategyManager } from "../../lib/pdf-service";
import { toast } from "../../lib/use-toast";

export function RotatePdfTool() {
    const [file, setFile] = useState<File | null>(null);
    const [numPages, setNumPages] = useState<number>(0);
    const [rotations, setRotations] = useState<Record<number, number>>({});
    const [isProcessing, setIsProcessing] = useState(false);
    const [thumbnails, setThumbnails] = useState<string[]>([]);
    const [loadingThumbnails, setLoadingThumbnails] = useState(false);
    const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());

    const handleFileSelected = async (files: File[]) => {
        if (files.length > 0) {
            const selectedFile = files[0];
            setFile(selectedFile);
            setRotations({});
            setNumPages(0);
            setThumbnails([]);
            setSelectedPages(new Set());
            await generateThumbnails(selectedFile);
        }
    };

    const generateThumbnails = async (file: File) => {
        setLoadingThumbnails(true);
        try {
            const pdfjsLib = await import("pdfjs-dist");
            if (typeof window !== "undefined") {
                pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
            }
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            setNumPages(pdf.numPages);
            
            const thumbs: string[] = [];
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 0.2 }); // Small thumbnail
                const canvas = document.createElement("canvas");
                const context = canvas.getContext("2d");
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                
                if (context) {
                    const renderTask = page.render({
                        canvasContext: context,
                        viewport: viewport,
                        canvas: canvas
                    });
                    await renderTask.promise;
                    thumbs.push(canvas.toDataURL());
                }
            }
            setThumbnails(thumbs);
        } catch (error) {
            console.error("Error generating thumbnails", error);
        } finally {
            setLoadingThumbnails(false);
        }
    };

    const rotatePage = (pageIndex: number, direction: "cw" | "ccw") => {
        setRotations((prev) => {
            const currentRotation = prev[pageIndex] || 0;
            const newRotation =
                direction === "cw" ? (currentRotation + 90) % 360 : (currentRotation - 90 + 360) % 360;
            return { ...prev, [pageIndex]: newRotation };
        });
    };

    const rotateSelected = (direction: "cw" | "ccw") => {
        const newRotations = { ...rotations };
        const pagesToRotate = selectedPages.size > 0 ? Array.from(selectedPages) : Array.from({ length: numPages }, (_, i) => i + 1);

        pagesToRotate.forEach(pageIndex => {
            const currentRotation = newRotations[pageIndex] || 0;
            newRotations[pageIndex] =
                direction === "cw" ? (currentRotation + 90) % 360 : (currentRotation - 90 + 360) % 360;
        });
        setRotations(newRotations);
    };

    const resetRotation = () => {
        setRotations({});
    };

    const toggleSelection = (pageIndex: number) => {
        const newSelected = new Set(selectedPages);
        if (newSelected.has(pageIndex)) {
            newSelected.delete(pageIndex);
        } else {
            newSelected.add(pageIndex);
        }
        setSelectedPages(newSelected);
    };

    const selectAll = () => {
        if (selectedPages.size === numPages) {
            setSelectedPages(new Set());
        } else {
            setSelectedPages(new Set(Array.from({ length: numPages }, (_, i) => i + 1)));
        }
    };

    const selectOdd = () => {
        const odd = new Set<number>();
        for (let i = 1; i <= numPages; i += 2) odd.add(i);
        setSelectedPages(odd);
    };

    const selectEven = () => {
        const even = new Set<number>();
        for (let i = 2; i <= numPages; i += 2) even.add(i);
        setSelectedPages(even);
    };

    const savePdf = async () => {
        if (!file) return;
        setIsProcessing(true);

        try {
            const result = await pdfStrategyManager.execute('rotate', [file], {
                rotations
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
                title: "Rotation Failed",
                message: errorMessage,
                variant: "error",
                position: "top-right",
            });
        } finally {
            setIsProcessing(false);
        }
    };

    if (!file) {
        return (
            <div className="mx-auto max-w-2xl">
                <FileUpload
                    onFilesSelected={handleFileSelected}
                    maxFiles={1}
                    accept={{ "application/pdf": [".pdf"] }}
                    description="Drop a PDF file here to rotate pages"
                />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 className="text-2xl font-bold">{file.name}</h2>
                    <p className="text-muted-foreground">
                        {numPages > 0 ? `${numPages} pages` : "Loading..."}
                    </p>
                </div>
                <div className="flex gap-4">
                    <Button variant="outline" onClick={() => setFile(null)}>
                        Change File
                    </Button>
                    <Button variant="secondary" onClick={resetRotation}>
                        <RefreshCw className="mr-2 h-4 w-4" /> Reset
                    </Button>
                </div>
            </div>

            <div className="space-y-4 border-b pb-6">
                <div className="flex flex-wrap gap-2">
                    <Button onClick={selectAll} variant="outline" size="sm">
                        {selectedPages.size === numPages ? "Deselect All" : "Select All"}
                    </Button>
                    <Button onClick={selectOdd} variant="outline" size="sm">
                        Select Odd
                    </Button>
                    <Button onClick={selectEven} variant="outline" size="sm">
                        Select Even
                    </Button>
                </div>
                
                <div className="flex justify-center gap-4">
                    <Button onClick={() => rotateSelected("ccw")} variant="outline">
                        <RotateCcw className="mr-2 h-4 w-4" /> Rotate Selected Left
                    </Button>
                    <Button onClick={() => rotateSelected("cw")} variant="outline">
                        <RotateCw className="mr-2 h-4 w-4" /> Rotate Selected Right
                    </Button>
                </div>
            </div>

            {loadingThumbnails ? (
                <div className="flex h-60 items-center justify-center">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <span className="ml-4 text-lg font-medium">Generating thumbnails...</span>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 max-h-[60vh] overflow-y-auto p-2">
                    {thumbnails.map((src, i) => {
                        const pageNum = i + 1;
                        const rotation = rotations[pageNum] || 0;
                        const isSelected = selectedPages.has(pageNum);
                        
                        return (
                            <div
                                key={pageNum}
                                onClick={() => toggleSelection(pageNum)}
                                className={cn(
                                    "group relative flex flex-col items-center rounded-lg border bg-card p-2 shadow-sm transition-all cursor-pointer hover:shadow-md",
                                    isSelected ? "ring-2 ring-primary border-primary" : ""
                                )}
                            >
                                <div className="absolute top-2 left-2 z-10">
                                    {isSelected ? (
                                        <CheckSquare className="h-5 w-5 text-primary bg-white rounded-sm" />
                                    ) : (
                                        <Square className="h-5 w-5 text-muted-foreground bg-white/50 rounded-sm" />
                                    )}
                                </div>
                                
                                <div className="relative aspect-[1/1.4] w-full overflow-hidden rounded-md bg-muted/20">
                                    <div
                                        className="h-full w-full transition-transform duration-300 ease-in-out"
                                        style={{ transform: `rotate(${rotation}deg)` }}
                                    >
                                        <img 
                                            src={src} 
                                            alt={`Page ${pageNum}`} 
                                            className="h-full w-full object-contain" 
                                        />
                                    </div>
                                </div>
                                <div className="mt-2 flex w-full justify-between px-2" onClick={(e) => e.stopPropagation()}>
                                    <button
                                        onClick={() => rotatePage(pageNum, "ccw")}
                                        className="rounded-full p-1 hover:bg-muted text-muted-foreground hover:text-foreground"
                                    >
                                        <RotateCcw className="h-4 w-4" />
                                    </button>
                                    <span className="text-xs font-medium text-muted-foreground pt-1">{pageNum}</span>
                                    <button
                                        onClick={() => rotatePage(pageNum, "cw")}
                                        className="rounded-full p-1 hover:bg-muted text-muted-foreground hover:text-foreground"
                                    >
                                        <RotateCw className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="flex justify-center pt-8">
                <Button
                    size="lg"
                    onClick={savePdf}
                    disabled={isProcessing || loadingThumbnails}
                    className="h-14 min-w-[200px] text-lg"
                >
                    {isProcessing ? (
                        "Processing..."
                    ) : (
                        <>
                            Download PDF <ArrowRight className="ml-2 h-5 w-5" />
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
