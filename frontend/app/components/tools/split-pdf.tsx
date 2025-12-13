"use client";

import { useState } from "react";
import { saveAs } from "file-saver";
import { FileUpload } from "../ui/file-upload";
import { Button } from "../ui/button";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { pdfApi } from "../../lib/pdf-api";
import { getPdfJs } from "../../lib/pdf-service";
import { toast } from "../../lib/use-toast";

export function SplitPdfTool() {
    const [file, setFile] = useState<File | null>(null);
    const [numPages, setNumPages] = useState<number>(0);
    const [selectedPages, setSelectedPages] = useState<number[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [splitMode, setSplitMode] = useState<"merge" | "separate">("merge");
    const [thumbnails, setThumbnails] = useState<string[]>([]);
    const [loadingThumbnails, setLoadingThumbnails] = useState(false);

    const handleFileSelected = async (files: File[]) => {
        if (files.length > 0) {
            const selectedFile = files[0];
            setFile(selectedFile);
            setSelectedPages([]);
            setNumPages(0);
            setThumbnails([]);
            await generateThumbnails(selectedFile);
        }
    };

    const generateThumbnails = async (file: File) => {
        setLoadingThumbnails(true);
        try {
            const pdfjsLib = await getPdfJs();
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await (pdfjsLib as any).getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
            setNumPages(pdf.numPages);

            const thumbs: string[] = [];
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 0.2 });
                const canvas = document.createElement("canvas");
                const context = canvas.getContext("2d");
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                if (context) {
                    await page.render({
                        canvasContext: context,
                        viewport: viewport,
                        canvas: canvas
                    }).promise;
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

    const togglePageSelection = (pageIndex: number) => {
        setSelectedPages((prev) =>
            prev.includes(pageIndex)
                ? prev.filter((p) => p !== pageIndex)
                : [...prev, pageIndex].sort((a, b) => a - b)
        );
    };

    const selectAll = () => {
        if (selectedPages.length === numPages) {
            setSelectedPages([]);
        } else {
            setSelectedPages(Array.from({ length: numPages }, (_, i) => i + 1));
        }
    };

    const splitPdf = async () => {
        if (!file || selectedPages.length === 0) return;
        setIsProcessing(true);

        try {
            const result = await pdfApi.split(file, {
                selectedPages,
                splitMode
            });

            saveAs(result.blob, result.fileName || `split-${file.name}`);

            toast.show({
                title: "Success",
                message: "PDF split successfully!",
                variant: "success",
                position: "top-right",
            });
        } catch (error: any) {
            console.error("Error splitting PDF:", error);

            let errorMessage = "Failed to split PDF. Please try again.";
            if (error.message?.includes('corrupted') || error.message?.includes('Invalid PDF structure')) {
                errorMessage = "The PDF file appears to be corrupted. Try using the Repair PDF tool first.";
            } else if (error.message?.includes('encrypted') || error.message?.includes('password')) {
                errorMessage = "The PDF is encrypted. Please use the Unlock PDF tool first.";
            }

            toast.show({
                title: "Split Failed",
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
                    description="Drop a PDF file here to split it"
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
                    <Button variant="secondary" onClick={selectAll}>
                        {selectedPages.length === numPages ? "Deselect All" : "Select All"}
                    </Button>
                </div>
            </div>

            {loadingThumbnails ? (
                <div className="flex h-60 items-center justify-center">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <span className="ml-4 text-lg font-medium">Generating thumbnails...</span>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 max-h-[60vh] overflow-y-auto p-2">
                    {thumbnails.map((src, i) => {
                        const pageNum = i + 1;
                        const isSelected = selectedPages.includes(pageNum);
                        return (
                            <div
                                key={pageNum}
                                onClick={() => togglePageSelection(pageNum)}
                                className={cn(
                                    "group relative cursor-pointer overflow-hidden rounded-lg border-2 transition-all hover:shadow-md",
                                    isSelected ? "border-primary ring-2 ring-primary ring-offset-2" : "border-transparent hover:border-primary/50"
                                )}
                            >
                                <div className="aspect-[1/1.4] bg-muted/20">
                                    <img
                                        src={src}
                                        alt={`Page ${pageNum}`}
                                        className="h-full w-full object-contain"
                                    />
                                </div>
                                <div className="absolute bottom-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-background shadow-sm">
                                    <span className="text-xs font-medium">{pageNum}</span>
                                </div>
                                {isSelected && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
                                        <CheckCircle2 className="h-8 w-8 text-primary drop-shadow-md" />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="flex flex-col items-center gap-6 border-t pt-8">
                <div className="flex gap-4 rounded-lg border p-1">
                    <Button
                        variant={splitMode === "merge" ? "default" : "ghost"}
                        onClick={() => setSplitMode("merge")}
                        className="w-40"
                    >
                        Merge Selected
                    </Button>
                    <Button
                        variant={splitMode === "separate" ? "default" : "ghost"}
                        onClick={() => setSplitMode("separate")}
                        className="w-40"
                    >
                        Extract Separately
                    </Button>
                </div>

                <Button
                    size="lg"
                    onClick={splitPdf}
                    disabled={isProcessing || selectedPages.length === 0 || loadingThumbnails}
                    className="h-14 min-w-[200px] text-lg"
                >
                    {isProcessing ? (
                        "Processing..."
                    ) : (
                        <>
                            Split PDF <ArrowRight className="ml-2 h-5 w-5" />
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
