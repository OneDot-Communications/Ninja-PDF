"use client";

import { useState } from "react";
import { FileUpload } from "../ui/file-upload";
import { Button } from "../ui/button";
import { ArrowRight, FileSpreadsheet, Loader2, RefreshCw, Settings, Layout, Palette } from "lucide-react";
import ExcelJS from 'exceljs';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { saveAs } from "file-saver";
import { pdfApi } from "../../lib/pdf-api";
import { toast } from "../../client-layout";
import { useRouter } from "next/navigation";

export function ExcelToPdfTool() {
    const router = useRouter();
    const [files, setFiles] = useState<File[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState("");

    // Options
    const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
    const [fitToWidth, setFitToWidth] = useState(true);
    const [theme, setTheme] = useState<"striped" | "grid" | "plain">("grid");
    const [fontSize, setFontSize] = useState<"small" | "medium" | "large">("small");

    const handleFilesSelected = (newFiles: File[]) => {
        setFiles((prev) => [...prev, ...newFiles]);
    };

    const convert = async () => {
        if (files.length === 0) return;
        setIsProcessing(true);
        setStatus("Converting Excel file...");

        try {
            // Backend-first with client-side fallback
            const result = await pdfApi.excelToPdf(files[0]);

            setStatus("Saving PDF...");
            saveAs(result.blob, result.fileName);
            setStatus("Completed!");
        } catch (error: any) {
            console.error("Conversion Error:", error);

            if (error.message && error.message.includes("QUOTA_EXCEEDED")) {
                toast.show({
                    title: "Limit Reached",
                    message: "You have reached your daily limit for this tool.",
                    variant: "warning",
                    position: "top-center",
                    actions: {
                        label: "Upgrade to Unlimited",
                        onClick: () => router.push('/pricing')
                    }
                });
            } else {
                toast.show({
                    title: "Conversion Failed",
                    message: "Failed to convert Excel file. Please try again.",
                    variant: "error",
                    position: "bottom-right"
                });
            }
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
                    accept={{ "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"], "application/vnd.ms-excel": [".xls"] }}
                    description="Drop Excel file here to convert to PDF"
                />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between rounded-xl border bg-card p-6 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-green/10 text-brand-green">
                        <FileSpreadsheet className="h-6 w-6" />
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
                        <h3 className="font-semibold">PDF Settings</h3>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Orientation</Label>
                            <div className="flex gap-2">
                                <Button
                                    variant={orientation === "portrait" ? "default" : "outline"}
                                    onClick={() => setOrientation("portrait")}
                                    className="flex-1"
                                >
                                    <Layout className="mr-2 h-4 w-4 rotate-90" /> Portrait
                                </Button>
                                <Button
                                    variant={orientation === "landscape" ? "default" : "outline"}
                                    onClick={() => setOrientation("landscape")}
                                    className="flex-1"
                                >
                                    <Layout className="mr-2 h-4 w-4" /> Landscape
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Theme</Label>
                            <div className="flex gap-2">
                                {["grid", "striped", "plain"].map((t) => (
                                    <Button
                                        key={t}
                                        variant={theme === t ? "default" : "outline"}
                                        onClick={() => setTheme(t as any)}
                                        className="flex-1 capitalize"
                                    >
                                        {t}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Font Size</Label>
                            <div className="flex gap-2">
                                {["small", "medium", "large"].map((s) => (
                                    <Button
                                        key={s}
                                        variant={fontSize === s ? "default" : "outline"}
                                        onClick={() => setFontSize(s as any)}
                                        className="flex-1 capitalize"
                                    >
                                        {s}
                                    </Button>
                                ))}
                            </div>
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
                                <FileSpreadsheet className="h-8 w-8 text-primary" />
                            </div>
                            <h3 className="text-xl font-semibold">Ready to Convert</h3>
                            <p className="text-muted-foreground max-w-xs mx-auto">
                                We'll convert your spreadsheet to PDF with {orientation} orientation.
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
