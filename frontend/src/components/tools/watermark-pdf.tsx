"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { saveAs } from "file-saver";
import FileUploadHero from "../ui/file-upload-hero";
import { Button } from "../ui/button";
import {
    Type,
    Image as ImageIcon,
    Download,
    Settings,
    Grid3x3,
    Trash2,
    Plus,
    X,
    RotateCw,
    Palette,
    Layers,
    Move
} from "lucide-react";
import { getPdfJs } from "@/lib/services/pdf-service";
import { pdfApi } from "@/lib/services/pdf-api";
import { toast } from "@/lib/hooks/use-toast";
import { cn } from "@/lib/utils";

// Watermark element interface
interface WatermarkElement {
    id: string;
    type: "text" | "image";
    content?: string; // for text
    imageBytes?: ArrayBuffer; // for image
    imageType?: "png" | "jpg" | "svg";
    x: number; // Percentage 0-100 relative to container
    y: number; // Percentage 0-100 relative to container
    width?: number; // Percentage
    height?: number; // Percentage (aspect ratio maintained)
    fontSize?: number;
    color?: string;
    opacity?: number;
    rotation?: number;
    fontFamily?: string;
    fontWeight?: string;
    fontStyle?: string;
    page?: number; // 1-based, undefined means all pages
    position?: "center" | "top" | "bottom" | "tiled" | "custom";
    layer?: "over" | "under";
    mosaicMode?: boolean;
}

