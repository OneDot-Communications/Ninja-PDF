"use client";

import { useState } from "react";
import { saveAs } from "file-saver";
import { FileUpload } from "../ui/file-upload";
import { Button } from "../ui/button";
import { Unlock, Lock, CheckCircle } from "lucide-react";
import { pdfApi } from "@/lib/services/pdf-api";
import { isPdfEncrypted } from "@/lib/services/pdf-service";
import { toast } from "@/lib/hooks/use-toast";

export function UnlockPdfTool() {
    const [file, setFile] = useState<File | null>(null);
    const [password, setPassword] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [isEncrypted, setIsEncrypted] = useState(false);
    const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

    const handleFileSelected = async (files: File[]) => {
        if (files.length > 0) {
            const selectedFile = files[0];
            setFile(selectedFile);
            setPassword("");
            setStatus("idle");

            const encrypted = await isPdfEncrypted(selectedFile);
            setIsEncrypted(encrypted);
        }
    };

    const unlockPdf = async () => {
        if (!file) return;
        setIsProcessing(true);
        setStatus("idle");

        try {
            // Backend-first with client-side fallback
            // Try with provided password, or empty string if not thought to be encrypted
            const result = await pdfApi.unlock(file, password);

            saveAs(result.blob, result.fileName);
            setStatus("success");

            toast.show({
                title: "Success",
                message: "PDF unlocked successfully!",
                variant: "success",
                position: "top-right",
            });
        } catch (error: any) {
            // Only log unexpected errors to avoid Next.js development error overlay
            if (error.message !== 'Password incorrect') {
                console.error("Error unlocking PDF:", error);
            }

            setStatus("error");

            // If it failed and we thought it wasn't encrypted, it probably IS encrypted
            if (!isEncrypted) {
                setIsEncrypted(true);
                toast.show({
                    title: "Password Required",
                    message: "This file appears to be encrypted. Please enter the password.",
                    variant: "warning",
                    position: "top-right",
                });
            } else {
                toast.show({
                    title: "Unlock Failed",
                    message: "Incorrect password. Please try again.",
                    variant: "error",
                    position: "top-right",
                });
            }
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
                    description="Drop a PDF file here to unlock it"
                />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 className="text-2xl font-bold">{file.name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                        {isEncrypted ? (
                            <span className="inline-flex items-center rounded-full bg-alert-warning/10 px-2.5 py-0.5 text-xs font-medium text-alert-warning">
                                <Lock className="mr-1 h-3 w-3" /> Encrypted
                            </span>
                        ) : (
                            <span className="inline-flex items-center rounded-full bg-alert-success/10 px-2.5 py-0.5 text-xs font-medium text-alert-success">
                                <Unlock className="mr-1 h-3 w-3" /> No Password Detected
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex gap-4">
                    <Button variant="outline" onClick={() => { setFile(null); setPassword(""); }}>
                        Change File
                    </Button>
                </div>
            </div>

            <div className="mx-auto max-w-md space-y-6 rounded-xl border bg-card p-8 shadow-sm">
                <div className="flex items-center justify-center">
                    <div className={`flex h-20 w-20 items-center justify-center rounded-full ${isEncrypted ? 'bg-alert-warning/10 text-alert-warning' : 'bg-alert-success/10 text-alert-success'}`}>
                        {isEncrypted ? <Lock className="h-10 w-10" /> : <Unlock className="h-10 w-10" />}
                    </div>
                </div>

                <div className="text-center">
                    <h3 className="text-xl font-semibold">
                        {isEncrypted ? "Unlock PDF" : "Remove Security"}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-2">
                        {isEncrypted
                            ? "This file is password protected. Enter the password to remove it."
                            : "Click below to remove security. If a password is required, we'll ask for it."}
                    </p>
                </div>

                <div className={isEncrypted ? "block" : "hidden"}>
                    <label className="mb-2 block text-sm font-medium">Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        placeholder="Enter document password"
                    />
                </div>

                <Button
                    size="lg"
                    onClick={unlockPdf}
                    disabled={isProcessing || (isEncrypted && !password)}
                    className="w-full h-12 text-lg"
                >
                    {isProcessing ? "Processing..." : (isEncrypted ? "Unlock & Download" : "Remove Security")}
                </Button>

                {status === "success" && (
                    <div className="flex items-center justify-center gap-2 text-sm font-medium text-alert-success bg-alert-success/10 p-3 rounded-lg">
                        <CheckCircle className="h-4 w-4" />
                        File unlocked successfully!
                    </div>
                )}
            </div>
        </div>
    );
}
