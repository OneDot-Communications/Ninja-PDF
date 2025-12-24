"use client";

import { useState } from "react";
import { FileUpload } from "../ui/file-upload";
import { Button } from "../ui/button";
import { ArrowRight, FileText, Loader2, RefreshCw, AlertTriangle, XCircle } from "lucide-react";
import { saveAs } from "file-saver";
import { toast } from "@/app/client-layout";
import { useRouter } from "next/navigation";
import { pdfApi } from "@/lib/services/pdf-api";

export function WordToPdfTool() {
    const router = useRouter();
    const [files, setFiles] = useState<File[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState("");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleFilesSelected = (newFiles: File[]) => {
        setFiles((prev) => [...prev, ...newFiles]);
        setProgress(0);
        setErrorMessage(null); // Clear any previous error
    };

    const convert = async () => {
        if (files.length === 0) return;
        setIsProcessing(true);
        setStatus("Starting conversion...");
        setProgress(0);
        setErrorMessage(null);

        try {
            const result = await pdfApi.wordToPdf(files[0]);

            setStatus("Saving PDF...");
            saveAs(result.blob, result.fileName);
            setStatus("Completed!");

            toast.show({
                title: "Success",
                message: "File converted successfully!",
                variant: "success",
                position: "bottom-right"
            });

        } catch (error: any) {
            // Silently handle - don't console.error which can trigger dev overlay
            let message = "We couldn't convert this file. Please try a different file.";

            // Extract meaningful message from API error
            if (error?.message) {
                if (error.message.includes('{"error":"')) {
                    try {
                        const match = error.message.match(/\{.*\}/);
                        if (match) {
                            const parsed = JSON.parse(match[0]);
                            message = parsed.error;
                        }
                    } catch (e) { /* fallback */ }
                } else if (error.message.includes("QUOTA_EXCEEDED")) {
                    toast.show({
                        title: "Limit Reached",
                        message: "You have reached your daily limit.",
                        variant: "warning",
                        position: "top-center",
                        actions: {
                            label: "Upgrade",
                            onClick: () => router.push('/pricing')
                        }
                    });
                    setIsProcessing(false);
                    return;
                }
            }

            // Clean up message - remove technical prefixes
            message = message.replace(/^Conversion failed:\s*/i, "");
            message = message.replace(/^Output:\s*/i, "");
            message = message.replace(/docx2pdf Error:/gi, "").trim();

            // Show friendly inline error
            setErrorMessage(message || "This file could not be converted. Please try a different Word document.");
            setStatus("");
        } finally {
            setIsProcessing(false);
        }
    };

    const resetFile = () => {
        setFiles([]);
        setErrorMessage(null);
        setStatus("");
    };

    if (files.length === 0) {
        return (
            <div className="mx-auto max-w-2xl">
                <FileUpload
                    onFilesSelected={handleFilesSelected}
                    maxFiles={1}
                    accept={{ "application/msword": [".doc"], "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"] }}
                    description="Drop a Word file (.doc or .docx) here to convert it to PDF"
                />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between rounded-xl border bg-card p-6 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${errorMessage ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                        {errorMessage ? <XCircle className="h-6 w-6" /> : <FileText className="h-6 w-6" />}
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold">{files[0].name}</h2>
                        <p className="text-sm text-muted-foreground">
                            {(files[0].size / 1024 / 1024).toFixed(2)} MB
                        </p>
                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={resetFile}>
                    <RefreshCw className="h-5 w-5" />
                </Button>
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
                ) : errorMessage ? (
                    // Elegant inline error display
                    <div className="text-center space-y-4 max-w-md">
                        <div className="p-4 rounded-full bg-red-100 w-fit mx-auto">
                            <AlertTriangle className="h-8 w-8 text-red-500" />
                        </div>
                        <h3 className="text-xl font-semibold text-red-600">Unable to Convert</h3>
                        <p className="text-muted-foreground">
                            {errorMessage}
                        </p>
                        <div className="flex gap-3 justify-center pt-2">
                            <Button variant="outline" onClick={resetFile}>
                                Choose Different File
                            </Button>
                            <Button onClick={convert}>
                                Try Again
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="text-center space-y-4">
                        <div className="p-4 rounded-full bg-primary/10 w-fit mx-auto">
                            <FileText className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="text-xl font-semibold">Ready to Convert</h3>
                        <p className="text-muted-foreground max-w-xs mx-auto">
                            We'll convert your Word document to a professional PDF.
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
    );
}

