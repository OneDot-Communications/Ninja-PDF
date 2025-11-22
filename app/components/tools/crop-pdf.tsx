"use client";

import { useState, useRef, useEffect } from "react";
import { saveAs } from "file-saver";
import { FileUpload } from "../ui/file-upload";
import { Button } from "../ui/button";
import { Crop, CheckSquare, Square, ChevronLeft, ChevronRight } from "lucide-react";
import { pdfStrategyManager } from "../../lib/pdf-strategies";
import { toast } from "../../lib/use-toast";

export function CropPdfTool() {
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [numPages, setNumPages] = useState(0);
    const [applyToAll, setApplyToAll] = useState(true);
    
    // Crop box in percentages (0-100)
    const [cropBox, setCropBox] = useState({ x: 10, y: 10, width: 80, height: 80 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragHandle, setDragHandle] = useState<string | null>(null);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleFileSelected = async (files: File[]) => {
        if (files.length > 0) {
            setFile(files[0]);
            const pdfjsLib = await import("pdfjs-dist");
            if (typeof window !== "undefined") {
                pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
            }
            const arrayBuffer = await files[0].arrayBuffer();
            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
            setNumPages(pdf.numPages);
            setCurrentPage(1);
        }
    };

    useEffect(() => {
        if (!file || !canvasRef.current) return;

        const renderPage = async () => {
            const pdfjsLib = await import("pdfjs-dist");
            if (typeof window !== "undefined") {
                pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
            }
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
            const page = await pdf.getPage(currentPage);
            
            const viewport = page.getViewport({ scale: 1.0 });
            const canvas = canvasRef.current!;
            const context = canvas.getContext("2d")!;

            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({
                canvasContext: context,
                viewport: viewport,
                canvas: canvas,
            }).promise;
        };

        renderPage();
    }, [file, currentPage]);

    const handleMouseDown = (e: React.MouseEvent, handle: string | null) => {
        e.preventDefault();
        setIsDragging(true);
        setDragHandle(handle);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        // Clamp values
        const cx = Math.max(0, Math.min(100, x));
        const cy = Math.max(0, Math.min(100, y));

        setCropBox(prev => {
            let newBox = { ...prev };

            if (dragHandle === 'move') {
                // Move the whole box
                // This is tricky with percentages, let's skip move for now and just do resize
                // Or implement move later.
                // For now, let's just support resizing corners.
            } else if (dragHandle === 'nw') {
                newBox.width += newBox.x - cx;
                newBox.height += newBox.y - cy;
                newBox.x = cx;
                newBox.y = cy;
            } else if (dragHandle === 'ne') {
                newBox.width = cx - newBox.x;
                newBox.height += newBox.y - cy;
                newBox.y = cy;
            } else if (dragHandle === 'sw') {
                newBox.width += newBox.x - cx;
                newBox.height = cy - newBox.y;
                newBox.x = cx;
            } else if (dragHandle === 'se') {
                newBox.width = cx - newBox.x;
                newBox.height = cy - newBox.y;
            }

            // Min size check
            if (newBox.width < 5) newBox.width = 5;
            if (newBox.height < 5) newBox.height = 5;

            return newBox;
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        setDragHandle(null);
    };

    const cropPdf = async () => {
        if (!file) return;
        setIsProcessing(true);

        try {
            const result = await pdfStrategyManager.execute('crop', [file], {
                cropBox,
                applyToAll,
                pageIndex: currentPage
            });

            saveAs(result.blob, result.fileName || `cropped-${file.name}`);
            
            toast.show({
                title: "Success",
                message: "PDF cropped successfully!",
                variant: "success",
                position: "top-right",
            });
        } catch (error) {
            console.error("Error cropping PDF:", error);
            toast.show({
                title: "Operation Failed",
                message: "Failed to crop PDF. Please try again.",
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
                    description="Drop a PDF file here to crop it"
                />
            </div>
        );
    }

    return (
        <div className="space-y-8" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold truncate max-w-[300px]">{file.name}</h2>
                    <div className="flex items-center gap-2 bg-muted rounded-md px-2 py-1">
                        <Button variant="ghost" size="icon" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-medium">Page {currentPage} of {numPages}</span>
                        <Button variant="ghost" size="icon" onClick={() => setCurrentPage(Math.min(numPages, currentPage + 1))} disabled={currentPage === numPages}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setFile(null)}>Change File</Button>
                </div>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
                <div className="space-y-6 rounded-xl border bg-card p-6 h-fit">
                    <h3 className="font-semibold flex items-center gap-2">
                        <Crop className="h-5 w-5" /> Crop Settings
                    </h3>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium">Apply to all pages</label>
                            <Button
                                variant={applyToAll ? "default" : "outline"}
                                size="sm"
                                onClick={() => setApplyToAll(!applyToAll)}
                            >
                                {applyToAll ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                            </Button>
                        </div>

                        <div className="text-xs text-muted-foreground">
                            Drag the corners of the box on the preview to set the crop area.
                        </div>

                        <Button
                            size="lg"
                            onClick={cropPdf}
                            disabled={isProcessing}
                            className="w-full"
                        >
                            {isProcessing ? "Processing..." : "Crop PDF"}
                        </Button>
                    </div>
                </div>

                <div className="md:col-span-2 bg-muted/20 rounded-xl p-4 overflow-auto flex justify-center relative min-h-[500px]">
                    <div 
                        ref={containerRef}
                        className="relative shadow-lg select-none"
                        style={{ width: "fit-content", height: "fit-content" }}
                        onMouseMove={handleMouseMove}
                    >
                        <canvas ref={canvasRef} className="max-w-full h-auto block pointer-events-none" />
                        
                        {/* Crop Overlay */}
                        <div className="absolute inset-0 bg-black/50 pointer-events-none">
                            {/* The "Hole" */}
                            <div 
                                className="absolute border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] pointer-events-auto cursor-move"
                                style={{
                                    left: `${cropBox.x}%`,
                                    top: `${cropBox.y}%`,
                                    width: `${cropBox.width}%`,
                                    height: `${cropBox.height}%`,
                                }}
                                onMouseDown={(e) => handleMouseDown(e, 'move')}
                            >
                                {/* Handles */}
                                <div 
                                    className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border border-primary cursor-nw-resize"
                                    onMouseDown={(e) => handleMouseDown(e, 'nw')}
                                />
                                <div 
                                    className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border border-primary cursor-ne-resize"
                                    onMouseDown={(e) => handleMouseDown(e, 'ne')}
                                />
                                <div 
                                    className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border border-primary cursor-sw-resize"
                                    onMouseDown={(e) => handleMouseDown(e, 'sw')}
                                />
                                <div 
                                    className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border border-primary cursor-se-resize"
                                    onMouseDown={(e) => handleMouseDown(e, 'se')}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
