"use client";

import { useState } from "react";
import { FileUpload } from "../ui/file-upload";
import { Button } from "../ui/button";
import { ArrowRight, Presentation, Loader2, RefreshCw, Settings, LayoutTemplate } from "lucide-react";
import JSZip from "jszip";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { saveAs } from "file-saver";
import { pdfApi } from "../../lib/pdf-api";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";

export function PowerPointToPdfTool() {
    const [files, setFiles] = useState<File[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState("");

    // Options
    const [layout, setLayout] = useState<"slides" | "handouts">("slides");
    const [includeImages, setIncludeImages] = useState(true);

    const handleFilesSelected = (newFiles: File[]) => {
        setFiles((prev) => [...prev, ...newFiles]);
    };

    const convert = async () => {
        if (files.length === 0) return;
        setIsProcessing(true);
        setStatus("Converting PowerPoint file...");

        try {
            // Backend-first with client-side fallback
            const result = await pdfApi.powerpointToPdf(files[0]);

            setStatus("Saving PDF...");
            saveAs(result.blob, result.fileName);
            setStatus("Completed!");

        } catch (error) {
            console.error("Conversion Error:", error);
            alert("Failed to convert PowerPoint to PDF.");
        } finally {
            setIsProcessing(false);
        }
    };

    if (files.length === 0) {
        return (
            <div className="mx-auto max-w-2xl">
                <FileUpload
                    onFilesSelected={handleFilesSelected}
                    maxFiles={1}
                    accept={{ "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"], "application/vnd.ms-powerpoint": [".ppt"] }}
                    description="Drop PowerPoint file here to convert to PDF"
                />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between rounded-xl border bg-card p-6 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                        <Presentation className="h-6 w-6" />
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
                        <div className="space-y-2">
                            <Label>Layout</Label>
                            <div className="flex gap-2">
                                <Button
                                    variant={layout === "slides" ? "default" : "outline"}
                                    onClick={() => setLayout("slides")}
                                    className="flex-1"
                                >
                                    <Presentation className="mr-2 h-4 w-4" /> Slides
                                </Button>
                                <Button
                                    variant={layout === "handouts" ? "default" : "outline"}
                                    onClick={() => setLayout("handouts")}
                                    className="flex-1"
                                >
                                    <LayoutTemplate className="mr-2 h-4 w-4" /> Handouts
                                </Button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-base">Include Images</Label>
                                <p className="text-xs text-muted-foreground">Extract and place images from slides</p>
                            </div>
                            <Switch checked={includeImages} onCheckedChange={setIncludeImages} />
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-center justify-center space-y-6 rounded-xl border bg-muted/20 p-6">
                    {isProcessing ? (
                        <div className="w-full max-w-md space-y-4 text-center">
                            <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
                            <p className="text-lg font-medium">{status}</p>
                        </div>
                    ) : (
                        <div className="text-center space-y-4">
                            <div className="p-4 rounded-full bg-primary/10 w-fit mx-auto">
                                <Presentation className="h-8 w-8 text-primary" />
                            </div>
                            <h3 className="text-xl font-semibold">Ready to Convert</h3>
                            <p className="text-muted-foreground max-w-xs mx-auto">
                                We'll convert your presentation to PDF with your chosen layout.
                            </p>
                            <Button
                                size="lg"
                                onClick={convert}
                                className="h-14 min-w-[200px] text-lg shadow-lg transition-all hover:scale-105"
                            >
                                Convert to PDF <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
