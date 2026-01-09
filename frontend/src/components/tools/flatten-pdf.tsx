"use client";

import { useState } from "react";
import { saveAs } from "file-saver";
import FileUploadHero from "../ui/file-upload-hero"; // Hero uploader (big CTA, full-page drag overlay)
import { Button } from "../ui/button";
import { isPasswordError } from "@/lib/utils";
import { ArrowRight, Layers, FileText } from "lucide-react";
import { pdfApi } from "@/lib/services/pdf-api";
import { toast } from "@/lib/hooks/use-toast";
import { PasswordProtectedModal } from "../ui/password-protected-modal";

export function FlattenPdfTool() {
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);

    const handleFileSelected = (files: File[]) => {
        if (files.length > 0) {
            setFile(files[0]);
        }
    };

    const flattenPdf = async () => {
        if (!file) return;
        setIsProcessing(true);

        try {
            const result = await pdfApi.flatten(file);

            saveAs(result.blob, result.fileName || `flattened-${file.name}`);

            toast.show({
                title: "Success",
                message: "PDF flattened successfully!",
                variant: "success",
                position: "top-right",
            });
        } catch (error: any) {
            console.error("Error flattening PDF:", error);

            let errorMessage = "Failed to flatten PDF. Please try again.";
            if (error.message?.includes('corrupted') || error.message?.includes('Invalid PDF structure')) {
                errorMessage = "The PDF file appears to be corrupted. Try using the Repair PDF tool first.";
            } else if (isPasswordError(error)) {
                setShowPasswordModal(true);
                // Return early so we don't show the generic error toast
                setIsProcessing(false);
                return;
            }

            toast.show({
                title: "Flatten Failed",
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
            <div className="min-h-[calc(100vh-120px)] flex items-center justify-center">
                <FileUploadHero
                    title="Flatten PDF"
                    onFilesSelected={handleFileSelected}
                    maxFiles={1}
                    accept={{ "application/pdf": [".pdf"] }}
                />

                <PasswordProtectedModal
                    isOpen={showPasswordModal}
                    onClose={() => setShowPasswordModal(false)}
                    toolName="flattening"
                />
            </div>
        );
    }

    return (
        <>
            <div className="space-y-8">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <FileText className="h-8 w-8" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">{file.name}</h2>
                            <p className="text-sm text-muted-foreground">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <Button variant="outline" onClick={() => setFile(null)}>
                            Change File
                        </Button>
                    </div>
                </div>

                <div className="flex flex-col items-center gap-6 border-t pt-8">
                    <div className="text-center max-w-md text-muted-foreground">
                        <p>Flattening will merge all form fields and annotations into the page content, making them uneditable.</p>
                    </div>

                    <Button
                        size="lg"
                        onClick={flattenPdf}
                        disabled={isProcessing}
                        className="h-14 min-w-[200px] text-lg"
                    >
                        {isProcessing ? (
                            "Processing..."
                        ) : (
                            <>
                                Flatten PDF <Layers className="ml-2 h-5 w-5" />
                            </>
                        )}
                    </Button>
                </div>
            </div>
            <PasswordProtectedModal
                isOpen={showPasswordModal}
                onClose={() => setShowPasswordModal(false)}
                toolName="flattening"
            />
        </>
    );

}
