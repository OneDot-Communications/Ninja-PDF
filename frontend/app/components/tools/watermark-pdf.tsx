"use client";

import { useState } from "react";
import { saveAs } from "file-saver";
import { FileUpload } from "../ui/file-upload";
import { Button } from "../ui/button";
import { Type, Sliders, Image as ImageIcon, Grid } from "lucide-react";
import { PdfPreview } from "../ui/pdf-preview";
import { pdfStrategyManager } from "../../lib/pdf-service";
import { toast } from "../../lib/use-toast";

export function WatermarkPdfTool() {
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    
    // Watermark Type
    const [type, setType] = useState<"text" | "image">("text");
    const [text, setText] = useState("CONFIDENTIAL");
    const [image, setImage] = useState<string | null>(null);

    // Options
    const [color, setColor] = useState<"red" | "blue" | "black" | "gray">("red");
    const [opacity, setOpacity] = useState(0.3);
    const [rotation, setRotation] = useState(45);
    const [fontSize, setFontSize] = useState(50);
    const [position, setPosition] = useState<"center" | "top" | "bottom" | "tiled">("center");

    const handleFileSelected = (files: File[]) => {
        if (files.length > 0) {
            setFile(files[0]);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    setImage(event.target.result as string);
                }
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const addWatermark = async () => {
        if (!file) return;
        if (type === "text" && !text) return;
        if (type === "image" && !image) return;

        setIsProcessing(true);

        try {
            const result = await pdfStrategyManager.execute('watermark', [file], {
                type,
                text,
                image,
                color,
                opacity,
                rotation,
                fontSize,
                position
            });

            saveAs(result.blob, result.fileName || `watermarked-${file.name}`);
            
            toast.show({
                title: "Success",
                message: "Watermark added successfully!",
                variant: "success",
                position: "top-right",
            });
        } catch (error) {
            console.error("Error adding watermark:", error);
            toast.show({
                title: "Watermark Failed",
                message: "Failed to add watermark. Please try again.",
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
                    description="Drop a PDF file here to add a watermark"
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
                <div className="space-y-6">
                    <div className="space-y-4 rounded-xl border bg-card p-6">
                        <h3 className="font-semibold flex items-center gap-2">
                            <Sliders className="h-5 w-5" /> Configuration
                        </h3>
                        
                        <div className="flex gap-2 rounded-lg bg-muted p-1">
                            <button
                                onClick={() => {
                                    setType("text");
                                    if (!text) setText("CONFIDENTIAL");
                                }}
                                className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${type === "text" ? "bg-background shadow-sm" : "hover:bg-background/50"}`}
                            >
                                <Type className="mx-auto mb-1 h-4 w-4" /> Text
                            </button>
                            <button
                                onClick={() => setType("image")}
                                className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${type === "image" ? "bg-background shadow-sm" : "hover:bg-background/50"}`}
                            >
                                <ImageIcon className="mx-auto mb-1 h-4 w-4" /> Image
                            </button>
                        </div>

                        {type === "text" ? (
                            <div>
                                <label className="mb-2 block text-xs font-medium text-muted-foreground">Watermark Text</label>
                                <input
                                    type="text"
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    placeholder="Enter watermark text"
                                />
                            </div>
                        ) : (
                            <div>
                                <label className="mb-2 block text-xs font-medium text-muted-foreground">Upload Image</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="w-full text-sm"
                                />
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            {type === "text" && (
                                <div>
                                    <label className="mb-2 block text-xs font-medium text-muted-foreground">Color</label>
                                    <div className="flex gap-2">
                                        {["red", "blue", "black", "gray"].map((c) => (
                                            <button
                                                key={c}
                                                onClick={() => setColor(c as any)}
                                                className={`h-8 w-8 rounded-full border-2 ${color === c ? "border-primary ring-2 ring-primary ring-offset-2" : "border-transparent"}`}
                                                style={{ backgroundColor: c === "gray" ? "#888" : c }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className={type === "image" ? "col-span-2" : ""}>
                                <label className="mb-2 block text-xs font-medium text-muted-foreground">Opacity: {Math.round(opacity * 100)}%</label>
                                <input
                                    type="range"
                                    min="0.1"
                                    max="1"
                                    step="0.1"
                                    value={opacity}
                                    onChange={(e) => setOpacity(parseFloat(e.target.value))}
                                    className="w-full"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="mb-2 block text-xs font-medium text-muted-foreground">Rotation: {rotation}°</label>
                                <input
                                    type="range"
                                    min="-90"
                                    max="90"
                                    step="45"
                                    value={rotation}
                                    onChange={(e) => setRotation(parseInt(e.target.value))}
                                    className="w-full"
                                />
                            </div>
                            <div>
                                <label className="mb-2 block text-xs font-medium text-muted-foreground">Size: {fontSize}</label>
                                <input
                                    type="range"
                                    min="20"
                                    max="200"
                                    step="10"
                                    value={fontSize}
                                    onChange={(e) => setFontSize(parseInt(e.target.value))}
                                    className="w-full"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="mb-2 block text-xs font-medium text-muted-foreground">Position</label>
                            <div className="flex gap-2">
                                {["top", "center", "bottom", "tiled"].map((p) => (
                                    <Button
                                        key={p}
                                        variant={position === p ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setPosition(p as any)}
                                        className="capitalize flex-1"
                                    >
                                        {p === "tiled" ? <Grid className="h-4 w-4" /> : p}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <Button
                        size="lg"
                        onClick={addWatermark}
                        disabled={isProcessing || (type === "text" && !text) || (type === "image" && !image)}
                        className="w-full"
                    >
                        {isProcessing ? "Processing..." : "Add Watermark"}
                    </Button>
                </div>

                <div className="relative overflow-hidden rounded-xl border bg-muted/20 p-4 min-h-[400px]">
                    <div className="relative h-full">
                        <PdfPreview file={file} />
                        <div className="absolute inset-0 pointer-events-none overflow-hidden">
                            {position === "tiled" ? (
                                <div className="grid grid-cols-3 grid-rows-4 h-full w-full opacity-50">
                                    {Array.from({ length: 12 }).map((_, i) => (
                                        <div key={i} className="flex items-center justify-center">
                                            {type === "text" ? (
                                                <div 
                                                    className="font-bold whitespace-nowrap select-none"
                                                    style={{
                                                        color: color,
                                                        opacity: opacity,
                                                        transform: `rotate(${rotation}deg)`,
                                                        fontSize: `${fontSize * 0.4}px`
                                                    }}
                                                >
                                                    {text}
                                                </div>
                                            ) : image && (
                                                <img 
                                                    src={image} 
                                                    style={{
                                                        opacity: opacity,
                                                        transform: `rotate(${rotation}deg)`,
                                                        width: `${fontSize}px`
                                                    }}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div 
                                        className="font-bold whitespace-nowrap select-none transition-all duration-300"
                                        style={{
                                            color: type === "text" ? color : undefined,
                                            opacity: opacity,
                                            transform: `rotate(${rotation}deg) ${position === 'top' ? 'translateY(-150px)' : position === 'bottom' ? 'translateY(150px)' : ''}`,
                                            fontSize: type === "text" ? `${fontSize * 0.6}px` : undefined
                                        }}
                                    >
                                        {type === "text" ? text : image && (
                                            <img 
                                                src={image} 
                                                style={{
                                                    width: `${fontSize * 2}px`
                                                }}
                                            />
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
