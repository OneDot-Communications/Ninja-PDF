"use client";

import { useState } from "react";
import { FileUpload } from "../ui/file-upload";
import { Button } from "../ui/button";
import { Search, FileText, Download, Loader2, RefreshCw, Copy, Check } from "lucide-react";
import { saveAs } from "file-saver";
import { cn } from "@/lib/utils";
import { pdfStrategyManager } from "@/lib/services/pdf-service";

const LANGUAGES = [
    { code: "eng", name: "English" },
    { code: "spa", name: "Spanish" },
    { code: "fra", name: "French" },
    { code: "deu", name: "German" },
    { code: "ita", name: "Italian" },
    { code: "por", name: "Portuguese" },
    { code: "rus", name: "Russian" },
    { code: "chi_sim", name: "Chinese (Simplified)" },
    { code: "jpn", name: "Japanese" },
];

export function OcrPdfTool() {
    const [files, setFiles] = useState<File[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState("");
    const [resultText, setResultText] = useState("");
    const [selectedLang, setSelectedLang] = useState("eng");
    const [copied, setCopied] = useState(false);

    const handleFilesSelected = (newFiles: File[]) => {
        setFiles((prev) => [...prev, ...newFiles]);
        setResultText("");
        setProgress(0);
    };

    const processOcr = async () => {
        if (files.length === 0) return;
        setIsProcessing(true);
        setResultText("");
        setProgress(0);

        try {
            const result = await pdfStrategyManager.execute('ocr', files, {
                lang: selectedLang,
                onProgress: (m: any) => {
                    if (m.status === 'recognizing text') {
                        setProgress(Math.round(m.progress * 100));
                        setStatus(`Recognizing text... ${Math.round(m.progress * 100)}%`);
                    } else {
                        setStatus(m.status);
                    }
                }
            });

            const text = await result.blob.text();
            setResultText(text);
            setStatus("Completed!");
        } catch (error) {
            console.error("OCR Error:", error);
            setStatus("Error occurred during OCR processing.");
        } finally {
            setIsProcessing(false);
        }
    };

    const downloadText = () => {
        const blob = new Blob([resultText], { type: "text/plain;charset=utf-8" });
        saveAs(blob, `ocr-result-${files[0].name}.txt`);
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(resultText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (files.length === 0) {
        return (
            <div className="mx-auto max-w-2xl">
                <FileUpload
                    onFilesSelected={handleFilesSelected}
                    maxFiles={1}
                    accept={{ "application/pdf": [".pdf"], "image/png": [".png"], "image/jpeg": [".jpg", ".jpeg"] }}
                    description="Drop PDF or Image file here to OCR"
                />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between rounded-xl border bg-card p-6 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <FileText className="h-6 w-6" />
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

            {!resultText && (
                <div className="flex flex-col items-center justify-center space-y-8 py-8">
                    {!isProcessing && (
                        <div className="w-full max-w-md space-y-4">
                            <label className="text-sm font-medium text-muted-foreground">Select Document Language</label>
                            <div className="grid grid-cols-3 gap-2">
                                {LANGUAGES.map((lang) => (
                                    <button
                                        key={lang.code}
                                        onClick={() => setSelectedLang(lang.code)}
                                        className={cn(
                                            "flex items-center justify-center rounded-md border px-3 py-2 text-sm transition-all hover:bg-accent hover:text-accent-foreground",
                                            selectedLang === lang.code
                                                ? "border-primary bg-primary/5 ring-1 ring-primary"
                                                : "bg-background"
                                        )}
                                    >
                                        {lang.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

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
                        <Button
                            size="lg"
                            onClick={processOcr}
                            className="h-14 min-w-[200px] text-lg shadow-lg transition-all hover:scale-105"
                        >
                            Start OCR <Search className="ml-2 h-5 w-5" />
                        </Button>
                    )}
                </div>
            )}

            {resultText && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="rounded-xl border bg-card p-6 shadow-sm">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-semibold">Extracted Text</h3>
                            <div className="flex gap-2">
                                <Button onClick={copyToClipboard} variant="outline" size="sm">
                                    {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                                    {copied ? "Copied" : "Copy"}
                                </Button>
                                <Button onClick={downloadText} variant="outline" size="sm">
                                    <Download className="mr-2 h-4 w-4" /> Download Text
                                </Button>
                            </div>
                        </div>
                        <div className="max-h-[500px] overflow-y-auto rounded-lg border bg-muted/30 p-4 font-mono text-sm whitespace-pre-wrap">
                            {resultText}
                        </div>
                    </div>
                    <div className="flex justify-center">
                        <Button onClick={() => setFiles([])} variant="outline">
                            Process Another File
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
