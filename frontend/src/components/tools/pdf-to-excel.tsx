"use client";

import { useState } from "react";
import FileUploadHero from "../ui/file-upload-hero"; // Hero uploader (big CTA, full-page drag overlay)
import { Button } from "../ui/button";
import { ArrowRight, FileSpreadsheet, Loader2, RefreshCw, Settings, Table } from "lucide-react";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import { Slider } from "../ui/slider";
import { saveAs } from "file-saver";
import { pdfApi } from "@/lib/services/pdf-api";

export function PdfToExcelTool() {
    const [files, setFiles] = useState<File[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState("");

    // Options
    const [mergePages, setMergePages] = useState(false);
    const [rowTolerance, setRowTolerance] = useState(5); // Y-axis tolerance in pixels

    const handleFilesSelected = (newFiles: File[]) => {
        setFiles((prev) => [...prev, ...newFiles]);
        setProgress(0);
    };

    const convert = async () => {
        if (files.length === 0) return;
        setIsProcessing(true);
        setProgress(0);
        setStatus("Starting conversion...");

        try {
            // Backend-first with client-side fallback
            const result = await pdfApi.pdfToExcel(files[0]);

            setStatus("Saving Excel file...");
            saveAs(result.blob, result.fileName);
            setStatus("Completed!");

        } catch (error) {
            console.error("Conversion Error:", error);
            setStatus("Error occurred during conversion.");
            alert("Failed to convert PDF to Excel.");
        } finally {
            setIsProcessing(false);
        }
    };

    if (files.length === 0) {
        return (
            <div className="min-h-[calc(100vh-120px)] flex items-center justify-center">
                <FileUploadHero
                    title="PDF to Excel"
                    onFilesSelected={handleFilesSelected}
                    maxFiles={1}
                    accept={{ "application/pdf": [".pdf"] }}
                />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between rounded-xl border bg-card p-6 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-green/10 text-brand-green">
                        <FileSpreadsheet className="h-6 w-6" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold">{files[0].name}</h2>
                        <p className="text-sm text-muted-foreground">
                            {(files[0].size / 1024 / 1024).toFixed(2)} MB
                        </p>
                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setFiles([])}>
                    <RefreshCw className="h-5 w-5" />
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-6 rounded-xl border bg-card p-6 shadow-sm">
                    <div className="flex items-center gap-2 border-b pb-4">
                        <Settings className="h-5 w-5 text-muted-foreground" />
                        <h3 className="font-semibold">Conversion Settings</h3>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-base">Merge Pages</Label>
                                <p className="text-xs text-muted-foreground">Combine all pages into one sheet</p>
                            </div>
                            <Switch checked={mergePages} onCheckedChange={setMergePages} />
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <Label>Row Alignment Tolerance</Label>
                                <span className="text-xs text-muted-foreground">{rowTolerance}px</span>
                            </div>
                            <Slider
                                value={[rowTolerance]}
                                onValueChange={(v: number[]) => setRowTolerance(v[0])}
                                max={20}
                                step={1}
                            />
                            <p className="text-xs text-muted-foreground">
                                Higher values group slightly misaligned text into the same row.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-center justify-center space-y-6 rounded-xl border bg-muted/20 p-6">
                    {isProcessing ? (
                        <div className="w-full max-w-md space-y-4 text-center">
                            <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
                            <p className="text-lg font-medium">{status}</p>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                                <div
                                    className="h-full bg-primary transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="text-center space-y-4">
                            <div className="p-4 rounded-full bg-primary/10 w-fit mx-auto">
                                <Table className="h-8 w-8 text-primary" />
                            </div>
                            <h3 className="text-xl font-semibold">Ready to Convert</h3>
                            <p className="text-muted-foreground max-w-xs mx-auto">
                                We'll extract text and tables from your PDF and create a formatted Excel spreadsheet.
                            </p>
                            <Button
                                size="lg"
                                onClick={convert}
                                className="h-14 min-w-[200px] text-lg shadow-lg transition-all hover:scale-105"
                            >
                                Convert to Excel <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
