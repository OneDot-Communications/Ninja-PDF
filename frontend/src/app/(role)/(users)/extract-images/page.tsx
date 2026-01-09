"use client";

import { useState, useRef } from "react";
import { Header } from "@/components/layout/header";
import FileUploadHero from "@/components/ui/file-upload-hero";
import { Loader2, Download, Image as ImageIcon, Check, Trash2, CheckSquare, Square } from "lucide-react";

interface ExtractedImage {
    id: string;
    dataUrl: string;
    name: string;
    pageNumber: number;
    imageIndex: number;
    width: number;
    height: number;
    selected: boolean;
}

export default function ExtractImagesPage() {
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState("");
    const [extractedImages, setExtractedImages] = useState<ExtractedImage[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelected = (files: File[]) => {
        const file = files.find(f => f.type === 'application/pdf');
        if (file) {
            setPdfFile(file);
            processFile(file);
        }
    };

    const processFile = async (file: File) => {
        setIsProcessing(true);
        setProgress("Loading PDF.js...");
        setExtractedImages([]);

        try {
            const { getPdfJs } = await import('@/lib/services/pdf-service');
            const pdfjsLib = await getPdfJs();

            setProgress("Loading PDF...");
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await (pdfjsLib as any).getDocument({ data: arrayBuffer }).promise;

            const images: ExtractedImage[] = [];
            const totalPages = pdf.numPages;
            const OPS = (pdfjsLib as any).OPS;
            const processedImageData = new Set<string>(); // Track processed images by data hash

            // First pass: Try to extract embedded XObject images
            for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
                setProgress(`Scanning page ${pageNum} of ${totalPages}...`);

                try {
                    const page = await pdf.getPage(pageNum);
                    const viewport = page.getViewport({ scale: 2 }); // Higher scale for better quality

                    // Render page first to load all image resources
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    if (context) {
                        canvas.width = viewport.width;
                        canvas.height = viewport.height;
                        await page.render({ canvasContext: context, viewport }).promise;
                    }

                    // Get resources from the page
                    const resources = await page.getOperatorList();

                    // Find unique image operators (deduplicate by name)
                    const seenNames = new Set<string>();
                    const imageOps: { name: string; type: string; args?: any }[] = [];

                    for (let i = 0; i < resources.fnArray.length; i++) {
                        const op = resources.fnArray[i];
                        const args = resources.argsArray[i];

                        if (op === OPS.paintImageXObject && args?.[0]) {
                            const name = args[0];
                            if (!seenNames.has(name)) {
                                seenNames.add(name);
                                imageOps.push({ name, type: 'xobject' });
                            }
                        } else if (op === OPS.paintInlineImageXObject && args?.[0]) {
                            // Inline images - pass the actual data
                            imageOps.push({ name: `inline_${i}`, type: 'inline', args: args[0] });
                        } else if (op === OPS.paintImageMaskXObject && args?.[0]) {
                            const name = typeof args[0] === 'string' ? args[0] : `mask_${i}`;
                            if (!seenNames.has(name)) {
                                seenNames.add(name);
                                imageOps.push({ name, type: 'mask' });
                            }
                        }
                    }

                    console.log(`Page ${pageNum}: Found ${imageOps.length} image operations`);

                    let imageIndex = 0;

                    for (const imgOp of imageOps) {
                        setProgress(`Page ${pageNum}/${totalPages}: Processing image ${imageIndex + 1}/${imageOps.length}...`);

                        try {
                            let imgData: any = null;

                            if (imgOp.type === 'inline') {
                                imgData = imgOp.args;
                            } else if (imgOp.type === 'xobject' || imgOp.type === 'mask') {
                                // Increased timeout to 2000ms for slower images
                                imgData = await new Promise<any>((resolve) => {
                                    let resolved = false;
                                    const timeout = setTimeout(() => {
                                        if (!resolved) {
                                            resolved = true;
                                            resolve(null);
                                        }
                                    }, 2000); // 2 second timeout

                                    try {
                                        page.objs.get(imgOp.name, (data: any) => {
                                            if (!resolved) {
                                                resolved = true;
                                                clearTimeout(timeout);
                                                resolve(data);
                                            }
                                        });
                                    } catch {
                                        if (!resolved) {
                                            resolved = true;
                                            clearTimeout(timeout);
                                            resolve(null);
                                        }
                                    }
                                });
                            }

                            if (!imgData) {
                                console.log(`  ${imgOp.name}: No data retrieved`);
                                continue;
                            }

                            let imgWidth = imgData.width || 0;
                            let imgHeight = imgData.height || 0;

                            console.log(`  ${imgOp.name}: ${imgWidth}x${imgHeight}`);

                            // Skip very small images (icons, bullets, etc.)
                            if (imgWidth < 5 || imgHeight < 5) {
                                console.log(`    Skipped: too small`);
                                continue;
                            }

                            imageIndex++;

                            // Create canvas and extract image
                            const imgCanvas = document.createElement('canvas');
                            const imgCtx = imgCanvas.getContext('2d');
                            if (!imgCtx) continue;

                            imgCanvas.width = imgWidth;
                            imgCanvas.height = imgHeight;

                            let extracted = false;

                            // Handle ImageBitmap
                            if (imgData.bitmap instanceof ImageBitmap) {
                                imgWidth = imgData.bitmap.width;
                                imgHeight = imgData.bitmap.height;
                                imgCanvas.width = imgWidth;
                                imgCanvas.height = imgHeight;
                                imgCtx.drawImage(imgData.bitmap, 0, 0);
                                extracted = true;
                            }
                            // Handle HTMLImageElement or HTMLCanvasElement
                            else if (imgData instanceof HTMLImageElement || imgData instanceof HTMLCanvasElement) {
                                imgWidth = imgData.width;
                                imgHeight = imgData.height;
                                imgCanvas.width = imgWidth;
                                imgCanvas.height = imgHeight;
                                imgCtx.drawImage(imgData, 0, 0);
                                extracted = true;
                            }
                            // Handle raw pixel data
                            else if (imgData.data && imgData.data.length > 0) {
                                const imageData = imgCtx.createImageData(imgWidth, imgHeight);
                                const expectedRGBA = imgWidth * imgHeight * 4;
                                const expectedRGB = imgWidth * imgHeight * 3;
                                const expectedGray = imgWidth * imgHeight;
                                const dataLen = imgData.data.length;

                                if (dataLen === expectedRGBA) {
                                    imageData.data.set(new Uint8ClampedArray(imgData.data));
                                    extracted = true;
                                } else if (dataLen === expectedRGB) {
                                    for (let j = 0; j < imgWidth * imgHeight; j++) {
                                        imageData.data[j * 4] = imgData.data[j * 3];
                                        imageData.data[j * 4 + 1] = imgData.data[j * 3 + 1];
                                        imageData.data[j * 4 + 2] = imgData.data[j * 3 + 2];
                                        imageData.data[j * 4 + 3] = 255;
                                    }
                                    extracted = true;
                                } else if (dataLen === expectedGray) {
                                    for (let j = 0; j < imgWidth * imgHeight; j++) {
                                        const gray = imgData.data[j];
                                        imageData.data[j * 4] = gray;
                                        imageData.data[j * 4 + 1] = gray;
                                        imageData.data[j * 4 + 2] = gray;
                                        imageData.data[j * 4 + 3] = 255;
                                    }
                                    extracted = true;
                                }

                                if (extracted) {
                                    imgCtx.putImageData(imageData, 0, 0);
                                }
                            }

                            if (!extracted) {
                                console.log(`    Skipped: Could not extract pixel data`);
                                continue;
                            }

                            const dataUrl = imgCanvas.toDataURL('image/png');

                            // Better deduplication: use a hash of a sample of the image data
                            const sampleSize = Math.min(500, dataUrl.length);
                            const startPos = Math.floor(dataUrl.length / 3);
                            const hash = dataUrl.substring(startPos, startPos + sampleSize);

                            if (processedImageData.has(hash)) {
                                console.log(`    Skipped: duplicate`);
                                continue;
                            }
                            processedImageData.add(hash);

                            images.push({
                                id: `page-${pageNum}-image-${imageIndex}`,
                                dataUrl,
                                name: `Image ${images.length + 1}`,
                                pageNumber: pageNum,
                                imageIndex,
                                width: imgWidth,
                                height: imgHeight,
                                selected: true
                            });

                            console.log(`    ✓ Extracted: ${imgWidth}x${imgHeight}`);
                            imgCanvas.remove();
                        } catch (imgErr) {
                            console.warn(`Error extracting ${imgOp.name}:`, imgErr);
                        }
                    }

                    // Cleanup
                    canvas.remove();
                    page.cleanup();
                } catch (pageErr) {
                    console.warn(`Error processing page ${pageNum}:`, pageErr);
                }
            }

            // If no images found through XObject extraction, try rendering pages as images
            if (images.length === 0) {
                console.log("No XObject images found. Rendering pages as fallback...");
                setProgress("Rendering pages as images...");

                for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
                    setProgress(`Rendering page ${pageNum} of ${totalPages}...`);

                    try {
                        const page = await pdf.getPage(pageNum);
                        const viewport = page.getViewport({ scale: 2 });

                        const canvas = document.createElement('canvas');
                        const context = canvas.getContext('2d');
                        if (!context) continue;

                        canvas.width = viewport.width;
                        canvas.height = viewport.height;

                        await page.render({ canvasContext: context, viewport }).promise;

                        const dataUrl = canvas.toDataURL('image/png');

                        images.push({
                            id: `page-${pageNum}`,
                            dataUrl,
                            name: `Page ${pageNum}`,
                            pageNumber: pageNum,
                            imageIndex: 1,
                            width: Math.round(viewport.width),
                            height: Math.round(viewport.height),
                            selected: true
                        });

                        canvas.remove();
                        page.cleanup();
                    } catch (pageErr) {
                        console.warn(`Error rendering page ${pageNum}:`, pageErr);
                    }
                }
            }

            console.log(`Total images extracted: ${images.length}`);
            setExtractedImages(images);

            if (images.length === 0) {
                setProgress("No embedded images found in this PDF");
            } else {
                setProgress("");
            }
        } catch (error: any) {
            console.error("Error extracting images:", error);
            setProgress(`Error: ${error.message || "Failed to extract images"}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const toggleImageSelection = (id: string) => {
        setExtractedImages(prev =>
            prev.map(img => img.id === id ? { ...img, selected: !img.selected } : img)
        );
    };

    const selectAll = () => {
        setExtractedImages(prev => prev.map(img => ({ ...img, selected: true })));
    };

    const deselectAll = () => {
        setExtractedImages(prev => prev.map(img => ({ ...img, selected: false })));
    };

    const downloadSingle = async (image: ExtractedImage) => {
        const link = document.createElement('a');
        link.href = image.dataUrl;
        link.download = image.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const downloadSelected = async () => {
        const selectedImages = extractedImages.filter(img => img.selected);
        if (selectedImages.length === 0) return;

        if (selectedImages.length === 1) {
            downloadSingle(selectedImages[0]);
            return;
        }

        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();

        for (const image of selectedImages) {
            const response = await fetch(image.dataUrl);
            const blob = await response.blob();
            zip.file(image.name, blob);
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `extracted-images-${Date.now()}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const downloadAll = async () => {
        if (extractedImages.length === 0) return;

        if (extractedImages.length === 1) {
            downloadSingle(extractedImages[0]);
            return;
        }

        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();

        for (const image of extractedImages) {
            const response = await fetch(image.dataUrl);
            const blob = await response.blob();
            zip.file(image.name, blob);
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `all-images-${Date.now()}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const reset = () => {
        setPdfFile(null);
        setExtractedImages([]);
        setProgress("");
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const selectedCount = extractedImages.filter(img => img.selected).length;
    const totalCount = extractedImages.length;

    // Upload View
    if (!pdfFile) {
        return (
            <div className="flex min-h-screen flex-col bg-slate-50">
                <Header />
                <main className="flex-1 flex flex-col relative">
                    <div className="min-h-[calc(100vh-120px)] flex items-center justify-center">
                        <FileUploadHero
                            title="Extract Images"
                            description="Extract all embedded images from your PDF"
                            onFilesSelected={handleFileSelected}
                            maxFiles={1}
                            accept={{ "application/pdf": [".pdf"] }}
                        />
                    </div>
                </main>
            </div>
        );
    }

    // Processing View
    if (isProcessing) {
        return (
            <div className="flex min-h-screen flex-col bg-slate-50">
                <Header />
                <main className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <Loader2 className="w-16 h-16 text-[#4383BF] animate-spin mx-auto mb-6" />
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">Extracting Images</h2>
                        <p className="text-slate-600">{progress}</p>
                    </div>
                </main>
            </div>
        );
    }

    // Results View
    return (
        <div className="flex min-h-screen flex-col bg-slate-50">
            <Header />
            <main className="flex-1 relative">
                <div className="bg-[#f6f7f8] min-h-[calc(100vh-80px)]">
                    {/* No Images Found - Full Width Centered */}
                    {extractedImages.length === 0 && progress && (
                        <div className="min-h-[calc(100vh-80px)] flex items-center justify-center">
                            <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-lg p-16 text-center max-w-md">
                                <ImageIcon className="w-24 h-24 text-slate-300 mx-auto mb-6" />
                                <h3 className="text-2xl font-bold text-slate-700 mb-3">No Images Found</h3>
                                <p className="text-slate-500 mb-8 text-lg">{progress}</p>
                                <button
                                    onClick={reset}
                                    className="px-8 py-4 bg-[#4383BF] hover:bg-[#3A74A8] text-white font-bold rounded-xl transition-colors text-lg"
                                >
                                    Try Another PDF
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Images Grid Layout - Only shows when images exist */}
                    {extractedImages.length > 0 && (
                        <div className="max-w-[1800px] mx-auto px-4 py-4 md:py-8">
                            <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
                                {/* Left Column - Images Grid */}
                                <div className="flex-1 max-w-full lg:max-w-[1200px]">
                                    {/* Control Bar */}
                                    <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-[#e2e8f0] shadow-sm mb-4 p-4">
                                        <div className="flex items-center justify-between flex-wrap gap-4">
                                            <div className="flex items-center gap-4">
                                                <span className="text-[#111418] font-bold text-lg">
                                                    {selectedCount} of {totalCount} images selected
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <div className="bg-[#f0f2f4] rounded-lg flex p-1">
                                                    <button
                                                        onClick={selectAll}
                                                        className="rounded-md px-3 py-2 flex items-center gap-1 hover:bg-white/50 transition-colors"
                                                    >
                                                        <CheckSquare className="h-4 w-4 text-[#617289]" />
                                                        <span className="text-[#617289] font-medium text-sm">Select All</span>
                                                    </button>
                                                    <button
                                                        onClick={deselectAll}
                                                        className="rounded-md px-3 py-2 flex items-center gap-1 hover:bg-white/50 transition-colors"
                                                    >
                                                        <Square className="h-4 w-4 text-[#617289]" />
                                                        <span className="text-[#617289] font-medium text-sm">Deselect All</span>
                                                    </button>
                                                </div>

                                                <div className="bg-[#cbd5e1] w-px h-6"></div>

                                                <button
                                                    onClick={reset}
                                                    className="rounded-lg flex items-center gap-2 px-3 py-2 hover:bg-[#f0f2f4] transition-colors"
                                                >
                                                    <Trash2 className="h-5 w-5 text-[#617289]" />
                                                    <span className="text-[#617289] font-bold text-sm">Start Over</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Images Grid */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pb-4">
                                        {extractedImages.map((image, index) => (
                                            <div
                                                key={image.id}
                                                className={`bg-white rounded-xl border-2 shadow-sm hover:shadow-md transition-all cursor-pointer ${image.selected ? 'border-[#4383BF]' : 'border-transparent'}`}
                                                onClick={() => toggleImageSelection(image.id)}
                                            >
                                                <div className="bg-[#f1f5f9] w-full aspect-square relative rounded-t-xl overflow-hidden">
                                                    <div className={`absolute top-2 left-2 rounded-full w-6 h-6 flex items-center justify-center z-10 transition-colors ${image.selected ? 'bg-[#4383BF]' : 'bg-black/40'}`}>
                                                        {image.selected ? (
                                                            <Check className="w-4 h-4 text-white" />
                                                        ) : (
                                                            <span className="text-white font-bold text-xs">{index + 1}</span>
                                                        )}
                                                    </div>

                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            downloadSingle(image);
                                                        }}
                                                        className="absolute top-2 right-2 bg-white/90 hover:bg-white rounded-full w-8 h-8 flex items-center justify-center z-10 shadow-md transition-colors"
                                                    >
                                                        <Download className="w-4 h-4 text-[#4383BF]" />
                                                    </button>

                                                    <img
                                                        src={image.dataUrl}
                                                        alt={image.name}
                                                        className="w-full h-full object-contain p-2"
                                                    />
                                                </div>

                                                <div className="p-3">
                                                    <h3 className="text-[#111418] font-bold text-sm leading-tight mb-1 truncate">
                                                        Image {index + 1}
                                                    </h3>
                                                    <p className="text-[#617289] font-medium text-xs">
                                                        Page {image.pageNumber} • {image.width}×{image.height}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Right Sidebar */}
                                {extractedImages.length > 0 && (
                                    <div className="hidden lg:block lg:w-[380px] lg:fixed lg:right-4 lg:top-24 lg:h-[calc(100vh-120px)] lg:z-10">
                                        <div className="bg-white rounded-3xl border border-[#e2e8f0] p-6 h-full flex flex-col shadow-xl">
                                            <div className="mb-6">
                                                <h2 className="text-[#111418] font-bold text-lg flex items-center gap-2">
                                                    <ImageIcon className="h-5 w-5" />
                                                    Download Options
                                                </h2>
                                            </div>

                                            <div className="flex-1 space-y-6 overflow-y-auto">
                                                <div className="bg-[#f6f7f8] rounded-xl p-4">
                                                    <div className="text-[#617289] font-bold text-xs uppercase tracking-wider mb-3">
                                                        Summary
                                                    </div>
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-[#617289] text-sm">Total Images</span>
                                                            <span className="text-[#111418] font-bold text-sm">{totalCount}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-[#617289] text-sm">Selected</span>
                                                            <span className="text-[#4383BF] font-bold text-sm">{selectedCount}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-[#617289] text-sm">Format</span>
                                                            <span className="text-[#111418] font-bold text-sm">PNG</span>
                                                        </div>
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-[#617289] text-sm">Source</span>
                                                            <span className="text-[#111418] font-bold text-sm truncate max-w-[150px]" title={pdfFile.name}>
                                                                {pdfFile.name}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="bg-[#4383BF]/5 rounded-xl p-4">
                                                    <div className="text-[#4383BF] font-bold text-xs uppercase tracking-wider mb-2">
                                                        💡 Tip
                                                    </div>
                                                    <p className="text-[#617289] text-sm">
                                                        Click on images to select/deselect them. Download selected images or all at once.
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="mt-6 space-y-3">
                                                <button
                                                    onClick={downloadSelected}
                                                    disabled={selectedCount === 0}
                                                    className="w-full h-[52px] bg-[#4383BF] hover:bg-[#3A74A8] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center gap-2 font-bold text-base shadow-lg transition-colors"
                                                >
                                                    <Download className="h-5 w-5" />
                                                    Download Selected ({selectedCount})
                                                </button>
                                                <button
                                                    onClick={downloadAll}
                                                    className="w-full h-[52px] bg-[#f0f2f4] hover:bg-[#e2e8f0] text-[#617289] rounded-xl flex items-center justify-center gap-2 font-bold text-base transition-colors"
                                                >
                                                    <Download className="h-5 w-5" />
                                                    Download All ({totalCount})
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Mobile Download Buttons */}
                                {extractedImages.length > 0 && (
                                    <div className="lg:hidden fixed bottom-4 left-4 right-4 z-40 flex gap-2">
                                        <button
                                            onClick={downloadSelected}
                                            disabled={selectedCount === 0}
                                            className="flex-1 h-14 bg-[#4383BF] hover:bg-[#3A74A8] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center gap-2 font-bold text-sm shadow-lg transition-colors"
                                        >
                                            <Download className="h-5 w-5" />
                                            Selected ({selectedCount})
                                        </button>
                                        <button
                                            onClick={downloadAll}
                                            className="flex-1 h-14 bg-white border border-[#e2e8f0] hover:bg-[#f0f2f4] text-[#617289] rounded-xl flex items-center justify-center gap-2 font-bold text-sm shadow-lg transition-colors"
                                        >
                                            <Download className="h-5 w-5" />
                                            All ({totalCount})
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
