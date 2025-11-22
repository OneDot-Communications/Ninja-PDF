"use client";

import { useState, useEffect, useRef } from "react";
import { saveAs } from "file-saver";
import { FileUpload } from "../ui/file-upload";
import { Button } from "../ui/button";
import { Trash2, RotateCw, Plus, CheckSquare, RotateCcw } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { cn } from "../../lib/utils";
import { pdfStrategyManager } from "../../lib/pdf-strategies";
import { toast } from "../../lib/use-toast";

interface PageItem {
    id: string;
    originalIndex: number; // 0-based index in original file
    rotation: number; // Additional rotation (0, 90, 180, 270)
    isBlank?: boolean;
}

// Thumbnail component to render a single page from the shared PDF proxy
const PageThumbnail = ({ 
    pdf, 
    pageIndex, 
    rotation, 
    isBlank 
}: { 
    pdf: any, 
    pageIndex: number, 
    rotation: number, 
    isBlank?: boolean 
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (isBlank || !pdf || !canvasRef.current) return;

        const render = async () => {
            try {
                const pdfjsLib = await import("pdfjs-dist");
                if (typeof window !== "undefined") {
                    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
                }
                const page = await pdf.getPage(pageIndex + 1);
                const viewport = page.getViewport({ scale: 0.3 }); // Thumbnail scale
                const canvas = canvasRef.current!;
                const context = canvas.getContext("2d")!;

                canvas.height = viewport.height;
                canvas.width = viewport.width;

                await page.render({
                    canvasContext: context,
                    viewport: viewport,
                    canvas: canvas,
                }).promise;
            } catch (err) {
                console.error("Error rendering thumbnail:", err);
            }
        };

        render();
    }, [pdf, pageIndex, isBlank]);

    if (isBlank) {
        return (
            <div className="flex h-full w-full items-center justify-center bg-white text-xs text-muted-foreground border border-dashed">
                Blank Page
            </div>
        );
    }

    return (
        <canvas 
            ref={canvasRef} 
            className="h-full w-full object-contain transition-transform duration-300"
            style={{ transform: `rotate(${rotation}deg)` }}
        />
    );
};

