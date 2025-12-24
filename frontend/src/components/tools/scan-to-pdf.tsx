"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "../ui/button";
import { Camera, ArrowRight, Trash2, Image as ImageIcon, Settings, X, Check } from "lucide-react";
import { PDFDocument } from "pdf-lib";
import { saveAs } from "file-saver";
import { cn } from "@/lib/utils";

export function ScanToPdfTool() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const [capturedImages, setCapturedImages] = useState<string[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [filter, setFilter] = useState<"original" | "grayscale" | "bw">("original");

    // Handle file upload
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        Array.from(files).forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    if (event.target?.result) {
                        setCapturedImages(prev => [...prev, event.target!.result as string]);
                    }
                };
                reader.readAsDataURL(file);
            }
        });

        // Reset input so same file can be selected again
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" } // Prefer back camera on mobile
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setIsStreaming(true);
            }
        } catch (err) {
            console.error("Error accessing camera:", err);
            alert("Could not access camera. Please ensure you have granted permission.");
        }
    };

    const applyFilter = (context: CanvasRenderingContext2D, width: number, height: number) => {
        if (filter === "original") return;

        const imageData = context.getImageData(0, 0, width, height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // Grayscale
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;

            if (filter === "grayscale") {
                data[i] = gray;
                data[i + 1] = gray;
                data[i + 2] = gray;
            } else if (filter === "bw") {
                // Simple threshold
                const val = gray > 128 ? 255 : 0;
                data[i] = val;
                data[i + 1] = val;
                data[i + 2] = val;
            }
        }

        context.putImageData(imageData, 0, 0);
    };

    const captureImage = () => {
        if (videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext("2d");
            if (context) {
                canvasRef.current.width = videoRef.current.videoWidth;
                canvasRef.current.height = videoRef.current.videoHeight;
                context.drawImage(videoRef.current, 0, 0);

                applyFilter(context, canvasRef.current.width, canvasRef.current.height);

                const imageData = canvasRef.current.toDataURL("image/jpeg", 0.8);
                setCapturedImages((prev) => [...prev, imageData]);
            }
        }
    };

    const removeImage = (index: number) => {
        setCapturedImages(prev => prev.filter((_, i) => i !== index));
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach((track) => track.stop());
            setIsStreaming(false);
        }
    };

    const createPdf = async () => {
        if (capturedImages.length === 0) return;
        setIsProcessing(true);

        try {
            const pdfDoc = await PDFDocument.create();

            for (const imageData of capturedImages) {
                const jpgImage = await pdfDoc.embedJpg(imageData);
                // A4 size logic or fit to image? Let's fit to image for scans usually
                const page = pdfDoc.addPage([jpgImage.width, jpgImage.height]);
                page.drawImage(jpgImage, {
                    x: 0,
                    y: 0,
                    width: jpgImage.width,
                    height: jpgImage.height,
                });
            }

            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
            saveAs(blob, "scanned-document.pdf");
        } catch (error) {
            console.error("Error creating PDF:", error);
            alert("Failed to create PDF.");
        } finally {
            setIsProcessing(false);
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, []);

    return (
        <div className="space-y-8">
            <div className="relative mx-auto aspect-video max-w-2xl overflow-hidden rounded-xl bg-black shadow-xl">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className={`h-full w-full object-cover ${!isStreaming ? "hidden" : ""}`}
                    style={{ filter: filter === 'grayscale' ? 'grayscale(100%)' : filter === 'bw' ? 'grayscale(100%) contrast(150%)' : 'none' }}
                />
                {!isStreaming && (
                    <div className="flex h-full flex-col items-center justify-center gap-4 text-white">
                        <Camera className="h-16 w-16 opacity-50" />
                        <div className="flex gap-3 z-10">
                            <Button onClick={startCamera} size="lg">
                                <Camera className="h-4 w-4 mr-2" /> Start Camera
                            </Button>
                            <Button
                                onClick={() => fileInputRef.current?.click()}
                                size="lg"
                                variant="outline"
                                className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                            >
                                <ImageIcon className="h-4 w-4 mr-2" /> Upload Images
                            </Button>
                        </div>
                        <p className="text-sm text-gray-400">Use camera to scan or upload existing images</p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={handleFileUpload}
                        />
                    </div>
                )}
                <canvas ref={canvasRef} className="hidden" />

                {isStreaming && (
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                        <Button onClick={captureImage} size="lg" className="rounded-full h-16 w-16 p-0 border-4 border-white/20 bg-white text-black hover:bg-white/90 hover:scale-105 transition-all">
                            <div className="h-12 w-12 rounded-full border-2 border-black" />
                        </Button>
                    </div>
                )}

                {isStreaming && (
                    <div className="absolute top-4 right-4">
                        <Button onClick={stopCamera} variant="destructive" size="sm">
                            Stop
                        </Button>
                    </div>
                )}
            </div>

            {isStreaming && (
                <div className="flex justify-center gap-2">
                    {[
                        { id: "original", label: "Original" },
                        { id: "grayscale", label: "Grayscale" },
                        { id: "bw", label: "Black & White" },
                    ].map((f) => (
                        <Button
                            key={f.id}
                            variant={filter === f.id ? "default" : "outline"}
                            size="sm"
                            onClick={() => setFilter(f.id as any)}
                            className="min-w-[100px]"
                        >
                            {f.label}
                        </Button>
                    ))}
                </div>
            )}

            {capturedImages.length > 0 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">Captured Pages ({capturedImages.length})</h3>
                        <Button onClick={() => setCapturedImages([])} variant="ghost" size="sm" className="text-destructive">
                            Clear All
                        </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                        {capturedImages.map((img, idx) => (
                            <div key={idx} className="group relative aspect-3/4 overflow-hidden rounded-lg border bg-muted shadow-sm">
                                <img src={img} alt={`Page ${idx + 1}`} className="h-full w-full object-cover" />
                                <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20" />
                                <div className="absolute bottom-0 w-full bg-black/60 py-1 text-center text-xs text-white">
                                    Page {idx + 1}
                                </div>
                                <button
                                    onClick={() => removeImage(idx)}
                                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-destructive text-white rounded-full p-1.5 shadow-sm hover:scale-110"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-center pt-4">
                        <Button onClick={createPdf} disabled={isProcessing} size="lg" className="h-14 min-w-[200px] text-lg">
                            {isProcessing ? "Creating PDF..." : "Save as PDF"} <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
