"use client";

import { useState } from "react";
import { FileUpload } from "../ui/file-upload";
import { Button } from "../ui/button";
import { ArrowRight, Presentation, Loader2, RefreshCw, Settings, Monitor } from "lucide-react";
import { Label } from "../ui/label";
import { saveAs } from "file-saver";

export function PdfToPowerPointTool() {
    const [files, setFiles] = useState<File[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState("");

    // Options
    const [aspectRatio, setAspectRatio] = useState<"16:9" | "4:3">("16:9");
    const [quality, setQuality] = useState<"low" | "medium" | "high">("medium");

    const handleFilesSelected = (newFiles: File[]) => {
        setFiles((prev) => [...prev, ...newFiles]);
        setProgress(0);
    };

    const convert = async () => {
        if (files.length === 0) return;
        setIsProcessing(true);
        setProgress(0);

        try {
            const { pdfStrategyManager } = await import("../../lib/pdf-service");

            const result = await pdfStrategyManager.execute('pdf-to-powerpoint', [files[0]], {
                aspectRatio,
                quality,
                onProgress: (data: any) => {
                    setStatus(data.message);
                    setProgress(Math.round(data.progress * 100));
                }
            });

            saveAs(result.blob, result.fileName || files[0].name.replace(".pdf", ".pptx"));
            setStatus("Completed!");

        } catch (error) {
            console.error("Conversion Error:", error);
            alert("Failed to convert PDF to PowerPoint.");
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
                    accept={{ "application/pdf": [".pdf"] }}
                    description="Drop PDF file here to convert to PowerPoint"
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
                        <h3 className="font-semibold">Presentation Settings</h3>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Aspect Ratio</Label>
                            <div className="flex gap-2">
                                <Button
                                    variant={aspectRatio === "16:9" ? "default" : "outline"}
                                    onClick={() => setAspectRatio("16:9")}
                                    className="flex-1"
                                >
                                    <Monitor className="mr-2 h-4 w-4" /> 16:9
                                </Button>
                                <Button
                                    variant={aspectRatio === "4:3" ? "default" : "outline"}
                                    onClick={() => setAspectRatio("4:3")}
                                    className="flex-1"
                                >
                                    <Monitor className="mr-2 h-4 w-4" /> 4:3
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Image Quality</Label>
                            <div className="flex gap-2">
                                {["low", "medium", "high"].map((q) => (
                                    <Button
                                        key={q}
                                        variant={quality === q ? "default" : "outline"}
                                        onClick={() => setQuality(q as any)}
                                        className="flex-1 capitalize"
                                    >
                                        {q}
                                    </Button>
                                ))}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Higher quality means larger file size.
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
                                <Presentation className="h-8 w-8 text-primary" />
                            </div>
                            <h3 className="text-xl font-semibold">Ready to Convert</h3>
                            <p className="text-muted-foreground max-w-xs mx-auto">
                                We'll convert your PDF to a PowerPoint presentation with {aspectRatio} aspect ratio.
                            </p>
                            <Button
                                size="lg"
                                onClick={convert}
                                className="h-14 min-w-[200px] text-lg shadow-lg transition-all hover:scale-105"
                            >
                                Convert to PowerPoint <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
