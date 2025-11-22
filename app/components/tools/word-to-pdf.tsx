"use client";

import { useState, useRef } from "react";
import { FileUpload } from "../ui/file-upload";
import { Button } from "../ui/button";
import { ArrowRight, FileText, Settings, Layout, Type } from "lucide-react";
import mammoth from "mammoth";
import jsPDF from "jspdf";

export function WordToPdfTool() {
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [htmlContent, setHtmlContent] = useState<string | null>(null);
    const previewRef = useRef<HTMLDivElement>(null);
    
    // Options
    const [pageSize, setPageSize] = useState<"a4" | "letter">("a4");
    const [margin, setMargin] = useState<"small" | "medium" | "large">("medium");
    const [fontSize, setFontSize] = useState<"small" | "medium" | "large">("medium");

    const handleFileSelected = async (files: File[]) => {
        if (files.length > 0) {
            const selectedFile = files[0];
            setFile(selectedFile);

            try {
                const arrayBuffer = await selectedFile.arrayBuffer();
                const result = await mammoth.convertToHtml({ arrayBuffer });
                setHtmlContent(result.value);
            } catch (error) {
                console.error("Error reading Word file:", error);
                alert("Failed to read Word file.");
            }
        }
    };

    const convertToPdf = async () => {
        if (!previewRef.current || !htmlContent) return;
        setIsProcessing(true);

        try {
            const doc = new jsPDF({
                unit: "pt",
                format: pageSize,
                orientation: "portrait"
            });

            const marginSize = margin === "small" ? 36 : margin === "medium" ? 54 : 72; // 72pt = 1 inch
            const pageWidth = pageSize === "a4" ? 595.28 : 612;
            const contentWidth = pageWidth - (marginSize * 2);

            // We need to temporarily make the preview visible and styled for PDF generation if it isn't already
            // But here we are using the visible previewRef.
            
            await doc.html(previewRef.current, {
                callback: function (doc) {
                    doc.save(`${file?.name.replace(/\.docx?$/, "") || "converted"}.pdf`);
                    setIsProcessing(false);
                },
                x: marginSize,
                y: marginSize,
                width: contentWidth,
                windowWidth: 650, // Force a specific window width for consistent rendering
                autoPaging: "text",
                margin: [marginSize, marginSize, marginSize, marginSize]
            });

        } catch (error) {
            console.error("Error converting to PDF:", error);
            alert("Failed to convert to PDF. Please try again.");
            setIsProcessing(false);
        }
    };

    if (!file) {
        return (
            <div className="mx-auto max-w-2xl">
                <FileUpload
                    onFilesSelected={handleFileSelected}
                    maxFiles={1}
                    accept={{ "application/msword": [".doc"], "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"] }}
                    description="Drop a Word file (.doc or .docx) here to convert it to PDF"
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
                    <Button variant="outline" onClick={() => { setFile(null); setHtmlContent(null); }}>
                        Change File
                    </Button>
                </div>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
                <div className="space-y-6 rounded-xl border bg-card p-6 h-fit">
                    <h3 className="font-semibold flex items-center gap-2">
                        <Settings className="h-5 w-5" /> PDF Settings
                    </h3>

                    <div>
                        <label className="mb-2 block text-xs font-medium text-muted-foreground">Page Size</label>
                        <div className="flex gap-2">
                            {["a4", "letter"].map((s) => (
                                <Button
                                    key={s}
                                    variant={pageSize === s ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setPageSize(s as any)}
                                    className="flex-1 capitalize"
                                >
                                    {s}
                                </Button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="mb-2 block text-xs font-medium text-muted-foreground">Margins</label>
                        <div className="flex gap-2">
                            {["small", "medium", "large"].map((m) => (
                                <Button
                                    key={m}
                                    variant={margin === m ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setMargin(m as any)}
                                    className="flex-1 capitalize"
                                >
                                    {m}
                                </Button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="mb-2 block text-xs font-medium text-muted-foreground">Font Size (Preview)</label>
                        <div className="flex gap-2">
                            {["small", "medium", "large"].map((f) => (
                                <Button
                                    key={f}
                                    variant={fontSize === f ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setFontSize(f as any)}
                                    className="flex-1 capitalize"
                                >
                                    {f}
                                </Button>
                            ))}
                        </div>
                    </div>

                    <div className="pt-4">
                        <p className="text-xs text-muted-foreground mb-4">
                            Note: Client-side conversion is best for simple documents. Complex layouts may vary.
                        </p>
                        <Button
                            size="lg"
                            onClick={convertToPdf}
                            disabled={isProcessing || !htmlContent}
                            className="w-full"
                        >
                            {isProcessing ? "Processing..." : "Convert to PDF"}
                        </Button>
                    </div>
                </div>

                <div className="md:col-span-2 space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Layout className="h-5 w-5" /> Preview
                    </h3>
                    <div className="rounded-xl border bg-muted/30 p-4 min-h-[500px] overflow-auto flex justify-center">
                        {htmlContent ? (
                            <div
                                ref={previewRef}
                                className={`bg-white shadow-lg p-8 ${
                                    fontSize === "small" ? "prose-sm" : fontSize === "large" ? "prose-lg" : "prose"
                                } max-w-none`}
                                style={{
                                    width: "100%",
                                    maxWidth: "650px", // Approximate A4 width for screen
                                    minHeight: "800px"
                                }}
                                dangerouslySetInnerHTML={{ __html: htmlContent }}
                            />
                        ) : (
                            <div className="flex h-full items-center justify-center text-muted-foreground">
                                Loading preview...
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
