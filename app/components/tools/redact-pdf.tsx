"use client";

import { useState } from "react";
import { saveAs } from "file-saver";
import { FileUpload } from "../ui/file-upload";
import { Button } from "../ui/button";
import { PdfPreview } from "../ui/pdf-preview";
import { pdfStrategyManager } from "../../lib/pdf-strategies";
import { toast } from "../../lib/use-toast";

export function RedactPdfTool() {
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [searchText, setSearchText] = useState("");
    const [redactionCount, setRedactionCount] = useState(0);
    const [useRegex, setUseRegex] = useState(false);
    const [caseSensitive, setCaseSensitive] = useState(false);
    const [redactionColor, setRedactionColor] = useState("#000000");

    const handleFileSelected = (files: File[]) => {
        if (files.length > 0) {
            setFile(files[0]);
            setRedactionCount(0);
        }
    };

    const redactPdf = async () => {
        if (!file || !searchText) return;
        setIsProcessing(true);
        setRedactionCount(0);

        try {
            const result = await pdfStrategyManager.execute('redact', [file], {
                searchText,
                useRegex,
                caseSensitive,
                redactionColor
            });

            saveAs(result.blob, result.fileName || `redacted-${file.name}`);
            
            // Note: The strategy doesn't currently return the count, but we could update it to.
            // For now, we assume success means at least one redaction if no error was thrown.
            // Or we can just show a success message.
            
            toast.show({
                title: "Success",
                message: "PDF redacted successfully!",
                variant: "success",
                position: "top-right",
            });
        } catch (error: any) {
            console.error("Error redacting PDF:", error);
            toast.show({
                title: "Operation Failed",
                message: error.message || "Failed to redact PDF. Please try again.",
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
                    description="Drop a PDF file here to redact information"
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
                <div className="space-y-4">
                    <div className="rounded-xl border bg-card p-6 space-y-4">
                        <h3 className="text-lg font-semibold">Search & Redact</h3>
                        <p className="text-sm text-muted-foreground">
                            Enter text to automatically find and redact (black out) across the entire document.
                        </p>
                        
                        <div>
                            <label className="mb-2 block text-sm font-medium">Text to Redact</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={searchText}
                                    onChange={(e) => setSearchText(e.target.value)}
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    placeholder={useRegex ? "e.g. \\d{3}-\\d{2}-\\d{4}" : "e.g. Confidential, SSN, Name"}
                                />
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-4">
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={useRegex}
                                    onChange={(e) => setUseRegex(e.target.checked)}
                                    className="rounded border-gray-300"
                                />
                                Use Regex
                            </label>
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={caseSensitive}
                                    onChange={(e) => setCaseSensitive(e.target.checked)}
                                    className="rounded border-gray-300"
                                />
                                Case Sensitive
                            </label>
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium">Redaction Color</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={redactionColor}
                                    onChange={(e) => setRedactionColor(e.target.value)}
                                    className="h-9 w-12 cursor-pointer rounded-md border border-input p-1"
                                />
                                <span className="text-xs text-muted-foreground">{redactionColor}</span>
                            </div>
                        </div>

                        <Button
                            size="lg"
                            onClick={redactPdf}
                            disabled={isProcessing || !searchText}
                            className="w-full"
                            variant="destructive"
                        >
                            {isProcessing ? "Processing..." : "Redact All Occurrences"}
                        </Button>
                    </div>
                </div>

                <div className="relative overflow-hidden rounded-xl border bg-muted/20 p-4">
                    <div className="relative">
                        <PdfPreview file={file} />
                    </div>
                </div>
            </div>
        </div>
    );
}
