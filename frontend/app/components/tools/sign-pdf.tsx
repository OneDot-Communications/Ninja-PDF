"use client";

import { useState, useRef } from "react";
import { saveAs } from "file-saver";
import { FileUpload } from "../ui/file-upload";
import { Button } from "../ui/button";
import { PenTool, Trash2, Type, Image as ImageIcon } from "lucide-react";
import { PdfPreview } from "../ui/pdf-preview";
import { pdfStrategyManager } from "../../lib/pdf-service";
import { pdfApi } from "../../lib/pdf-api";
import { toast } from "../../lib/use-toast";

export function SignPdfTool() {
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [signatureImage, setSignatureImage] = useState<string | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    // Signature Mode
    const [signMode, setSignMode] = useState<"draw" | "type" | "upload">("draw");
    const [typedText, setTypedText] = useState("");
    const [drawColor, setDrawColor] = useState("#000000");

    // Configuration Options
    const [position, setPosition] = useState<"bottom-right" | "bottom-left" | "top-right" | "top-left" | "center">("bottom-right");
    const [pageOption, setPageOption] = useState<"first" | "last" | "all">("first");
    const [scale, setScale] = useState<"small" | "medium" | "large">("medium");

    const handleFileSelected = (files: File[]) => {
        if (files.length > 0) {
            setFile(files[0]);
        }
    };

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        setIsDrawing(true);
        const { offsetX, offsetY } = getCoordinates(e, canvas);
        ctx.strokeStyle = drawColor;
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(offsetX, offsetY);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const { offsetX, offsetY } = getCoordinates(e, canvas);
        ctx.lineTo(offsetX, offsetY);
        ctx.stroke();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const getCoordinates = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
        if ("touches" in e) {
            const rect = canvas.getBoundingClientRect();
            return {
                offsetX: e.touches[0].clientX - rect.left,
                offsetY: e.touches[0].clientY - rect.top,
            };
        } else {
            return {
                offsetX: (e as React.MouseEvent).nativeEvent.offsetX,
                offsetY: (e as React.MouseEvent).nativeEvent.offsetY,
            };
        }
    };

    const clearSignature = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext("2d");
            if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        setSignatureImage(null);
        setTypedText("");
    };

    const saveSignature = () => {
        if (signMode === "draw") {
            const canvas = canvasRef.current;
            if (!canvas) return;
            setSignatureImage(canvas.toDataURL("image/png"));
        } else if (signMode === "type") {
            if (!typedText) return;
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            if (!ctx) return;

            ctx.font = "48px 'Dancing Script', cursive, sans-serif";
            const metrics = ctx.measureText(typedText);
            canvas.width = metrics.width + 20;
            canvas.height = 80;

            // Reset after resize
            ctx.font = "48px 'Dancing Script', cursive, sans-serif";
            ctx.fillStyle = drawColor;
            ctx.fillText(typedText, 10, 50);
            setSignatureImage(canvas.toDataURL("image/png"));
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    setSignatureImage(event.target.result as string);
                }
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const signPdf = async () => {
        if (!file || !signatureImage) return;
        setIsProcessing(true);

        try {
            const result = await pdfApi.sign(file, {
                type: 'visual',
                signatureImage,
                position,
                pageOption,
                scale
            });

            saveAs(result.blob, result.fileName || `signed-${file.name}`);

            toast.show({
                title: "Success",
                message: "PDF signed successfully!",
                variant: "success",
                position: "top-right",
            });
        } catch (error) {
            console.error("Error signing PDF:", error);
            toast.show({
                title: "Operation Failed",
                message: "Failed to sign PDF. Please try again.",
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
                    description="Drop a PDF file here to sign it"
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
                    <div className="space-y-4">
                        <div className="flex gap-2 rounded-lg bg-muted p-1">
                            <button
                                onClick={() => { setSignMode("draw"); setSignatureImage(null); }}
                                className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${signMode === "draw" ? "bg-background shadow-sm" : "hover:bg-background/50"}`}
                            >
                                <PenTool className="mx-auto mb-1 h-4 w-4" /> Draw
                            </button>
                            <button
                                onClick={() => { setSignMode("type"); setSignatureImage(null); }}
                                className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${signMode === "type" ? "bg-background shadow-sm" : "hover:bg-background/50"}`}
                            >
                                <Type className="mx-auto mb-1 h-4 w-4" /> Type
                            </button>
                            <button
                                onClick={() => { setSignMode("upload"); setSignatureImage(null); }}
                                className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${signMode === "upload" ? "bg-background shadow-sm" : "hover:bg-background/50"}`}
                            >
                                <ImageIcon className="mx-auto mb-1 h-4 w-4" /> Upload
                            </button>
                        </div>

                        <div className="rounded-xl border bg-white p-4 shadow-sm min-h-[200px] flex flex-col justify-center">
                            {signMode === "draw" && (
                                <>
                                    <canvas
                                        ref={canvasRef}
                                        width={400}
                                        height={200}
                                        className="w-full cursor-crosshair border-b border-dashed bg-white"
                                        onMouseDown={startDrawing}
                                        onMouseMove={draw}
                                        onMouseUp={stopDrawing}
                                        onMouseLeave={stopDrawing}
                                        onTouchStart={startDrawing}
                                        onTouchMove={draw}
                                        onTouchEnd={stopDrawing}
                                    />
                                    <div className="mt-4 flex items-center justify-between">
                                        <div className="flex gap-2">
                                            {["#000000", "#0000FF", "#FF0000"].map(c => (
                                                <button
                                                    key={c}
                                                    onClick={() => setDrawColor(c)}
                                                    className={`h-6 w-6 rounded-full border ${drawColor === c ? "ring-2 ring-primary ring-offset-2" : ""}`}
                                                    style={{ backgroundColor: c }}
                                                />
                                            ))}
                                        </div>
                                        <div className="flex gap-2">
                                            <Button variant="ghost" size="sm" onClick={clearSignature}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                            <Button variant="secondary" size="sm" onClick={saveSignature}>
                                                Use This
                                            </Button>
                                        </div>
                                    </div>
                                </>
                            )}

                            {signMode === "type" && (
                                <div className="space-y-4">
                                    <input
                                        type="text"
                                        value={typedText}
                                        onChange={(e) => setTypedText(e.target.value)}
                                        placeholder="Type your name"
                                        className="w-full rounded-md border border-input px-3 py-2 text-lg"
                                    />
                                    <div className="text-center text-4xl py-4" style={{ fontFamily: "'Dancing Script', cursive", color: drawColor }}>
                                        {typedText || "Your Signature"}
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex gap-2">
                                            {["#000000", "#0000FF", "#FF0000"].map(c => (
                                                <button
                                                    key={c}
                                                    onClick={() => setDrawColor(c)}
                                                    className={`h-6 w-6 rounded-full border ${drawColor === c ? "ring-2 ring-primary ring-offset-2" : ""}`}
                                                    style={{ backgroundColor: c }}
                                                />
                                            ))}
                                        </div>
                                        <Button variant="secondary" size="sm" onClick={saveSignature} disabled={!typedText}>
                                            Use This
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {signMode === "upload" && (
                                <div className="flex flex-col items-center gap-4">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        className="text-sm"
                                    />
                                    {signatureImage && (
                                        <img src={signatureImage} alt="Preview" className="max-h-32 object-contain" />
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {signatureImage && (
                        <div className="space-y-4 rounded-xl border bg-card p-6">
                            <h3 className="font-semibold">Placement Options</h3>

                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground">Position</label>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        {["top-left", "top-right", "center", "bottom-left", "bottom-right"].map((pos) => (
                                            <Button
                                                key={pos}
                                                variant={position === pos ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => setPosition(pos as any)}
                                                className="capitalize"
                                            >
                                                {pos.replace("-", " ")}
                                            </Button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-muted-foreground">Pages</label>
                                    <div className="flex gap-2 mt-1">
                                        {["first", "last", "all"].map((opt) => (
                                            <Button
                                                key={opt}
                                                variant={pageOption === opt ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => setPageOption(opt as any)}
                                                className="capitalize"
                                            >
                                                {opt} Page{opt === "all" ? "s" : ""}
                                            </Button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-muted-foreground">Size</label>
                                    <div className="flex gap-2 mt-1">
                                        {["small", "medium", "large"].map((s) => (
                                            <Button
                                                key={s}
                                                variant={scale === s ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => setScale(s as any)}
                                                className="capitalize"
                                            >
                                                {s}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <Button
                                size="lg"
                                onClick={signPdf}
                                disabled={isProcessing}
                                className="w-full mt-4"
                            >
                                {isProcessing ? "Processing..." : "Sign PDF"}
                            </Button>
                        </div>
                    )}
                </div>

                <div className="relative overflow-hidden rounded-xl border bg-muted/20 p-4 min-h-[400px]">
                    <div className="relative h-full">
                        <PdfPreview file={file} />
                        {signatureImage && (
                            <div
                                className={`absolute p-2 border-2 border-dashed border-primary bg-white/50 transition-all duration-300
                                    ${position === "top-left" ? "top-4 left-4" : ""}
                                    ${position === "top-right" ? "top-4 right-4" : ""}
                                    ${position === "bottom-left" ? "bottom-4 left-4" : ""}
                                    ${position === "bottom-right" ? "bottom-4 right-4" : ""}
                                    ${position === "center" ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" : ""}
                                `}
                            >
                                <img
                                    src={signatureImage}
                                    alt="Signature Preview"
                                    className={`object-contain transition-all duration-300
                                        ${scale === "small" ? "h-8" : ""}
                                        ${scale === "medium" ? "h-16" : ""}
                                        ${scale === "large" ? "h-24" : ""}
                                    `}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
