"use client";

import { useState, useRef, useEffect } from "react";
import { saveAs } from "file-saver";
import { FileUpload } from "../ui/file-upload";
import { Button } from "../ui/button";
import { Crop, CheckSquare, Square, ChevronLeft, ChevronRight } from "lucide-react";
import { pdfStrategyManager } from "../../lib/pdf-service";
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
                pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
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
                pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
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

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!containerRef.current) return;
        
        const rect = containerRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        
        // Calculate relative position within the crop box
        const relativeX = (x - cropBox.x) / cropBox.width;
        const relativeY = (y - cropBox.y) / cropBox.height;
        
        // Determine which handle to use based on position
        let detectedHandle: string = 'move';
        const edgeThreshold = 0.25; // 25% from edge for resize handles
        
        if (relativeX < edgeThreshold && relativeY < edgeThreshold) {
            detectedHandle = 'nw';
        } else if (relativeX > 1 - edgeThreshold && relativeY < edgeThreshold) {
            detectedHandle = 'ne';
        } else if (relativeX < edgeThreshold && relativeY > 1 - edgeThreshold) {
            detectedHandle = 'sw';
        } else if (relativeX > 1 - edgeThreshold && relativeY > 1 - edgeThreshold) {
            detectedHandle = 'se';
        } else if (relativeX < edgeThreshold) {
            detectedHandle = 'w';
        } else if (relativeX > 1 - edgeThreshold) {
            detectedHandle = 'e';
        } else if (relativeY < edgeThreshold) {
            detectedHandle = 'n';
        } else if (relativeY > 1 - edgeThreshold) {
            detectedHandle = 's';
        }
        
        setIsDragging(true);
        setDragHandle(detectedHandle);
    };

    useEffect(() => {
        const handleGlobalMouseMove = (e: MouseEvent) => {
            if (!isDragging || !containerRef.current) return;

            const rect = containerRef.current.getBoundingClientRect();
            const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
            const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

            setCropBox(prev => {
                let newBox = { ...prev };

                if (dragHandle === 'move') {
                    // Move the entire box
                    const deltaX = x - (prev.x + prev.width / 2);
                    const deltaY = y - (prev.y + prev.height / 2);
                    newBox.x = Math.max(0, Math.min(100 - prev.width, prev.x + deltaX));
                    newBox.y = Math.max(0, Math.min(100 - prev.height, prev.y + deltaY));
                } else if (dragHandle === 'nw') {
                    const newWidth = prev.x + prev.width - x;
                    const newHeight = prev.y + prev.height - y;
                    if (newWidth >= 5 && newHeight >= 5) {
                        newBox.width = newWidth;
                        newBox.height = newHeight;
                        newBox.x = x;
                        newBox.y = y;
                    }
                } else if (dragHandle === 'ne') {
                    const newWidth = x - prev.x;
                    const newHeight = prev.y + prev.height - y;
                    if (newWidth >= 5 && newHeight >= 5) {
                        newBox.width = newWidth;
                        newBox.height = newHeight;
                        newBox.y = y;
                    }
                } else if (dragHandle === 'sw') {
                    const newWidth = prev.x + prev.width - x;
                    const newHeight = y - prev.y;
                    if (newWidth >= 5 && newHeight >= 5) {
                        newBox.width = newWidth;
                        newBox.height = newHeight;
                        newBox.x = x;
                    }
                } else if (dragHandle === 'se') {
                    const newWidth = x - prev.x;
                    const newHeight = y - prev.y;
                    if (newWidth >= 5 && newHeight >= 5) {
                        newBox.width = newWidth;
                        newBox.height = newHeight;
                    }
                } else if (dragHandle === 'n') {
                    const newHeight = prev.y + prev.height - y;
                    if (newHeight >= 5) {
                        newBox.height = newHeight;
                        newBox.y = y;
                    }
                } else if (dragHandle === 's') {
                    const newHeight = y - prev.y;
                    if (newHeight >= 5) {
                        newBox.height = newHeight;
                    }
                } else if (dragHandle === 'w') {
                    const newWidth = prev.x + prev.width - x;
                    if (newWidth >= 5) {
                        newBox.width = newWidth;
                        newBox.x = x;
                    }
                } else if (dragHandle === 'e') {
                    const newWidth = x - prev.x;
                    if (newWidth >= 5) {
                        newBox.width = newWidth;
                    }
                }

                // Ensure minimum size and bounds
                newBox.width = Math.max(5, Math.min(100 - newBox.x, newBox.width));
                newBox.height = Math.max(5, Math.min(100 - newBox.y, newBox.height));

                return newBox;
            });
        };

        const handleGlobalMouseUp = () => {
            setIsDragging(false);
            setDragHandle(null);
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleGlobalMouseMove);
            document.addEventListener('mouseup', handleGlobalMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleGlobalMouseMove);
            document.removeEventListener('mouseup', handleGlobalMouseUp);
        };
    }, [isDragging, dragHandle]);

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
        } catch (error: any) {
            console.error("Error cropping PDF:", error);

            let errorMessage = "Failed to crop PDF. Please try again.";
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
        <div className="space-y-8">
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
                            Drag the edges or corners of the box on the preview to resize the crop area. Drag inside the box to move it.
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
                    >
                        <canvas ref={canvasRef} className="max-w-full h-auto block pointer-events-none" />
                        
                        {/* Crop Overlay */}
                        <div className="absolute inset-0 pointer-events-none">
                            {/* Top overlay */}
                            <div 
                                className="absolute bg-black/50"
                                style={{
                                    left: 0,
                                    top: 0,
                                    width: '100%',
                                    height: `${cropBox.y}%`
                                }}
                            />
                            {/* Bottom overlay */}
                            <div 
                                className="absolute bg-black/50"
                                style={{
                                    left: 0,
                                    top: `${cropBox.y + cropBox.height}%`,
                                    width: '100%',
                                    height: `${100 - cropBox.y - cropBox.height}%`
                                }}
                            />
                            {/* Left overlay */}
                            <div 
                                className="absolute bg-black/50"
                                style={{
                                    left: 0,
                                    top: `${cropBox.y}%`,
                                    width: `${cropBox.x}%`,
                                    height: `${cropBox.height}%`
                                }}
                            />
                            {/* Right overlay */}
                            <div 
                                className="absolute bg-black/50"
                                style={{
                                    left: `${cropBox.x + cropBox.width}%`,
                                    top: `${cropBox.y}%`,
                                    width: `${100 - cropBox.x - cropBox.width}%`,
                                    height: `${cropBox.height}%`
                                }}
                            />
                            
                            {/* Crop box border */}
                            <div 
                                className="absolute border-2 border-white cursor-move pointer-events-auto"
                                style={{
                                    left: `${cropBox.x}%`,
                                    top: `${cropBox.y}%`,
                                    width: `${cropBox.width}%`,
                                    height: `${cropBox.height}%`,
                                }}
                                onMouseDown={handleMouseDown}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
