"use client";

import { useState } from "react";
import { saveAs } from "file-saver";
import { FileUpload } from "../ui/file-upload";
import { Button } from "../ui/button";
import { ArrowRight, FileText } from "lucide-react";
import { pdfApi } from "@/lib/services/pdf-api";
import { toast } from "@/lib/hooks/use-toast";

export function PdfToWordTool() {
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleFileSelected = (files: File[]) => {
        if (files.length > 0) {
            setFile(files[0]);
        }
    };

    const convertToWord = async () => {
        if (!file) return;
        setIsProcessing(true);

        try {
            // Backend-first with client-side fallback
            const result = await pdfApi.pdfToWord(file);
            saveAs(result.blob, result.fileName);

            toast.show({
                title: "Success",
                message: "PDF converted to Word successfully!",
                variant: "success",
                position: "top-right",
            });

            // Clear the file after successful conversion to return to upload page
            setFile(null);
        } catch (error) {
            console.error("Error converting PDF to Word:", error);
            toast.show({
                title: "Conversion Failed",
                message: "Failed to convert PDF to Word. Please try again.",
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
                    <p className="text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                </div>
                <div className="flex gap-4">
                    <Button variant="outline" onClick={() => setFile(null)}>
                        Change File
                    </Button>
                </div>
            </div>

            <div className="flex flex-col items-center justify-center rounded-xl border bg-muted/20 p-8 text-center">
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <FileText className="h-10 w-10" />
                </div>
                <h3 className="text-lg font-semibold">Ready to Convert</h3>
                <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                    We will extract the text from your PDF and convert it to a Word document (.docx).
                </p>
                <Button
                    size="lg"
                    onClick={convertToWord}
                    disabled={isProcessing}
                    className="mt-6 h-14 min-w-[200px] text-lg"
                >
                    {isProcessing ? (
                        "Processing..."
                    ) : (
                        <>
                            Convert to Word <ArrowRight className="ml-2 h-5 w-5" />
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
