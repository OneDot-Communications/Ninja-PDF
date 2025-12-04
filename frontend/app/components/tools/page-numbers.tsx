"use client";

import { useState } from "react";
import { saveAs } from "file-saver";
import { FileUpload } from "../ui/file-upload";
import { Button } from "../ui/button";
import { Hash } from "lucide-react";
import { PdfPreview } from "../ui/pdf-preview";
import { pdfStrategyManager } from "../../lib/pdf-service";
import { toast } from "../../lib/use-toast";

export function PageNumbersTool() {
    const [file, setFile] = useState<File | null>(null);
    const [position, setPosition] = useState<"bottom-center" | "bottom-right" | "top-right" | "top-left" | "bottom-left" | "top-center">("bottom-center");
    const [isProcessing, setIsProcessing] = useState(false);
    const [format, setFormat] = useState<"n" | "page-n" | "n-of-m" | "page-n-of-m">("n-of-m");
    const [startFrom, setStartFrom] = useState(1);
    
    // New Features
    const [fontFamily, setFontFamily] = useState<"Helvetica" | "TimesRoman" | "Courier">("Helvetica");
    const [fontSize, setFontSize] = useState(12);
    const [color, setColor] = useState("#000000");
    const [margin, setMargin] = useState(20);
    const [pageRange, setPageRange] = useState(""); // "1-5, 8"

    const handleFileSelected = (files: File[]) => {
        if (files.length > 0) {
            setFile(files[0]);
        }
    };

    const addPageNumbers = async () => {
        if (!file) return;
        setIsProcessing(true);

        try {
            const result = await pdfStrategyManager.execute('page-numbers', [file], {
                format,
                startFrom,
                pageRange,
                fontFamily,
                fontSize,
                color,
                margin,
                position
            });

            saveAs(result.blob, result.fileName || `numbered-${file.name}`);
            
            toast.show({
                title: "Success",
                message: "Page numbers added successfully!",
                variant: "success",
                position: "top-right",
            });
        } catch (error: any) {
            console.error("Error adding page numbers:", error);

            let errorMessage = "Failed to add page numbers. Please try again.";
            if (error.message?.includes('corrupted') || error.message?.includes('Invalid PDF structure')) {
                errorMessage = "The PDF file appears to be corrupted. Try using the Repair PDF tool first.";
            } else if (error.message?.includes('encrypted') || error.message?.includes('password')) {
                errorMessage = "The PDF is encrypted. Please use the Unlock PDF tool first.";
            }

            toast.show({
                title: "Operation Failed",
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
                    description="Drop a PDF file here to add page numbers"
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
                <div className="space-y-6 rounded-xl border bg-card p-6">
                    <h3 className="font-semibold flex items-center gap-2">
                        <Hash className="h-5 w-5" /> Configuration
                    </h3>

                    <div className="space-y-4">
                        <div>
                            <label className="mb-2 block text-xs font-medium text-muted-foreground">Format</label>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { id: "n", label: "1" },
                                    { id: "page-n", label: "Page 1" },
                                    { id: "n-of-m", label: "1 of N" },
                                    { id: "page-n-of-m", label: "Page 1 of N" }
                                ].map((fmt) => (
                                    <Button
                                        key={fmt.id}
                                        variant={format === fmt.id ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setFormat(fmt.id as any)}
                                        className="justify-start"
                                    >
                                        {fmt.label}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="mb-2 block text-xs font-medium text-muted-foreground">Start From</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={startFrom}
                                    onChange={(e) => setStartFrom(parseInt(e.target.value) || 1)}
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                />
                            </div>
                            <div>
                                <label className="mb-2 block text-xs font-medium text-muted-foreground">Page Range (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. 1-5, 8"
                                    value={pageRange}
                                    onChange={(e) => setPageRange(e.target.value)}
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="mb-2 block text-xs font-medium text-muted-foreground">Font Family</label>
                                <select 
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={fontFamily}
                                    onChange={(e) => setFontFamily(e.target.value as any)}
                                >
                                    <option value="Helvetica">Helvetica</option>
                                    <option value="TimesRoman">Times New Roman</option>
                                    <option value="Courier">Courier</option>
                                </select>
                            </div>
                            <div>
                                <label className="mb-2 block text-xs font-medium text-muted-foreground">Font Size</label>
                                <input
                                    type="number"
                                    min="6"
                                    max="72"
                                    value={fontSize}
                                    onChange={(e) => setFontSize(parseInt(e.target.value) || 12)}
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="mb-2 block text-xs font-medium text-muted-foreground">Color</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={color}
                                        onChange={(e) => setColor(e.target.value)}
                                        className="h-9 w-12 cursor-pointer rounded-md border border-input p-1"
                                    />
                                    <span className="text-xs text-muted-foreground">{color}</span>
                                </div>
                            </div>
                            <div>
                                <label className="mb-2 block text-xs font-medium text-muted-foreground">Margin (px)</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="200"
                                    value={margin}
                                    onChange={(e) => setMargin(parseInt(e.target.value) || 0)}
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="mb-2 block text-xs font-medium text-muted-foreground">Position</label>
                            <div className="grid grid-cols-3 gap-2">
                                {["top-left", "top-center", "top-right", "bottom-left", "bottom-center", "bottom-right"].map((pos) => (
                                    <Button
                                        key={pos}
                                        variant={position === pos ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setPosition(pos as any)}
                                        className="h-10"
                                    >
                                        <div className={`h-2 w-2 rounded-full bg-current ${pos.includes("top") ? "mb-auto" : "mt-auto"} ${pos.includes("left") ? "mr-auto" : pos.includes("right") ? "ml-auto" : "mx-auto"}`} />
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <Button
                        size="lg"
                        onClick={addPageNumbers}
                        disabled={isProcessing}
                        className="w-full mt-4"
                    >
                        {isProcessing ? "Processing..." : "Add Page Numbers"}
                    </Button>
                </div>

                <div className="relative overflow-hidden rounded-xl border bg-muted/20 p-4 min-h-[400px]">
                    <div className="relative h-full">
                        <PdfPreview file={file} />
                        {/* Simulate page number position */}
                        <div 
                            className={`absolute p-2 text-xs font-bold border shadow-sm transition-all duration-300
                            ${position === "bottom-center" ? "bottom-0 left-1/2 -translate-x-1/2" : ""}
                            ${position === "bottom-right" ? "bottom-0 right-0" : ""}
                            ${position === "bottom-left" ? "bottom-0 left-0" : ""}
                            ${position === "top-right" ? "top-0 right-0" : ""}
                            ${position === "top-left" ? "top-0 left-0" : ""}
                            ${position === "top-center" ? "top-0 left-1/2 -translate-x-1/2" : ""}
                            `}
                            style={{
                                fontFamily: fontFamily === "TimesRoman" ? "Times New Roman" : fontFamily === "Courier" ? "Courier" : "Helvetica",
                                fontSize: `${Math.max(10, fontSize)}px`, // Scale for preview
                                color: color,
                                margin: `${margin}px` // This might push it out of bounds in preview, but gives an idea
                            }}
                        >
                            {format === "n" && `${startFrom}`}
                            {format === "page-n" && `Page ${startFrom}`}
                            {format === "n-of-m" && `${startFrom} of N`}
                            {format === "page-n-of-m" && `Page ${startFrom} of N`}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
