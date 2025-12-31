"use client";

import { useState, useRef } from "react";
import FileUploadHero from "../ui/file-upload-hero"; // Hero uploader (big CTA, full-page drag overlay)
import { Button } from "../ui/button";
import { ArrowRight, Globe, Settings, Layout, Code, FileCode } from "lucide-react";
import jsPDF from "jspdf";

export function HtmlToPdfTool() {
    const [file, setFile] = useState<File | null>(null);
    const [htmlContent, setHtmlContent] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const previewRef = useRef<HTMLDivElement>(null);
    
    // Options
    const [pageSize, setPageSize] = useState<"a4" | "letter">("a4");
    const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
    const [margin, setMargin] = useState<"small" | "medium" | "large">("medium");

    const handleFileSelected = async (files: File[]) => {
        if (files.length > 0) {
            const selectedFile = files[0];
            setFile(selectedFile);
            const text = await selectedFile.text();
            setHtmlContent(text);
        }
    };

    const convertToPdf = async () => {
        if (!previewRef.current || !htmlContent) return;
        setIsProcessing(true);

        try {
            const doc = new jsPDF({
                unit: "pt",
                format: pageSize,
                orientation: orientation
            });

            const marginSize = margin === "small" ? 20 : margin === "medium" ? 40 : 72;
            const pageWidth = pageSize === "a4" ? 595.28 : 612;
            const pageHeight = pageSize === "a4" ? 841.89 : 792;
            
            const finalWidth = orientation === "portrait" ? pageWidth : pageHeight;
            const contentWidth = finalWidth - (marginSize * 2);

            await doc.html(previewRef.current, {
                callback: function (doc) {
                    doc.save("converted.pdf");
                    setIsProcessing(false);
                },
                x: marginSize,
                y: marginSize,
                width: contentWidth,
                windowWidth: 800, // Fixed window width for consistent rendering
                autoPaging: "text",
                margin: [marginSize, marginSize, marginSize, marginSize]
            });

        } catch (error) {
            console.error("Error converting HTML to PDF:", error);
            alert("Failed to convert HTML to PDF. Please try again.");
            setIsProcessing(false);
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">HTML to PDF</h2>
                {file && (
                    <Button variant="outline" onClick={() => { setFile(null); setHtmlContent(""); }}>
                        Clear File
                    </Button>
                )}
            </div>

            {!file && !htmlContent && (
                <div className="mb-8">
                    <div className="min-h-[calc(100vh-120px)] flex items-center justify-center">
                        <FileUploadHero
                            title="HTML to PDF"
                            onFilesSelected={handleFileSelected}
                            maxFiles={1}
                            accept={{ "text/html": [".html"] }}
                        />
                    </div>
                </div>
            )}

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
                        <label className="mb-2 block text-xs font-medium text-muted-foreground">Orientation</label>
                        <div className="flex gap-2">
                            {["portrait", "landscape"].map((o) => (
                                <Button
                                    key={o}
                                    variant={orientation === o ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setOrientation(o as any)}
                                    className="flex-1 capitalize"
                                >
                                    {o}
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

                    <Button
                        size="lg"
                        onClick={convertToPdf}
                        disabled={isProcessing || !htmlContent}
                        className="w-full mt-4"
                    >
                        {isProcessing ? "Processing..." : "Convert to PDF"}
                    </Button>
                </div>

                <div className="md:col-span-2 space-y-6">
                    <div className="space-y-2">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Code className="h-5 w-5" /> HTML Input
                        </h3>
                        <textarea
                            value={htmlContent}
                            onChange={(e) => setHtmlContent(e.target.value)}
                            className="h-48 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                            placeholder="<h1>Hello World</h1><p>Type your HTML here...</p>"
                        />
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Layout className="h-5 w-5" /> Preview
                        </h3>
                        <div className="rounded-xl border bg-muted/30 p-4 min-h-[400px] overflow-auto flex justify-center">
                            {htmlContent ? (
                                <div
                                    ref={previewRef}
                                    className="bg-white shadow-lg p-8 prose max-w-none"
                                    style={{
                                        width: "100%",
                                        maxWidth: "650px",
                                        minHeight: "600px"
                                    }}
                                    dangerouslySetInnerHTML={{ __html: htmlContent }}
                                />
                            ) : (
                                <div className="flex h-full items-center justify-center text-muted-foreground">
                                    Preview will appear here...
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
