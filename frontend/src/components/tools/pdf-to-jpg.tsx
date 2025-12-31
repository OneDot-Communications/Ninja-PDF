"use client";

import { useState } from "react";
import { saveAs } from "file-saver";
import FileUploadHero from "../ui/file-upload-hero"; // Hero uploader (big CTA, full-page drag overlay)
import { Button } from "../ui/button";
import { ArrowRight, Settings, Loader2 } from "lucide-react";
import { PdfPreview } from "../ui/pdf-preview";
import { toast } from "@/lib/hooks/use-toast";
import { pdfApi } from "@/lib/services/pdf-api";

export function PdfToJpgTool() {
    const [file, setFile] = useState<File | null>(null);
    const [numPages, setNumPages] = useState<number>(0);
    const [isProcessing, setIsProcessing] = useState(false);

    // Options
    const [format, setFormat] = useState<"jpeg" | "png">("jpeg");
    const [dpi, setDpi] = useState<72 | 150 | 300>(150);
    const [pageRange, setPageRange] = useState("");
    const [mergeOutput, setMergeOutput] = useState(false);

    const handleFileSelected = (files: File[]) => {
        if (files.length > 0) {
            setFile(files[0]);
            setNumPages(0);
        }
    };

    const convertToImages = async () => {
        if (!file) return;
        setIsProcessing(true);

        try {
            // Backend-first with client-side fallback
            const result = await pdfApi.pdfToJpg(file);

            saveAs(result.blob, result.fileName);

            toast.show({
                title: "Success",
                message: "PDF converted successfully!",
                variant: "success",
                position: "top-right",
            });

            // Clear the file after successful conversion to return to upload page
            setFile(null);
            setNumPages(0);
        } catch (error) {
            console.error("Error converting PDF to Image:", error);
            toast.show({
                title: "Conversion Failed",
                message: "Failed to convert PDF. Please try again.",
                variant: "error",
                position: "top-right",
            });
        } finally {
            setIsProcessing(false);
        }
    };

    if (!file) {
        return (
            <div className="min-h-[calc(100vh-120px)] flex items-center justify-center">
                <FileUploadHero
                    title="PDF to JPG"
                    onFilesSelected={handleFileSelected}
                    maxFiles={1}
                    accept={{ "application/pdf": [".pdf"] }}
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
                        {numPages > 0 ? `${numPages} pages` : "Loading pages..."}
                    </p>
                </div>
                <div className="flex gap-4">
                    <Button variant="outline" onClick={() => setFile(null)}>
                        Change File
                    </Button>
                </div>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
                <div className="space-y-6 rounded-xl border bg-card p-6">
                    <h3 className="font-semibold flex items-center gap-2">
                        <Settings className="h-5 w-5" /> Conversion Settings
                    </h3>

                    <div>
                        <label className="mb-2 block text-xs font-medium text-muted-foreground">Format</label>
                        <div className="flex gap-2">
                            <Button
                                variant={format === "jpeg" ? "default" : "outline"}
                                size="sm"
                                onClick={() => setFormat("jpeg")}
                                className="flex-1"
                            >
                                JPG
                            </Button>
                            <Button
                                variant={format === "png" ? "default" : "outline"}
                                size="sm"
                                onClick={() => setFormat("png")}
                                className="flex-1"
                            >
                                PNG
                            </Button>
                        </div>
                    </div>

                    <div>
                        <label className="mb-2 block text-xs font-medium text-muted-foreground">DPI (Quality)</label>
                        <div className="flex gap-2">
                            {[72, 150, 300].map((d) => (
                                <Button
                                    key={d}
                                    variant={dpi === d ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setDpi(d as any)}
                                    className="flex-1"
                                >
                                    {d} DPI
                                </Button>
                            ))}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            {dpi === 72 ? "Screen (Low)" : dpi === 150 ? "E-book (Medium)" : "Print (High)"}
                        </p>
                    </div>

                    <div>
                        <label className="mb-2 block text-xs font-medium text-muted-foreground">Page Range (Optional)</label>
                        <input
                            type="text"
                            placeholder="e.g. 1-5, 8"
                            value={pageRange}
                            onChange={(e) => setPageRange(e.target.value)}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                    </div>

                    <div className="flex items-center gap-2 rounded-lg border p-3">
                        <input
                            type="checkbox"
                            id="merge"
                            checked={mergeOutput}
                            onChange={(e) => setMergeOutput(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300"
                        />
                        <label htmlFor="merge" className="text-sm font-medium cursor-pointer select-none">
                            Merge all pages into one long image
                        </label>
                    </div>

                    <Button
                        size="lg"
                        onClick={convertToImages}
                        disabled={isProcessing}
                        className="w-full mt-4"
                    >
                        {isProcessing ? (
                            <span className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Converting...
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                Convert to {format.toUpperCase()} <ArrowRight className="h-4 w-4" />
                            </span>
                        )}
                    </Button>
                </div>

                <div className="flex justify-center rounded-xl border bg-muted/20 p-8">
                    <div className="max-w-sm shadow-lg">
                        <PdfPreview file={file} onLoadSuccess={setNumPages} />
                    </div>
                </div>
            </div>
        </div>
    );
}
