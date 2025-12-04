"use client";

import { useState } from "react";
import { saveAs } from "file-saver";
import { FileUpload } from "../ui/file-upload";
import { Button } from "../ui/button";
import { Wrench, AlertTriangle, CheckCircle, FileText, Eye, RefreshCw } from "lucide-react";
import { pdfStrategyManager } from "../../lib/pdf-service";
import { toast } from "../../lib/use-toast";

export function RepairPdfTool() {
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
    const [log, setLog] = useState<string[]>([]);
    const [repairMode, setRepairMode] = useState<"auto" | "visual">("auto");

    const handleFileSelected = (files: File[]) => {
        if (files.length > 0) {
            setFile(files[0]);
            setStatus("idle");
            setLog([]);
        }
    };

    const addLog = (msg: string) => setLog(prev => [...prev, msg]);

    const repairPdf = async () => {
        if (!file) return;
        setIsProcessing(true);
        setStatus("idle");
        setLog([]);
        addLog("Starting repair process...");

        try {
            if (repairMode === "visual") {
                addLog("Mode: Visual Recovery (Forced)");
            } else {
                addLog("Mode: Auto (Standard Rebuild with Visual Fallback)");
            }

            const result = await pdfStrategyManager.execute('repair', [file], {
                repairMode
            });

            saveAs(result.blob, result.fileName || `repaired-${file.name}`);
            setStatus("success");
            addLog("Success: File processed and downloaded.");

        } catch (error: any) {
            console.error("Error repairing PDF:", error);

            let errorMessage = error.message || "Failed to repair PDF. The file may be too severely corrupted.";

            // Add helpful suggestions based on error type
            if (errorMessage.includes('too severely corrupted') || errorMessage.includes('completely invalid')) {
                errorMessage += "\n\nSuggestions:\n• Verify this is actually a PDF file\n• Try opening it in Adobe Acrobat or another PDF viewer\n• If it's a scanned document, you may need to re-scan it";
            }

            toast.show({
                title: "Repair Failed",
                message: errorMessage,
                variant: "error",
                position: "top-right",
            });
            setStatus("error");
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
                    description="Drop a damaged PDF file here to attempt repair"
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
                    <div className="rounded-xl border bg-card p-6 shadow-sm space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                                <Wrench className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold">Repair & Recover</h3>
                                <p className="text-sm text-muted-foreground">
                                    Attempts to fix structure or recover visual content.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div
                                className={`cursor-pointer rounded-lg border p-3 text-center transition-all ${repairMode === "auto" ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted"}`}
                                onClick={() => setRepairMode("auto")}
                            >
                                <RefreshCw className="mx-auto mb-2 h-5 w-5 text-primary" />
                                <div className="text-sm font-medium">Auto Repair</div>
                                <div className="text-xs text-muted-foreground">Try standard first</div>
                            </div>
                            <div
                                className={`cursor-pointer rounded-lg border p-3 text-center transition-all ${repairMode === "visual" ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted"}`}
                                onClick={() => setRepairMode("visual")}
                            >
                                <Eye className="mx-auto mb-2 h-5 w-5 text-primary" />
                                <div className="text-sm font-medium">Visual Recovery</div>
                                <div className="text-xs text-muted-foreground">Force rasterization</div>
                            </div>
                        </div>

                        <Button
                            size="lg"
                            onClick={repairPdf}
                            disabled={isProcessing}
                            className="w-full"
                        >
                            {isProcessing ? "Processing..." : "Start Repair"}
                        </Button>

                        {log.length > 0 && (
                            <div className="rounded-md bg-muted p-4 text-xs font-mono max-h-60 overflow-y-auto">
                                {log.map((line, i) => (
                                    <div key={i} className="mb-1 border-b border-border/50 pb-1 last:border-0">
                                        {line}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center justify-center rounded-xl border bg-muted/20 p-8 text-center">
                    {status === "success" ? (
                        <div className="space-y-2 text-alert-success">
                            <CheckCircle className="mx-auto h-12 w-12" />
                            <h3 className="text-xl font-bold">Repair Complete</h3>
                            <p className="text-sm">Your file has been downloaded.</p>
                        </div>
                    ) : status === "error" ? (
                        <div className="space-y-2 text-alert-error">
                            <AlertTriangle className="mx-auto h-12 w-12" />
                            <h3 className="text-xl font-bold">Repair Failed</h3>
                            <p className="text-sm">We could not recover this file.</p>
                        </div>
                    ) : (
                        <div className="space-y-2 text-muted-foreground">
                            <FileText className="mx-auto h-12 w-12 opacity-50" />
                            <p>Ready to process</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
