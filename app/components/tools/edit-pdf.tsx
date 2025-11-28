"use client";

import { useState, useRef, useEffect } from "react";
import { saveAs } from "file-saver";
import { FileUpload } from "../ui/file-upload";
import { Button } from "../ui/button";
import { Type, Image as ImageIcon, Trash2, Save, ChevronLeft, ChevronRight } from "lucide-react";
import { pdfStrategyManager } from "../../lib/pdf-service";
import { toast } from "../../lib/use-toast";

interface EditorElement {
    id: string;
    type: "text" | "image";
    x: number; // Percentage 0-100 relative to container
    y: number; // Percentage 0-100 relative to container
    page: number; // 1-based
    content?: string; // for text
    imageBytes?: ArrayBuffer; // for image
    imageType?: "png" | "jpg";
    fontSize?: number;
    color?: string;
    width?: number; // Percentage
    height?: number; // Percentage (aspect ratio maintained)
}

export function EditPdfTool() {
    const [file, setFile] = useState<File | null>(null);
    const [elements, setElements] = useState<EditorElement[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [numPages, setNumPages] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
    
    // Canvas refs
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const renderTaskRef = useRef<any>(null);

    // Text input state
    const [newText, setNewText] = useState("New Text");
    const [newFontSize, setNewFontSize] = useState(24);
    const [newColor, setNewColor] = useState("#000000");

    const handleFileSelected = async (files: File[]) => {
        if (files.length > 0) {
            setFile(files[0]);
            setElements([]);
            setCurrentPage(1);
            
            // Load PDF to get page count
            const pdfjsLib = await import("pdfjs-dist");
            if (typeof window !== "undefined") {
                pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
            }
            const arrayBuffer = await files[0].arrayBuffer();
            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
            setNumPages(pdf.numPages);
        }
    };

    // Render current page
    useEffect(() => {
        if (!file || !canvasRef.current) return;

        const renderPage = async () => {
            // Cancel any ongoing render
            if (renderTaskRef.current) {
                renderTaskRef.current.cancel();
            }

            const pdfjsLib = await import("pdfjs-dist");
            if (typeof window !== "undefined") {
                pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
            }
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
            const page = await pdf.getPage(currentPage);
            
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = canvasRef.current!;
            const context = canvas.getContext("2d")!;

            canvas.height = viewport.height;
            canvas.width = viewport.width;

            const renderTask = page.render({
                canvasContext: context,
                viewport: viewport,
                canvas: canvas,
            });
            renderTaskRef.current = renderTask;

            await renderTask.promise;
            renderTaskRef.current = null;
        };

        renderPage();
    }, [file, currentPage]);

    // Cleanup render task on unmount
    useEffect(() => {
        return () => {
            if (renderTaskRef.current) {
                renderTaskRef.current.cancel();
            }
        };
    }, []);

    const addTextElement = () => {
        const id = Math.random().toString(36).substr(2, 9);
        setElements([
            ...elements,
            {
                id,
                type: "text",
                x: 50, // Center
                y: 50, // Center
                page: currentPage,
                content: newText,
                fontSize: newFontSize,
                color: newColor,
            },
        ]);
        setSelectedElementId(id);
    };

    const addImageElement = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const imgFile = e.target.files[0];
            const arrayBuffer = await imgFile.arrayBuffer();
            const id = Math.random().toString(36).substr(2, 9);
            
            setElements([
                ...elements,
                {
                    id,
                    type: "image",
                    x: 50,
                    y: 50,
                    page: currentPage,
                    imageBytes: arrayBuffer,
                    imageType: imgFile.type.includes("png") ? "png" : "jpg",
                    width: 20, // Default width 20%
                },
            ]);
            setSelectedElementId(id);
        }
    };

    const updateElementPosition = (id: string, x: number, y: number) => {
        setElements(elements.map(el => el.id === id ? { ...el, x, y } : el));
    };

    const removeElement = (id: string) => {
        setElements(elements.filter(el => el.id !== id));
        if (selectedElementId === id) setSelectedElementId(null);
    };

    const savePdf = async () => {
        if (!file) return;
        setIsProcessing(true);

        try {
            const result = await pdfStrategyManager.execute('edit', [file], {
                elements
            });

            saveAs(result.blob, result.fileName || `edited-${file.name}`);
            
            toast.show({
                title: "Success",
                message: "PDF edited successfully!",
                variant: "success",
                position: "top-right",
            });
        } catch (error) {
            console.error("Error saving PDF:", error);
            toast.show({
                title: "Save Failed",
                message: "Failed to save PDF. Please try again.",
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
                    description="Drop a PDF file here to edit it"
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
                    <Button onClick={savePdf} disabled={isProcessing}>
                        {isProcessing ? "Saving..." : <><Save className="mr-2 h-4 w-4" /> Save PDF</>}
                    </Button>
                </div>
            </div>

            <div className="grid gap-8 md:grid-cols-4">
                <div className="space-y-6 rounded-xl border bg-card p-4 h-fit">
                    <h3 className="font-semibold">Tools</h3>
                    
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-medium">Add Text</label>
                            <input
                                type="text"
                                value={newText}
                                onChange={(e) => setNewText(e.target.value)}
                                className="w-full rounded-md border px-2 py-1 text-sm"
                            />
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    value={newFontSize}
                                    onChange={(e) => setNewFontSize(Number(e.target.value))}
                                    className="w-16 rounded-md border px-2 py-1 text-sm"
                                    title="Font Size"
                                />
                                <input
                                    type="color"
                                    value={newColor}
                                    onChange={(e) => setNewColor(e.target.value)}
                                    className="h-8 w-8 rounded-md border cursor-pointer"
                                    title="Color"
                                />
                            </div>
                            <Button onClick={addTextElement} className="w-full" size="sm">
                                <Type className="mr-2 h-4 w-4" /> Add Text
                            </Button>
                        </div>

                        <div className="space-y-2 pt-4 border-t">
                            <label className="text-xs font-medium">Add Image</label>
                            <div className="relative">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={addImageElement}
                                    className="hidden"
                                    id="image-upload"
                                />
                                <Button asChild variant="outline" className="w-full" size="sm">
                                    <label htmlFor="image-upload" className="cursor-pointer">
                                        <ImageIcon className="mr-2 h-4 w-4" /> Upload Image
                                    </label>
                                </Button>
                            </div>
                        </div>
                    </div>

                    {selectedElementId && (
                        <div className="pt-4 border-t">
                            <h4 className="text-xs font-semibold mb-2">Selected Element</h4>
                            <Button 
                                variant="destructive" 
                                size="sm" 
                                className="w-full"
                                onClick={() => removeElement(selectedElementId)}
                            >
                                <Trash2 className="mr-2 h-4 w-4" /> Remove
                            </Button>
                        </div>
                    )}
                </div>

                <div className="md:col-span-3 bg-muted/20 rounded-xl p-4 overflow-auto flex justify-center relative min-h-[600px]">
                    <div 
                        ref={containerRef}
                        className="relative shadow-lg"
                        style={{ width: "fit-content", height: "fit-content" }}
                    >
                        <canvas ref={canvasRef} className="max-w-full h-auto block" />
                        
                        {/* Overlay Layer */}
                        <div className="absolute inset-0">
                            {elements.filter(el => el.page === currentPage).map((el) => (
                                <div
                                    key={el.id}
                                    className={`absolute cursor-move group ${selectedElementId === el.id ? 'ring-2 ring-primary' : ''}`}
                                    style={{
                                        left: `${el.x}%`,
                                        top: `${el.y}%`,
                                        transform: 'translate(0, 0)', // We position top-left at the coordinate
                                        maxWidth: el.type === 'image' ? `${el.width}%` : 'auto',
                                    }}
                                    onMouseDown={(e) => {
                                        e.stopPropagation();
                                        setSelectedElementId(el.id);
                                        
                                        // Simple drag implementation
                                        const container = containerRef.current;
                                        if (!container) return;
                                        
                                        const startX = e.clientX;
                                        const startY = e.clientY;
                                        const startLeft = el.x;
                                        const startTop = el.y;
                                        const containerRect = container.getBoundingClientRect();

                                        const onMouseMove = (moveEvent: MouseEvent) => {
                                            const dx = moveEvent.clientX - startX;
                                            const dy = moveEvent.clientY - startY;
                                            
                                            const dxPercent = (dx / containerRect.width) * 100;
                                            const dyPercent = (dy / containerRect.height) * 100;
                                            
                                            updateElementPosition(el.id, Math.max(0, Math.min(100, startLeft + dxPercent)), Math.max(0, Math.min(100, startTop + dyPercent)));
                                        };

                                        const onMouseUp = () => {
                                            document.removeEventListener('mousemove', onMouseMove);
                                            document.removeEventListener('mouseup', onMouseUp);
                                        };

                                        document.addEventListener('mousemove', onMouseMove);
                                        document.addEventListener('mouseup', onMouseUp);
                                    }}
                                >
                                    {el.type === 'text' ? (
                                        <div 
                                            style={{ 
                                                fontSize: `${el.fontSize}px`, // This is approximate relative to screen, not PDF
                                                color: el.color,
                                                whiteSpace: 'nowrap',
                                                userSelect: 'none',
                                                // Scale font size based on canvas width to match PDF relative size roughly
                                                // For now, just using px is okay for visual feedback
                                            }}
                                            className="font-sans"
                                        >
                                            {el.content}
                                        </div>
                                    ) : (
                                        <img 
                                            src={URL.createObjectURL(new Blob([el.imageBytes!]))} 
                                            alt="element"
                                            className="w-full h-auto pointer-events-none"
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
