"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { FileUpload } from "../ui/file-upload";
import { Button } from "../ui/button";
import { ArrowRight, Download, Trash2, FileText, Settings, CheckSquare, Square } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { pdfStrategyManager } from "../../lib/pdf-service";
import { toast } from "../../lib/use-toast";

interface MergeFile {
    id: string;
    file: File;
    range: string;
}

export function MergePdfTool() {
    const [files, setFiles] = useState<MergeFile[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [flatten, setFlatten] = useState(false);

    const handleFilesSelected = (newFiles: File[]) => {
        const newMergeFiles = newFiles.map(f => ({
            id: Math.random().toString(36).substr(2, 9),
            file: f,
            range: "all"
        }));
        setFiles((prev) => [...prev, ...newMergeFiles]);
    };

    const removeFile = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const updateRange = (index: number, range: string) => {
        setFiles(prev => prev.map((f, i) => i === index ? { ...f, range } : f));
    };

    const onDragEnd = (result: any) => {
        if (!result.destination) return;
        const items = Array.from(files);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);
        setFiles(items);
    };

    const parsePageRange = (rangeStr: string, totalPages: number): number[] => {
        if (!rangeStr || rangeStr.trim().toLowerCase() === 'all') {
            return Array.from({ length: totalPages }, (_, i) => i);
        }

        const pages = new Set<number>();
        const parts = rangeStr.split(',');

        for (const part of parts) {
            const trimmed = part.trim();
            if (trimmed.includes('-')) {
                const [start, end] = trimmed.split('-').map(Number);
                if (!isNaN(start) && !isNaN(end)) {
                    for (let i = start; i <= end; i++) {
                        if (i >= 1 && i <= totalPages) pages.add(i - 1);
                    }
                }
            } else {
                const page = Number(trimmed);
                if (!isNaN(page) && page >= 1 && page <= totalPages) {
                    pages.add(page - 1);
                }
            }
        }

        return Array.from(pages).sort((a, b) => a - b);
    };

    const mergePdfs = async () => {
        if (files.length < 2) return;
        setIsProcessing(true);

        try {
            const ranges = files.map(f => f.range);
            const fileObjects = files.map(f => f.file);
            
            const result = await pdfStrategyManager.execute('merge', fileObjects, { 
                ranges, 
                flatten 
            });

            const url = URL.createObjectURL(result.blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = result.fileName || "merged-document.pdf";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            toast.show({
                title: "Success",
                message: "PDFs merged successfully!",
                variant: "success",
                position: "top-right",
            });
        } catch (error: any) {
            console.error("Error merging PDFs:", error);

            let errorMessage = "Failed to merge PDFs. Please try again.";
            if (error.message?.includes('corrupted') || error.message?.includes('Invalid PDF structure')) {
                errorMessage = "One or more PDF files appear to be corrupted. Try using the Repair PDF tool first.";
            } else if (error.message?.includes('encrypted') || error.message?.includes('password')) {
                errorMessage = "One or more PDF files are encrypted. Please use the Unlock PDF tool first.";
            }

            toast.show({
                title: "Merge Failed",
                message: errorMessage,
                variant: "error",
                position: "top-right",
            });
        } finally {
            setIsProcessing(false);
        }
    };

    if (files.length === 0) {
        return (
            <div className="mx-auto max-w-2xl">
                <FileUpload
                    onFilesSelected={handleFilesSelected}
                    maxFiles={20}
                    accept={{ "application/pdf": [".pdf"] }}
                    description="Drop PDF files here to merge them"
                />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Selected Files ({files.length})</h2>
                <div className="flex gap-4">
                    <FileUpload
                        onFilesSelected={handleFilesSelected}
                        maxFiles={20}
                        accept={{ "application/pdf": [".pdf"] }}
                        description="Add more"
                    />
                    <Button variant="outline" onClick={() => setFiles([])}>
                        Clear All
                    </Button>
                </div>
            </div>

            <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="files" direction="horizontal">
                    {(provided) => (
                        <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                        >
                            {files.map((item, index) => (
                                <Draggable key={item.id} draggableId={item.id} index={index}>
                                    {(provided) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                            className="relative flex flex-col items-center rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
                                        >
                                            <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                                <FileText className="h-8 w-8" />
                                            </div>
                                            <p className="mb-1 w-full truncate text-center text-sm font-medium" title={item.file.name}>
                                                {item.file.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground mb-3">
                                                {(item.file.size / 1024 / 1024).toFixed(2)} MB
                                            </p>
                                            
                                            <div className="w-full space-y-1">
                                                <label className="text-[10px] font-medium text-muted-foreground uppercase">Page Range</label>
                                                <input 
                                                    type="text" 
                                                    value={item.range}
                                                    onChange={(e) => updateRange(index, e.target.value)}
                                                    className="w-full rounded border px-2 py-1 text-xs"
                                                    placeholder="e.g. 1-3, 5, all"
                                                />
                                            </div>

                                            <button
                                                onClick={() => removeFile(index)}
                                                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm transition-transform hover:scale-110"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </button>
                                        </div>
                                    )}
                                </Draggable>
                            ))}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </DragDropContext>

            <div className="flex flex-col items-center gap-4 pt-8">
                <div className="flex items-center gap-2">
                    <Button
                        variant={flatten ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFlatten(!flatten)}
                        className="gap-2"
                    >
                        {flatten ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                        Flatten Forms
                    </Button>
                    <span className="text-xs text-muted-foreground">
                        (Prevents form fields from being editable in the merged file)
                    </span>
                </div>

                <Button
                    size="lg"
                    onClick={mergePdfs}
                    disabled={isProcessing || files.length < 2}
                    className="h-14 min-w-[200px] text-lg"
                >
                    {isProcessing ? (
                        "Merging..."
                    ) : (
                        <>
                            Merge PDF <ArrowRight className="ml-2 h-5 w-5" />
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
