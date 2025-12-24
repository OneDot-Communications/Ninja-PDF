"use client";

import { useState } from "react";
import { saveAs } from "file-saver";
import { FileUpload } from "../ui/file-upload";
import { Button } from "../ui/button";
import { ArrowRight, Trash2, Settings } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { pdfStrategyManager } from "@/lib/services/pdf-service";
import { toast } from "@/lib/hooks/use-toast";
import { useRouter } from "next/navigation";

export function JpgToPdfTool() {
    const router = useRouter();
    const [files, setFiles] = useState<File[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    // Options
    const [pageSize, setPageSize] = useState<"auto" | "a4" | "letter">("a4");
    const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
    const [margin, setMargin] = useState<"none" | "small" | "large">("small");

    const handleFilesSelected = (newFiles: File[]) => {
        setFiles((prev) => [...prev, ...newFiles]);
    };

    const removeFile = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const onDragEnd = (result: any) => {
        if (!result.destination) return;
        const items = Array.from(files);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);
        setFiles(items);
    };

    const convertToPdf = async () => {
        if (files.length === 0) return;
        setIsProcessing(true);

        try {
            // Use pdfStrategyManager with page settings options
            const result = await pdfStrategyManager.execute('convert-to-pdf', files, {
                pageSize,
                orientation,
                margin,
            });

            saveAs(result.blob, result.fileName || 'converted-images.pdf');

            toast.show({
                title: "Success",
                message: "Images converted to PDF successfully!",
                variant: "success",
                position: "top-right",
            });
        } catch (error: any) {
            console.error("Error converting images to PDF:", error);

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
            <div className="mx-auto max-w-2xl">
                <FileUpload
                    onFilesSelected={handleFilesSelected}
                    accept={{ "image/jpeg": [".jpg", ".jpeg"], "image/png": [".png"], "image/gif": [".gif"], "image/webp": [".webp"], "image/bmp": [".bmp"] }}
                    maxFiles={50}
                    description="Drop JPG, PNG, GIF, WEBP or BMP images here"
                />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Selected Images ({files.length})</h2>
                <div className="flex gap-2">
                    <FileUpload
                        onFilesSelected={handleFilesSelected}
                        accept={{ "image/jpeg": [".jpg", ".jpeg"], "image/png": [".png"], "image/gif": [".gif"], "image/webp": [".webp"], "image/bmp": [".bmp"] }}
                        maxFiles={50}
                        variant="compact"
                    />
                    <Button variant="outline" onClick={() => setFiles([])}>
                        Clear All
                    </Button>
                </div>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
                <div className="md:col-span-2">
                    <DragDropContext onDragEnd={onDragEnd}>
                        <Droppable droppableId="files" direction="horizontal">
                            {(provided) => (
                                <div
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}
                                    className="grid gap-4 grid-cols-2 sm:grid-cols-3"
                                >
                                    {files.map((file, index) => (
                                        <Draggable key={`${file.name}-${index}`} draggableId={`${file.name}-${index}`} index={index}>
                                            {(provided) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    {...provided.dragHandleProps}
                                                    className="relative flex flex-col items-center rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
                                                >
                                                    {/* Page Frame Preview - reflects page size, orientation, margins */}
                                                    <div className="flex items-center justify-center w-full" style={{ minHeight: 150 }}>
                                                        <div
                                                            className="relative bg-white border-2 border-gray-300 shadow-lg flex items-center justify-center transition-all duration-300"
                                                            style={{
                                                                // Page dimensions: A4 (1:1.414), Letter (1:1.294), Auto (square)
                                                                width: (() => {
                                                                    if (pageSize === 'auto') return 120;
                                                                    const isLandscape = orientation === 'landscape';
                                                                    return isLandscape ? 160 : (pageSize === 'letter' ? 105 : 100);
                                                                })(),
                                                                height: (() => {
                                                                    if (pageSize === 'auto') return 120;
                                                                    const isLandscape = orientation === 'landscape';
                                                                    if (isLandscape) {
                                                                        return pageSize === 'letter' ? 105 : 100;
                                                                    }
                                                                    return pageSize === 'letter' ? 130 : 140;
                                                                })(),
                                                            }}
                                                        >
                                                            {/* Margin indicator */}
                                                            <div
                                                                className="absolute inset-0 border-dashed border-blue-400 transition-all duration-300"
                                                                style={{
                                                                    margin: margin === 'none' ? 0 : margin === 'small' ? 4 : 10,
                                                                    borderWidth: margin === 'none' ? 0 : 2,
                                                                }}
                                                            />
                                                            {/* Image inside page */}
                                                            <div
                                                                className="overflow-hidden flex items-center justify-center transition-all duration-300"
                                                                style={{
                                                                    width: `calc(100% - ${margin === 'none' ? 0 : margin === 'small' ? 12 : 24}px)`,
                                                                    height: `calc(100% - ${margin === 'none' ? 0 : margin === 'small' ? 12 : 24}px)`,
                                                                }}
                                                            >
                                                                <img
                                                                    src={URL.createObjectURL(file)}
                                                                    alt={file.name}
                                                                    className="max-h-full max-w-full object-contain"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <p className="mt-3 w-full truncate text-center text-xs font-medium" title={file.name}>
                                                        {file.name}
                                                    </p>
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
                </div>

                <div className="space-y-6 rounded-xl border bg-card p-6 h-fit">
                    <h3 className="font-semibold flex items-center gap-2">
                        <Settings className="h-5 w-5" /> Page Settings
                    </h3>

                    <div>
                        <label className="mb-2 block text-xs font-medium text-muted-foreground">Page Size</label>
                        <div className="flex gap-2">
                            {["auto", "a4", "letter"].map((s) => (
                                <Button
                                    key={s}
                                    variant={pageSize === s ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setPageSize(s as any)}
                                    className="flex-1 capitalize"
                                >
                                    {s}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {pageSize !== "auto" && (
                        <div>
                            <label className="mb-2 block text-xs font-medium text-muted-foreground">Orientation</label>
                            <div className="flex gap-2">
                                {["portrait", "landscape"].map((o) => (
                                    <Button
                                        key={o}
                                        variant={orientation === o ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setOrientation(o as any)}
                                        className="flex-1 capitalize"
                                    >
                                        {o}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}

                    {pageSize !== "auto" && (
                        <div>
                            <label className="mb-2 block text-xs font-medium text-muted-foreground">Margins</label>
                            <div className="flex gap-2">
                                {["none", "small", "large"].map((m) => (
                                    <Button
                                        key={m}
                                        variant={margin === m ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setMargin(m as any)}
                                        className="flex-1 capitalize"
                                    >
                                        {m}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}

                    <Button
                        size="lg"
                        onClick={convertToPdf}
                        disabled={isProcessing || files.length === 0}
                        className="w-full mt-4"
                    >
                        {isProcessing ? (
                            "Converting..."
                        ) : (
                            <>
                                Convert to PDF <ArrowRight className="ml-2 h-5 w-5" />
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
