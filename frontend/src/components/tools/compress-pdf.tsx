"use client";

import { useState } from "react";
import { saveAs } from "file-saver";
import { FileUpload } from "../ui/file-upload";
import { Button } from "../ui/button";
import { ArrowRight, AlertTriangle, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { pdfApi } from "@/lib/services/pdf-api";
import { toast } from "@/lib/hooks/use-toast";

export function CompressPdfTool() {
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [compressionLevel, setCompressionLevel] = useState<"recommended" | "extreme">("recommended");

    const handleFileSelected = (files: File[]) => {
        if (files.length > 0) {
            setFile(files[0]);
        }
    };

    const compressPdf = async () => {
        if (!file) return;
        setIsProcessing(true);

        try {
            // Backend-first with client-side fallback
            const result = await pdfApi.compress(file, compressionLevel);

            saveAs(result.blob, result.fileName);

            toast.show({
                title: "Success",
                message: "PDF compressed successfully!",
                variant: "success",
                position: "top-right",
            });
        } catch (error: any) {
            console.error("Error compressing PDF:", error);

            let errorMessage = "Failed to compress PDF. Please try again.";
            if (error.message?.includes('corrupted') || error.message?.includes('Invalid PDF structure')) {
                errorMessage = "The PDF file appears to be corrupted. Try using the Repair PDF tool first.";
            } else if (error.message?.includes('encrypted') || error.message?.includes('password')) {
                errorMessage = "The PDF is encrypted. Please use the Unlock PDF tool first.";
            }

            toast.show({
                title: "Compression Failed",
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
                    description="Drop a PDF file here to compress it"
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
                        Original size: {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                </div>
                <div className="flex gap-4">
                    <Button variant="outline" onClick={() => setFile(null)}>
                        Change File
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <div
                    className={cn(
                        "cursor-pointer rounded-xl border-2 p-6 transition-all hover:border-primary relative",
                        compressionLevel === "recommended" ? "border-primary bg-primary/5" : "border-border"
                    )}
                    onClick={() => setCompressionLevel("recommended")}
                >
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-semibold">Recommended Compression</h3>
                        {compressionLevel === "recommended" && <Check className="h-5 w-5 text-primary" />}
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Optimizes internal structure and removes metadata. Keeps text selectable and images sharp.
                    </p>
                </div>
                <div
                    className={cn(
                        "cursor-pointer rounded-xl border-2 p-6 transition-all hover:border-primary relative",
                        compressionLevel === "extreme" ? "border-primary bg-primary/5" : "border-border"
                    )}
                    onClick={() => setCompressionLevel("extreme")}
                >
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-semibold">Extreme Compression</h3>
                        {compressionLevel === "extreme" && <Check className="h-5 w-5 text-primary" />}
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                        Converts pages to images (Rasterization). Drastically reduces size but text becomes unselectable.
                    </p>
                    <div className="flex items-center gap-2 text-xs text-alert-warning bg-alert-warning/10 p-2 rounded">
                        <AlertTriangle className="h-4 w-4" />
                        <span>Text will not be selectable</span>
                    </div>
                </div>
            </div>

            <div className="flex flex-col items-center pt-8 space-y-4">
                <Button
                    size="lg"
                    onClick={compressPdf}
                    disabled={isProcessing}
                    className="h-14 min-w-[200px] text-lg"
                >
                    {isProcessing ? (
                        "Compressing..."
                    ) : (
                        <>
                            Compress PDF <ArrowRight className="ml-2 h-5 w-5" />
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