export function OrganizePdfTool() {
    const [file, setFile] = useState<File | null>(null);
    const [pdfProxy, setPdfProxy] = useState<any>(null);
    const [pages, setPages] = useState<PageItem[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set());

    const handleFileSelected = async (files: File[]) => {
        if (files.length > 0) {
            const selectedFile = files[0];
            setFile(selectedFile);
            setPages([]);
            setSelectedPages(new Set());

            try {
                const pdfjsLib = await import("pdfjs-dist");
                if (typeof window !== "undefined") {
                    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
                }
                const arrayBuffer = await selectedFile.arrayBuffer();
                const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
                setPdfProxy(pdf);

                const newPages: PageItem[] = [];
                for (let i = 0; i < pdf.numPages; i++) {
                    newPages.push({
                        id: Math.random().toString(36).substr(2, 9),
                        originalIndex: i,
                        rotation: 0
                    });
                }
                setPages(newPages);
            } catch (error) {
                console.error("Error loading PDF:", error);
                toast.show({
                    title: "Load Failed",
                    message: "Failed to load PDF.",
                    variant: "error",
                    position: "top-right",
                });
            }
        }
    };

    const toggleSelection = (id: string) => {
        const newSelection = new Set(selectedPages);
        if (newSelection.has(id)) {
            newSelection.delete(id);
        } else {
            newSelection.add(id);
        }
        setSelectedPages(newSelection);
    };

    const rotateSelected = (angle: number) => {
        setPages(prev => prev.map(p => {
            if (selectedPages.has(p.id)) {
                return { ...p, rotation: (p.rotation + angle) % 360 };
            }
            return p;
        }));
    };

    const deleteSelected = () => {
        setPages(prev => prev.filter(p => !selectedPages.has(p.id)));
        setSelectedPages(new Set());
    };

    const addBlankPage = () => {
        setPages(prev => [
            ...prev,
            {
                id: Math.random().toString(36).substr(2, 9),
                originalIndex: -1,
                rotation: 0,
                isBlank: true
            }
        ]);
    };

    const onDragEnd = (result: any) => {
        if (!result.destination) return;
        const items = Array.from(pages);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);
        setPages(items);
    };

    const savePdf = async () => {
        if (!file) return;
        setIsProcessing(true);

        try {
            const result = await pdfStrategyManager.execute('organize', [file], {
                pages
            });

            saveAs(result.blob, result.fileName || `organized-${file.name}`);
            
            toast.show({
                title: "Success",
                message: "PDF organized successfully!",
                variant: "success",
                position: "top-right",
            });
        } catch (error) {
            console.error("Error organizing PDF:", error);
            toast.show({
                title: "Operation Failed",
                message: "Failed to organize PDF. Please try again.",
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
                    description="Drop a PDF file here to organize pages"
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
                        {pages.length} pages • {selectedPages.size} selected
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setFile(null)}>
                        Change File
                    </Button>
                    <Button onClick={savePdf} disabled={isProcessing || pages.length === 0}>
                        {isProcessing ? "Saving..." : "Save PDF"}
                    </Button>
                </div>
            </div>

            <div className="flex flex-wrap gap-2 p-4 bg-muted/30 rounded-xl border">
                <Button variant="outline" size="sm" onClick={() => rotateSelected(90)} disabled={selectedPages.size === 0}>
                    <RotateCw className="mr-2 h-4 w-4" /> Rotate Right
                </Button>
                <Button variant="outline" size="sm" onClick={() => rotateSelected(-90)} disabled={selectedPages.size === 0}>
                    <RotateCcw className="mr-2 h-4 w-4" /> Rotate Left
                </Button>
                <Button variant="destructive" size="sm" onClick={deleteSelected} disabled={selectedPages.size === 0}>
                    <Trash2 className="mr-2 h-4 w-4" /> Delete Selected
                </Button>
                <div className="w-px h-8 bg-border mx-2" />
                <Button variant="outline" size="sm" onClick={addBlankPage}>
                    <Plus className="mr-2 h-4 w-4" /> Add Blank Page
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedPages(new Set(pages.map(p => p.id)))}>
                    Select All
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedPages(new Set())}>
                    Deselect All
                </Button>
            </div>

            <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="pages" direction="horizontal">
                    {(provided) => (
                        <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
                        >
                            {pages.map((page, index) => (
                                <Draggable key={page.id} draggableId={page.id} index={index}>
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                            onClick={() => toggleSelection(page.id)}
                                            className={cn(
                                                "group relative flex flex-col items-center rounded-lg border bg-card p-2 shadow-sm transition-all cursor-pointer",
                                                snapshot.isDragging && "ring-2 ring-primary rotate-2 z-50 shadow-xl",
                                                selectedPages.has(page.id) ? "ring-2 ring-primary bg-primary/5" : "hover:shadow-md"
                                            )}
                                        >
                                            <div className="relative aspect-[1/1.4] w-full overflow-hidden rounded-md bg-muted/20">
                                                <PageThumbnail 
                                                    pdf={pdfProxy} 
                                                    pageIndex={page.originalIndex} 
                                                    rotation={page.rotation}
                                                    isBlank={page.isBlank}
                                                />
                                                {selectedPages.has(page.id) && (
                                                    <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-0.5">
                                                        <CheckSquare className="h-4 w-4" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="mt-2 flex w-full items-center justify-between px-1">
                                                <span className="text-xs font-medium text-muted-foreground">
                                                    {page.isBlank ? "Blank" : `Page ${page.originalIndex + 1}`}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                    {index + 1}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </Draggable>
                            ))}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </DragDropContext>
        </div>
    );
}
