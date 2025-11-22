"use client";

import { useState, useEffect, useRef } from "react";
import { FileUpload } from "../ui/file-upload";
import { Button } from "../ui/button";
import { ArrowRight, GitCompare, Loader2 } from "lucide-react";
import { PdfPreview } from "../ui/pdf-preview";

export function ComparePdfTool() {
    const [file1, setFile1] = useState<File | null>(null);
    const [file2, setFile2] = useState<File | null>(null);
    const [opacity, setOpacity] = useState(50);
    const [isComputing, setIsComputing] = useState(false);
    const [diffImage, setDiffImage] = useState<string | null>(null);

    useEffect(() => {
        // Worker will be set in computeDiff
    }, []);

    const handleFile1Selected = (files: File[]) => {
        if (files.length > 0) setFile1(files[0]);
    };

    const handleFile2Selected = (files: File[]) => {
        if (files.length > 0) setFile2(files[0]);
    };

    const computeDiff = async () => {
        if (!file1 || !file2) return;
        setIsComputing(true);
        setDiffImage(null);

        try {
            const pdfjsLib = await import("pdfjs-dist");

            if (typeof window !== "undefined") {
                pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
            }

            // Load both PDFs
            const ab1 = await file1.arrayBuffer();
            const ab2 = await file2.arrayBuffer();
            const pdf1 = await pdfjsLib.getDocument({ data: ab1 }).promise;
            const pdf2 = await pdfjsLib.getDocument({ data: ab2 }).promise;

            // Render Page 1 of both
            const page1 = await pdf1.getPage(1);
            const page2 = await pdf2.getPage(1);

            const viewport1 = page1.getViewport({ scale: 1 });
            const viewport2 = page2.getViewport({ scale: 1 });

            // Use the larger dimensions
            const width = Math.max(viewport1.width, viewport2.width);
            const height = Math.max(viewport1.height, viewport2.height);

            const canvas1 = document.createElement("canvas");
            canvas1.width = width;
            canvas1.height = height;
            const ctx1 = canvas1.getContext("2d");
            if (!ctx1) throw new Error("Could not get context 1");

            const canvas2 = document.createElement("canvas");
            canvas2.width = width;
            canvas2.height = height;
            const ctx2 = canvas2.getContext("2d");
            if (!ctx2) throw new Error("Could not get context 2");

            await page1.render({ canvasContext: ctx1, viewport: viewport1, canvas: canvas1 }).promise;
            await page2.render({ canvasContext: ctx2, viewport: viewport2, canvas: canvas2 }).promise;

            // Compare pixels
            const imgData1 = ctx1.getImageData(0, 0, width, height);
            const imgData2 = ctx2.getImageData(0, 0, width, height);
            const diffData = ctx1.createImageData(width, height);

            let diffCount = 0;
            for (let i = 0; i < imgData1.data.length; i += 4) {
                const r1 = imgData1.data[i];
                const g1 = imgData1.data[i + 1];
                const b1 = imgData1.data[i + 2];
                const a1 = imgData1.data[i + 3];

                const r2 = imgData2.data[i];
                const g2 = imgData2.data[i + 1];
                const b2 = imgData2.data[i + 2];
                const a2 = imgData2.data[i + 3];

                if (Math.abs(r1 - r2) > 30 || Math.abs(g1 - g2) > 30 || Math.abs(b1 - b2) > 30) {
                    // Difference found - paint red
                    diffData.data[i] = 255; // R
                    diffData.data[i + 1] = 0;   // G
                    diffData.data[i + 2] = 0;   // B
                    diffData.data[i + 3] = 255; // A
                    diffCount++;
                } else {
                    // No difference - paint semi-transparent gray or original
                    // Let's paint a faded version of original
                    diffData.data[i] = r1;
                    diffData.data[i + 1] = g1;
                    diffData.data[i + 2] = b1;
                    diffData.data[i + 3] = 50; // Faded
                }
            }

            const diffCanvas = document.createElement("canvas");
            diffCanvas.width = width;
            diffCanvas.height = height;
            const diffCtx = diffCanvas.getContext("2d");
            diffCtx?.putImageData(diffData, 0, 0);

            setDiffImage(diffCanvas.toDataURL());

        } catch (error) {
            console.error("Diff error:", error);
            alert("Failed to compute diff.");
        } finally {
            setIsComputing(false);
        }
    };

    if (!file1 || !file2) {
        return (
            <div className="grid gap-8 md:grid-cols-2">
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Upload First PDF</h3>
                    <FileUpload
                        onFilesSelected={handleFile1Selected}
                        maxFiles={1}
                        accept={{ "application/pdf": [".pdf"] }}
                        description="Drop the original PDF file here"
                    />
                    {file1 && <p className="text-sm font-medium text-alert-success">Selected: {file1.name}</p>}
                </div>
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Upload Second PDF</h3>
                    <FileUpload
                        onFilesSelected={handleFile2Selected}
                        maxFiles={1}
                        accept={{ "application/pdf": [".pdf"] }}
                        description="Drop the modified PDF file here"
                    />
                    {file2 && <p className="text-sm font-medium text-alert-success">Selected: {file2.name}</p>}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Compare Documents</h2>
                </div>
                <div className="flex gap-4">
                    <Button variant="outline" onClick={() => { setFile1(null); setFile2(null); setDiffImage(null); }}>
                        Reset
                    </Button>
                    <Button onClick={computeDiff} disabled={isComputing}>
                        {isComputing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GitCompare className="mr-2 h-4 w-4" />}
                        Compute Pixel Diff
                    </Button>
                </div>
            </div>

            {diffImage ? (
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-center">Difference Map (Red = Changed)</h3>
                    <div className="flex justify-center rounded-xl border bg-muted/20 p-4">
                        <img src={diffImage} alt="Diff" className="max-w-full shadow-lg" />
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-medium">Overlay Opacity</span>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={opacity}
                            onChange={(e) => setOpacity(Number(e.target.value))}
                            className="w-full max-w-xs"
                        />
                        <span className="text-sm text-muted-foreground">{opacity}%</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Adjust opacity to see differences manually, or click "Compute Pixel Diff" for automated analysis.
                    </p>

                    <div className="relative mx-auto max-w-3xl overflow-hidden rounded-xl border bg-muted/20 p-4">
                        <div className="relative">
                            {/* Base Layer */}
                            <div className="relative z-0">
                                <PdfPreview file={file1} />
                            </div>

                            {/* Overlay Layer */}
                            <div
                                className="absolute inset-0 z-10 pointer-events-none mix-blend-multiply"
                                style={{ opacity: opacity / 100 }}
                            >
                                <PdfPreview file={file2} />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid gap-8 md:grid-cols-2">
                <div>
                    <h3 className="mb-2 text-center font-semibold">{file1.name}</h3>
                    <div className="border rounded p-2">
                        <PdfPreview file={file1} />
                    </div>
                </div>
                <div>
                    <h3 className="mb-2 text-center font-semibold">{file2.name}</h3>
                    <div className="border rounded p-2">
                        <PdfPreview file={file2} />
                    </div>
                </div>
            </div>
        </div>
    );
}
