"use client";

import { useState } from "react";
import { saveAs } from "file-saver";
import { FileUpload } from "../ui/file-upload";
import { Button } from "../ui/button";
import { ArrowRight, FileText, Settings, AlignLeft, FileType } from "lucide-react";
import { getPdfPageCount } from "../../lib/pdf-utils";

export function PdfToWordTool() {
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Options
    const [format, setFormat] = useState<"doc" | "txt">("doc");
    const [pageRange, setPageRange] = useState("");
    const [preserveLineBreaks, setPreserveLineBreaks] = useState(true);

    const handleFileSelected = (files: File[]) => {
        if (files.length > 0) {
            setFile(files[0]);
        }
    };

    const parsePageRange = (rangeStr: string, totalPages: number): Set<number> => {
        if (!rangeStr.trim()) return new Set(Array.from({ length: totalPages }, (_, i) => i + 1));

        const pages = new Set<number>();
        const parts = rangeStr.split(",");

        parts.forEach(part => {
            const range = part.trim().split("-");
            if (range.length === 2) {
                const start = parseInt(range[0]);
                const end = parseInt(range[1]);
                if (!isNaN(start) && !isNaN(end)) {
                    for (let i = start; i <= end; i++) {
                        if (i >= 1 && i <= totalPages) pages.add(i);
                    }
                }
            } else if (range.length === 1) {
                const page = parseInt(range[0]);
                if (!isNaN(page) && page >= 1 && page <= totalPages) {
                    pages.add(page);
                }
            }
        });

        return pages;
    };

    const convertToWord = async () => {
        if (!file) return;
        setIsProcessing(true);

        try {
            const { pdfStrategyManager } = await import("../../lib/pdf-service");

            const result = await pdfStrategyManager.execute('pdf-to-word', [file], {
                format,
                pageRange,
                preserveLineBreaks
            });

            saveAs(result.blob, result.fileName || `converted.${format}`);
        } catch (error) {
            console.error("Error converting PDF to Word:", error);
            alert("Failed to convert PDF to Word. Please try again.");
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
                    description="Drop a PDF file here to convert it to Word"
                />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 className="text-2xl font-bold">{file.name}</h2>
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
                        <label className="mb-2 block text-xs font-medium text-muted-foreground">Output Format</label>
                        <div className="flex gap-2">
                            <Button
                                variant={format === "doc" ? "default" : "outline"}
                                size="sm"
                                onClick={() => setFormat("doc")}
                                className="flex-1"
                            >
                                <FileText className="mr-2 h-4 w-4" /> Word (.doc)
                            </Button>
                            <Button
                                variant={format === "txt" ? "default" : "outline"}
                                size="sm"
                                onClick={() => setFormat("txt")}
                                className="flex-1"
                            >
                                <FileType className="mr-2 h-4 w-4" /> Text (.txt)
                            </Button>
                        </div>
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
                            id="breaks"
                            checked={preserveLineBreaks}
                            onChange={(e) => setPreserveLineBreaks(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300"
                        />
                        <label htmlFor="breaks" className="text-sm font-medium cursor-pointer select-none">
                            Preserve Line Breaks
                        </label>
                    </div>

                    <Button
                        size="lg"
                        onClick={convertToWord}
                        disabled={isProcessing}
                        className="w-full mt-4"
                    >
                        {isProcessing ? "Processing..." : `Convert to ${format === "doc" ? "Word" : "Text"}`}
                    </Button>
                </div>

                <div className="flex flex-col items-center justify-center rounded-xl border bg-muted/20 p-8 text-center">
                    <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <FileText className="h-10 w-10" />
                    </div>
                    <h3 className="text-lg font-semibold">Ready to Convert</h3>
                    <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                        We will extract the text from your PDF and save it as a {format === "doc" ? "Word document" : "Text file"}.
                        <br /><br />
                        <span className="text-xs opacity-70">Note: Complex layouts and images may not be fully preserved in this client-side conversion.</span>
                    </p>
                </div>
            </div>
        </div>
    );
}