export function WatermarkPdfTool() {
    // File and PDF state
    const [file, setFile] = useState<File | null>(null);
    const [watermarks, setWatermarks] = useState<WatermarkElement[]>([]);
    const [numPages, setNumPages] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);

    // Canvas refs for grid view
    const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);

    // Properties state - defaulted for immediate use
    const [activeTab, setActiveTab] = useState<"text" | "image">("text");
    const [text, setText] = useState("18+ PDF");
    const [fontSize, setFontSize] = useState(10);
    const [fontFamily, setFontFamily] = useState("Arial");
    const [color, setColor] = useState("#000000"); // Standard Black
    const [opacity, setOpacity] = useState(0.6); // 60%
    const [rotation, setRotation] = useState(0);
    const [layer, setLayer] = useState<"over" | "under">("over");
    const [mosaicMode, setMosaicMode] = useState(false);

    // Image state
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageScale, setImageScale] = useState(10); // percentage size

    // Position state (X/Y percentages)
    const [posX, setPosX] = useState(90);
    const [posY, setPosY] = useState(90);
    const [selectedGrid, setSelectedGrid] = useState(8); // Bottom Right (0-8 index)

    // Canvas refs for grid view
    const pdfCanvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
    const watermarkCanvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
    const renderTasksRef = useRef<any[]>([]);
    const [bgRenderedCount, setBgRenderedCount] = useState(0); // Sync watermark render with BG render

    // Font options
    const fontOptions = [
        "Arial", "Helvetica", "Times New Roman", "Courier New",
        "Georgia", "Verdana", "Impact", "Ash Regular"
    ];

    // Color presets
    const colorPresets = [
        "#FF0000", "#0000FF", "#00FF00", "#FFFF00",
        "#FF00FF", "#00FFFF", "#000000", "#FFFFFF"
    ];

    const resetSettings = () => {
        setText("18+ PDF");
        setFontSize(10);
        setFontFamily("Arial");
        setColor("#000000");
        setOpacity(0.6);
        setRotation(0);
        setLayer("over");
        setMosaicMode(false);
        setPosX(90);
        setPosY(90);
        setSelectedGrid(8);
        setActiveTab("text");
        setImageFile(null);
        setImagePreview(null);
        setImageScale(10);
    };

    // Load custom fonts for canvas preview
    useEffect(() => {
        const loadCustomFonts = async () => {
            try {
                const font = new FontFace('Ash Regular', 'url(/pdfjs/Ash-Regular.ttf)');
                await font.load();
                document.fonts.add(font);
                console.log("[Watermark] Ash Regular font loaded");
            } catch (err) {
                console.error("[Watermark] Failed to load custom font:", err);
            }
        };
        loadCustomFonts();
    }, []);

    // Grid mapping: 3x3 grid to X/Y percentages
    const handleGridClick = (index: number) => {
        setSelectedGrid(index);
        const row = Math.floor(index / 3);
        const col = index % 3;

        // Map 0,1,2 to 10%, 50%, 90% (with some padding)
        const map = [10, 50, 90];
        setPosX(map[col]);
        setPosY(map[row]);
    };

    const handleFileSelected = async (newFiles: File[]) => {
        if (newFiles.length > 0) {
            const selectedFile = newFiles[0];
            setFile(selectedFile);
            setWatermarks([]);
            setBgRenderedCount(0);

            // Load PDF to get page count
            try {
                const pdfjsLib = await getPdfJs();
                // Ensure ArrayBuffer is handled correctly
                const arrayBuffer = await selectedFile.arrayBuffer();
                const pdf = await (pdfjsLib as any).getDocument(new Uint8Array(arrayBuffer)).promise;
                setNumPages(pdf.numPages);
                pdfCanvasRefs.current = Array(pdf.numPages).fill(null);
                watermarkCanvasRefs.current = Array(pdf.numPages).fill(null);

                // Add initial watermark
                addInitialWatermark();
            } catch (error) {
                console.error("Error loading PDF", error);
                toast.show({
                    title: "Error",
                    message: "Failed to load PDF file.",
                    variant: "error",
                    position: "top-right"
                });
            }
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);

            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    setImagePreview(event.target.result as string);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const addInitialWatermark = () => {
        const id = Math.random().toString(36).substr(2, 9);
        const newWatermark: WatermarkElement = {
            id,
            type: "text",
            content: "18+ PDF",
            x: 90, y: 90,
            fontSize: 10,
            fontFamily: "Arial",
            color: "#000000",
            opacity: 0.6,
            rotation: 0,
            layer: "over",
            mosaicMode: false,
        };
        setWatermarks([newWatermark]);
    };

    // EFFECT 1: Render PDF Pages (Static Background)
    useEffect(() => {
        if (!file || numPages === 0) return;

        let isCancelled = false;
        renderTasksRef.current.forEach(task => task.cancel());
        renderTasksRef.current = [];

        const renderBackgrounds = async () => {
            const pdfjsLib = await getPdfJs();
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await (pdfjsLib as any).getDocument(new Uint8Array(arrayBuffer)).promise;

            for (let i = 1; i <= pdf.numPages; i++) {
                if (isCancelled) return;
                const canvas = pdfCanvasRefs.current[i - 1];
                if (!canvas) continue;

                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 0.5 });
                const context = canvas.getContext("2d");
                if (!context) continue;

                canvas.height = viewport.height;
                canvas.width = viewport.width;

                const renderTask = page.render({
                    canvasContext: context,
                    viewport: viewport,
                });
                renderTasksRef.current.push(renderTask);

                try {
                    await renderTask.promise;
                    if (!isCancelled) {
                        setBgRenderedCount(prev => prev + 1);
                    }
                } catch (error: any) {
                    if (error.name !== 'RenderingCancelledException') {
                        console.error("Render background error", error);
                    }
                }
            }
        };

        renderBackgrounds();
        return () => {
            isCancelled = true;
            renderTasksRef.current.forEach(task => task.cancel());
            renderTasksRef.current = [];
        };
    }, [file, numPages]);

    // EFFECT 2: Render Watermark Overlay (Dynamic Layer)
    useEffect(() => {
        if (!file || numPages === 0) return;

        const drawWatermarks = () => {
            for (let i = 0; i < numPages; i++) {
                const canvas = watermarkCanvasRefs.current[i];
                const bgCanvas = pdfCanvasRefs.current[i];
                if (!canvas || !bgCanvas) continue;

                const ctx = canvas.getContext("2d");
                if (!ctx) continue;

                // Match dimensions to background
                canvas.width = bgCanvas.width;
                canvas.height = bgCanvas.height;

                // Clear previous
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                const renderSingle = (cx: number, cy: number) => {
                    ctx.save();
                    ctx.globalAlpha = opacity;
                    ctx.translate(cx, cy);
                    ctx.rotate((rotation * Math.PI) / 180);

                    if (activeTab === "text") {
                        // The background is rendered at scale: 0.5, so we must 
                        // scale our font pixels to match the visual size of PDF points.
                        const displaySize = fontSize * 0.5;
                        let currentSize = displaySize;
                        ctx.font = `bold ${currentSize}px ${fontFamily}`;

                        // Prevent overflow: if text is wider than 90% of page, scale it down
                        const metrics = ctx.measureText(text);
                        if (metrics.width > canvas.width * 0.9) {
                            currentSize = Math.floor(displaySize * (canvas.width * 0.9 / metrics.width));
                            ctx.font = `bold ${currentSize}px ${fontFamily}`;
                        }

                        ctx.fillStyle = color;
                        ctx.textAlign = "center";
                        ctx.textBaseline = "middle";
                        ctx.fillText(text, 0, 0);
                    } else if (activeTab === "image" && imagePreview) {
                        const img = new Image();
                        img.src = imagePreview;
                        if (img.complete) {
                            drawImage(ctx, img, canvas.width);
                        } else {
                            img.onload = () => drawImage(ctx, img, canvas.width);
                        }
                    }
                    ctx.restore();
                };

                if (mosaicMode) {
                    const xStep = canvas.width / 3;
                    const yStep = canvas.height / 4;
                    for (let xi = 0; xi < 3; xi++) {
                        for (let yi = 0; yi < 4; yi++) {
                            const gx = (xi * xStep) + (xStep / 2);
                            const gy = (yi * yStep) + (yStep / 2);
                            renderSingle(gx, gy);
                        }
                    }
                } else {
                    renderSingle((canvas.width * posX) / 100, (canvas.height * posY) / 100);
                }
            }
        };

        const drawImage = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, containerWidth: number) => {
            const renderWidth = (containerWidth * imageScale) / 100;
            const aspectRatio = img.height / img.width;
            const renderHeight = renderWidth * aspectRatio;
            ctx.drawImage(img, -renderWidth / 2, -renderHeight / 2, renderWidth, renderHeight);
        };

        drawWatermarks();
    }, [numPages, text, fontSize, fontFamily, color, opacity, rotation, activeTab, posX, posY, imagePreview, imageScale, mosaicMode, bgRenderedCount]);

    // Apply watermarks to PDF (Backend)
    const applyWatermarks = async () => {
        if (!file) return;
        setIsProcessing(true);

        try {
            // Prepare image bytes if needed
            let imageBytes: ArrayBuffer | undefined = undefined;
            let imageType: "png" | "jpg" | "svg" | undefined = undefined;

            if (activeTab === "image" && imageFile) {
                imageBytes = await imageFile.arrayBuffer();
                imageType = imageFile.type.includes("png") ? "png" :
                    imageFile.type.includes("svg") ? "svg" : "jpg";
            }

            // Construct the watermark definition based on current settings
            // In this 'Simple Mode' UI, we apply one global setting as the watermark
            // effectively replacing the 'list of watermarks' with 'current settings'

            const currentWatermark: any = { // Changed type to any to allow 'text' property
                id: "main-watermark",
                type: activeTab,
                text: text, // Fixed: backend expects 'text', not 'content'
                imageBytes: imageBytes,
                imageType: imageType,
                // Pass scale as width/height proxy? For now let's pass it if interface allows or map it
                // Interface has width/height as percentages. WE map `imageScale` (10-100) to width
                width: activeTab === "image" ? imageScale : undefined,

                x: posX, y: posY,
                fontSize: activeTab === "text" ? fontSize : undefined,
                color: activeTab === "text" ? color : undefined,
                opacity, rotation,
                layer, mosaicMode,
                fontFamily: fontFamily,
                fontWeight: "bold"
            };

            const result = await pdfApi.watermark(file, {
                watermarks: [currentWatermark]
            });

            saveAs(result.blob, result.fileName || `watermarked-${file.name}`);

            toast.show({
                title: "Success",
                message: "Watermarks applied successfully!",
                variant: "success",
                position: "top-right",
            });
        } catch (error: any) {
            console.error("Error applying watermarks:", error);
            toast.show({
                title: "Watermark Failed",
                message: error.message || "Failed to apply watermarks. Please try again.",
                variant: "error",
                position: "top-right",
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const clearAll = () => {
        setFile(null);
        setWatermarks([]);
        setText("CONFIDENTIAL");
        resetSettings(); // Reset all settings when file is cleared
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
        return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    };

    if (!file) {
        return (
            <div className="min-h-[calc(100vh-120px)] flex items-center justify-center">
                <FileUploadHero
                    title="Watermark PDF"
                    onFilesSelected={handleFileSelected}
                    maxFiles={1}
                    accept={{ "application/pdf": [".pdf"] }}
                />
            </div>
        );
    }

    return (
        <div className="bg-[#f6f7f8] min-h-screen pb-8">
            <div className="max-w-[1800px] mx-auto px-4 py-4">
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Left Column - Page Grid */}
                    <div className="flex-1 lg:max-w-[calc(100%-448px)]">
                        {/* Control Bar */}
                        <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-[#e2e8f0] shadow-sm p-4 mb-6">
                            <div className="flex items-center justify-between flex-wrap gap-4">
                                <div className="flex items-center gap-2">
                                    <h2 className="text-lg font-bold text-[#111418]">{file.name}</h2>
                                    <span className="text-sm text-[#617289]">({formatFileSize(file.size)})</span>
                                </div>
                                <button
                                    onClick={clearAll}
                                    className="flex items-center gap-2 text-[#617289] hover:text-red-600 transition-colors px-3 py-2 rounded-lg hover:bg-red-50"
                                >
                                    <Trash2 className="w-5 h-5" />
                                    <span className="text-sm font-bold">Remove File</span>
                                </button>
                            </div>
                        </div>

                        {/* Grid of Pages */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {Array.from({ length: numPages }).map((_, index) => (
                                <div
                                    key={index}
                                    className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden"
                                >
                                    {/* Preview Area */}
                                    <div className="relative bg-[#f1f5f9] h-[300px] flex items-center justify-center overflow-hidden">
                                        {/* Container for both canvases to ensure perfect alignment */}
                                        <div className="relative shadow-md max-w-full max-h-full">
                                            <canvas
                                                ref={(el) => {
                                                    pdfCanvasRefs.current[index] = el;
                                                }}
                                                className={cn(
                                                    "block max-w-full max-h-[280px] object-contain relative",
                                                    layer === "under" ? "z-10 mix-blend-multiply" : "z-0"
                                                )}
                                            />
                                            <canvas
                                                ref={(el) => {
                                                    watermarkCanvasRefs.current[index] = el;
                                                }}
                                                className={cn(
                                                    "absolute inset-0 w-full h-full pointer-events-none",
                                                    layer === "under" ? "z-0" : "z-10"
                                                )}
                                            />
                                        </div>
                                        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm rounded-full px-2 py-1 text-white text-xs font-bold">
                                            Page {index + 1}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Sidebar - Configuration */}
                    <div className="lg:w-[424px] lg:fixed lg:right-4 lg:top-24">
                        <div className="bg-white rounded-3xl border border-[#e2e8f0] p-6 shadow-xl max-h-[calc(100vh-120px)] overflow-y-auto">

                            {/* Header */}
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-[#111418] font-bold text-lg leading-7">Watermark Settings</h2>
                                    <p className="text-[#617289] text-xs">Customize your stamp</p>
                                </div>
                                <button
                                    onClick={resetSettings}
                                    className="flex items-center gap-1.5 text-[#617289] text-xs font-bold hover:text-[#136dec] transition-colors"
                                >
                                    <RotateCw className="w-3.5 h-3.5" />
                                    Reset
                                </button>
                            </div>

                            {/* Tabs */}
                            <div className="bg-[#f0f2f5] p-1 rounded-xl flex gap-1 mb-6">
                                <button
                                    onClick={() => setActiveTab("text")}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all",
                                        activeTab === "text"
                                            ? "bg-white text-[#136dec] shadow-sm"
                                            : "text-[#64748b] hover:text-[#111418]"
                                    )}
                                >
                                    <Type className="w-4 h-4" />
                                    Text
                                </button>
                                <button
                                    onClick={() => setActiveTab("image")}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all",
                                        activeTab === "image"
                                            ? "bg-white text-[#136dec] shadow-sm"
                                            : "text-[#64748b] hover:text-[#111418]"
                                    )}
                                >
                                    <ImageIcon className="w-4 h-4" />
                                    Image
                                </button>
                            </div>

                            {/* Text Settings */}
                            {activeTab === "text" && (
                                <div className="space-y-6">
                                    {/* Text Content */}
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="text-xs font-bold text-[#617289] uppercase tracking-wider">Watermark Text</label>
                                            <button className="text-[#136dec] text-xs font-bold hover:underline">Insert Variable</button>
                                        </div>
                                        <input
                                            type="text"
                                            value={text}
                                            onChange={(e) => setText(e.target.value)}
                                            className="w-full h-14 rounded-xl border border-[#e2e8f0] px-4 bg-[#f8fafc] text-[#111418] font-bold text-lg focus:border-[#136dec] focus:ring-2 focus:ring-[#136dec]/20 transition-all outline-none"
                                            placeholder="CONFIDENTIAL"
                                        />
                                    </div>

                                    {/* Font & Color */}
                                    <div className="flex gap-3">
                                        <div className="flex-1 relative">
                                            <select
                                                value={fontFamily}
                                                onChange={(e) => setFontFamily(e.target.value)}
                                                className="w-full h-12 appearance-none rounded-xl border border-[#e2e8f0] pl-4 pr-8 bg-white text-[#111418] text-sm font-medium focus:border-[#136dec] outline-none"
                                            >
                                                {fontOptions.map(f => <option key={f} value={f}>{f}</option>)}
                                            </select>
                                            {/* Chevron shim */}
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#64748b]">
                                                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            </div>
                                        </div>

                                        {/* Color Picker Button */}
                                        <div className="relative group">
                                            <div className="w-12 h-12 rounded-xl border border-[#e2e8f0] bg-white flex items-center justify-center cursor-pointer hover:border-[#136dec] transition-colors">
                                                <div className="w-6 h-6 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: color }} />
                                            </div>
                                            <input
                                                type="color"
                                                value={color}
                                                onChange={(e) => setColor(e.target.value)}
                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                            />
                                        </div>

                                        {/* Size Input */}
                                        <div className="w-20 relative">
                                            <input
                                                type="number"
                                                value={fontSize}
                                                onChange={(e) => setFontSize(Number(e.target.value))}
                                                className="w-full h-12 rounded-xl border border-[#e2e8f0] pl-3 pr-8 bg-white text-[#111418] text-sm font-medium focus:border-[#136dec] outline-none text-center"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] text-xs font-medium pointer-events-none">px</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Image Settings */}
                            {activeTab === "image" && (
                                <div className="space-y-6">
                                    <div className="border-2 border-dashed border-[#e2e8f0] rounded-xl p-4 text-center hover:bg-[#f8fafc] transition-colors cursor-pointer relative">
                                        <input
                                            type="file"
                                            ref={imageInputRef}
                                            onChange={handleImageUpload}
                                            accept="image/png, image/jpeg, image/jpg"
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                        />

                                        {imagePreview ? (
                                            <div className="relative">
                                                <img
                                                    src={imagePreview}
                                                    alt="Watermark Preview"
                                                    className="max-h-32 mx-auto rounded shadow-sm object-contain"
                                                />
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setImageFile(null);
                                                        setImagePreview(null);
                                                    }}
                                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-md"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="py-4">
                                                <ImageIcon className="h-8 w-8 text-[#94a3b8] mx-auto mb-2" />
                                                <p className="text-sm font-bold text-[#111418]">Click to upload image</p>
                                                <p className="text-xs text-[#64748b]">PNG, JPG (Max 5MB)</p>
                                            </div>
                                        )}
                                    </div>

                                    {imagePreview && (
                                        <div>
                                            <div className="flex justify-between items-center mb-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-[#111418]">Size Scale</span>
                                                </div>
                                                <span className="bg-[#f0f2f5] text-[#111418] text-xs font-bold px-2 py-1 rounded">
                                                    {imageScale}%
                                                </span>
                                            </div>
                                            <input
                                                type="range"
                                                min="10"
                                                max="100"
                                                value={imageScale}
                                                onChange={(e) => setImageScale(Number(e.target.value))}
                                                className="w-full h-1.5 bg-[#e2e8f0] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#136dec]"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Placement Section */}
                            <div className="mt-8">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-[#111418] font-bold text-sm">Placement</h3>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[#617289] text-xs font-medium">Mosaic Mode</span>
                                        <button
                                            onClick={() => setMosaicMode(!mosaicMode)}
                                            className={cn(
                                                "w-10 h-6 rounded-full transition-colors relative",
                                                mosaicMode ? "bg-[#136dec]" : "bg-[#e2e8f0]"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-4 h-4 bg-white rounded-full shadow-sm absolute top-1 transition-transform",
                                                mosaicMode ? "left-5" : "left-1"
                                            )} />
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl p-4">
                                    <div className="flex gap-6">
                                        {/* 3x3 Grid */}
                                        <div className="grid grid-cols-3 gap-2 w-[100px] flex-shrink-0">
                                            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => handleGridClick(i)}
                                                    className={cn(
                                                        "aspect-square rounded border transition-all flex items-center justify-center",
                                                        selectedGrid === i
                                                            ? "bg-[#136dec] border-[#136dec] text-white"
                                                            : "bg-white border-[#e2e8f0] hover:border-[#94a3b8]"
                                                    )}
                                                >
                                                    {selectedGrid === i && <Layers className="w-3 h-3" />}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Info & Coordinates */}
                                        <div className="flex flex-col justify-between flex-1">
                                            <p className="text-[#64748b] text-xs leading-relaxed">
                                                Click a grid cell to anchor the watermark.
                                            </p>
                                            <div className="flex gap-2 mt-2">
                                                <div className="bg-white border border-[#e2e8f0] rounded-md px-2 py-1 text-[10px] font-bold text-[#111418]">
                                                    X: {posX}%
                                                </div>
                                                <div className="bg-white border border-[#e2e8f0] rounded-md px-2 py-1 text-[10px] font-bold text-[#111418]">
                                                    Y: {posY}%
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Appearance Section */}
                            <div className="mt-8">
                                <h3 className="text-[#111418] font-bold text-sm mb-4">Appearance</h3>

                                {/* Layering Cards */}
                                <div className="grid grid-cols-2 gap-3 mb-6">
                                    <button
                                        onClick={() => setLayer("over")}
                                        className={cn(
                                            "h-16 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all",
                                            layer === "over"
                                                ? "bg-[#eff6ff] border-[#136dec] text-[#136dec]"
                                                : "bg-white border-[#e2e8f0] text-[#64748b] hover:border-[#cbd5e1]"
                                        )}
                                    >
                                        <Layers className="w-5 h-5" />
                                        <span className="text-xs font-bold">Over Content</span>
                                    </button>
                                    <button
                                        onClick={() => setLayer("under")}
                                        className={cn(
                                            "h-16 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all",
                                            layer === "under"
                                                ? "bg-[#eff6ff] border-[#136dec] text-[#136dec]"
                                                : "bg-white border-[#e2e8f0] text-[#64748b] hover:border-[#cbd5e1]"
                                        )}
                                    >
                                        <Layers className="w-5 h-5 opacity-50" />
                                        <span className="text-xs font-bold">Behind Content</span>
                                    </button>
                                </div>

                                {/* Sliders */}
                                <div className="space-y-6">
                                    {/* Transparency */}
                                    <div>
                                        <div className="flex justify-between items-center mb-3">
                                            <div className="flex items-center gap-2">
                                                <Palette className="w-4 h-4 text-[#64748b]" />
                                                <span className="text-sm font-bold text-[#111418]">Transparency</span>
                                            </div>
                                            <span className="bg-[#f0f2f5] text-[#111418] text-xs font-bold px-2 py-1 rounded">
                                                {Math.round(opacity * 100)}%
                                            </span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.01"
                                            value={opacity}
                                            onChange={(e) => setOpacity(Number(e.target.value))}
                                            className="w-full h-1.5 bg-[#e2e8f0] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#136dec]"
                                        />
                                    </div>

                                    {/* Rotation */}
                                    <div>
                                        <div className="flex justify-between items-center mb-3">
                                            <div className="flex items-center gap-2">
                                                <RotateCw className="w-4 h-4 text-[#64748b]" />
                                                <span className="text-sm font-bold text-[#111418]">Rotation</span>
                                            </div>
                                            <span className="bg-[#f0f2f5] text-[#111418] text-xs font-bold px-2 py-1 rounded">
                                                {rotation}°
                                            </span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="360"
                                            step="1"
                                            value={rotation}
                                            onChange={(e) => setRotation(Number(e.target.value))}
                                            className="w-full h-1.5 bg-[#e2e8f0] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#136dec]"
                                        />
                                        <div className="flex justify-end gap-3 mt-2">
                                            {[90, 180, 360].map(deg => (
                                                <button
                                                    key={deg}
                                                    onClick={() => setRotation(deg)}
                                                    className="text-[10px] font-bold text-[#94a3b8] hover:text-[#136dec]"
                                                >
                                                    {deg}°
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="h-px bg-[#e2e8f0] my-8" />

                            {/* Action Button */}
                            <button
                                onClick={applyWatermarks}
                                disabled={isProcessing}
                                className="w-full bg-[#136dec] hover:bg-blue-700 text-white rounded-xl h-[56px] flex items-center justify-center gap-3 font-bold text-base shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-[0.99]"
                            >
                                <span>Stamp Document</span>
                                {isProcessing ? (
                                    <RotateCw className="w-5 h-5 animate-spin" />
                                ) : (
                                    <div className="w-5 h-5 flex items-center justify-center">🚀</div>
                                )}
                            </button>

                            <p className="text-center text-[#94a3b8] text-[10px] mt-3">
                                Making it official! Only selected pages will be affected.
                            </p>

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}