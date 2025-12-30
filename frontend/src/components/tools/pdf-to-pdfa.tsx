"use client";

import { useState } from "react";
import { saveAs } from "file-saver";
import { FileUpload } from "../ui/file-upload";
import { Button } from "../ui/button";
import { Archive, Check, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { pdfApi } from "@/lib/services/pdf-api";
import { toast } from "@/lib/hooks/use-toast";

export function PdfToPdfATool() {
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [conformance, setConformance] = useState<"1b" | "2b" | "3b">("2b");

    const handleFileSelected = (files: File[]) => {
        if (files.length > 0) {
            setFile(files[0]);
        }
    };

    const convertToPdfA = async () => {
        if (!file) return;
        setIsProcessing(true);

        try {
            // Backend-first with client-side fallback
            const result = await pdfApi.pdfToPdfa(file);

            saveAs(result.blob, result.fileName);

            toast.show({
                title: "Success",
                message: "PDF converted to PDF/A successfully!",
                variant: "success",
                position: "top-right",
            });

            // Clear the file after successful conversion to return to upload page
            setFile(null);
        } catch (error) {
            console.error("Error converting to PDF/A:", error);
            toast.show({
                title: "Conversion Failed",
                message: "Failed to convert to PDF/A. Please try again.",
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
                    description="Drop a PDF file here to convert to PDF/A"
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
                    <div className="rounded-xl border bg-card p-6 space-y-6">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Archive className="h-5 w-5" /> Conformance Level
                        </h3>

                        <div className="space-y-3">
                            {[
                                { id: "1b", name: "PDF/A-1b", desc: "Basic archiving. No transparency allowed. Best for long-term preservation." },
                                { id: "2b", name: "PDF/A-2b", desc: "Allows transparency and layers. Good balance of features and archiving." },
                                { id: "3b", name: "PDF/A-3b", desc: "Allows embedding arbitrary files. Modern standard." },
                            ].map((level) => (
                                <div
                                    key={level.id}
                                    className={cn(
                                        "cursor-pointer rounded-lg border p-4 transition-all hover:border-primary",
                                        conformance === level.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border"
                                    )}
                                    onClick={() => setConformance(level.id as any)}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-medium">{level.name}</span>
                                        {conformance === level.id && <Check className="h-4 w-4 text-primary" />}
                                    </div>
                                    <p className="text-xs text-muted-foreground">{level.desc}</p>
                                </div>
                            ))}
                        </div>

                        <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground flex gap-2">
                            <Info className="h-4 w-4 shrink-0 mt-0.5" />
                            <p>
                                Note: This tool updates document metadata and structure for archiving.
                                For strict legal compliance, verify the output with a dedicated validator.
                            </p>
                        </div>

                        <Button
                            size="lg"
                            onClick={convertToPdfA}
                            disabled={isProcessing}
                            className="w-full"
                        >
                            {isProcessing ? "Processing..." : "Convert to PDF/A"}
                        </Button>
                    </div>
                </div>

                <div className="flex items-center justify-center rounded-xl border bg-muted/20 p-8">
                    <div className="text-center space-y-4 max-w-xs">
                        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <Archive className="h-10 w-10" />
                        </div>
                        <h3 className="text-xl font-semibold">Ready to Archive</h3>
                        <p className="text-sm text-muted-foreground">
                            Your document will be converted to the ISO 19005 standard for long-term preservation.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
