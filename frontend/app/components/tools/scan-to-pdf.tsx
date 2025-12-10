"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "../ui/button";
import { Camera, ArrowRight, Trash2, Image as ImageIcon, Settings, X, Check, Upload } from "lucide-react";
import { PDFDocument } from "pdf-lib";
import { saveAs } from "file-saver";
import { cn } from "../../lib/utils";

export function ScanToPdfTool() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const [capturedImages, setCapturedImages] = useState<string[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [filter, setFilter] = useState<"original" | "grayscale" | "bw">("original");

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

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files) return;

        Array.from(files).forEach((file) => {
            if (file.type.startsWith("image/")) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const imageData = e.target?.result as string;
                    
                    // Apply filter if needed
                    if (filter !== "original") {
                        const img = new Image();
                        img.onload = () => {
                            const canvas = document.createElement("canvas");
                            canvas.width = img.width;
                            canvas.height = img.height;
                            const context = canvas.getContext("2d");
                            if (context) {
                                context.drawImage(img, 0, 0);
                                applyFilter(context, canvas.width, canvas.height);
                                setCapturedImages(prev => [...prev, canvas.toDataURL("image/jpeg", 0.8)]);
                            }
                        };
                        img.src = imageData;
                    } else {
                        setCapturedImages(prev => [...prev, imageData]);
                    }
                };
                reader.readAsDataURL(file);
            }
        });

        // Reset input
        if (event.target) {
            event.target.value = "";
        }
    };

    const createPdf = async () => {
        if (capturedImages.length === 0) return;
        setIsProcessing(true);

        try {
            const pdfDoc = await PDFDocument.create();
            
            for (let i = 0; i < capturedImages.length; i++) {
                const imageData = capturedImages[i];
                console.log(`Processing image ${i + 1}/${capturedImages.length}`, imageData.substring(0, 50));
                
                try {
                    let embeddedImage;
                    
                    // Convert to canvas first to ensure consistent format
                    const img = new Image();
                    await new Promise((resolve, reject) => {
                        img.onload = resolve;
                        img.onerror = reject;
                        img.src = imageData;
                    });
                    
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    
                    if (!ctx) {
                        throw new Error('Failed to get canvas context');
                    }
                    
                    ctx.drawImage(img, 0, 0);
                    
                    // Always convert to JPEG for consistency
                    const jpegData = canvas.toDataURL('image/jpeg', 0.92);
                    embeddedImage = await pdfDoc.embedJpg(jpegData);
                    
                    if (embeddedImage) {
                        const page = pdfDoc.addPage([embeddedImage.width, embeddedImage.height]);
                        page.drawImage(embeddedImage, {
                            x: 0,
                            y: 0,
                            width: embeddedImage.width,
                            height: embeddedImage.height,
                        });
                        console.log(`Successfully added page ${i + 1}`);
                    }
                } catch (imageError) {
                    console.error(`Failed to process image ${i + 1}:`, imageError);
                    alert(`Failed to process image ${i + 1}. Skipping...`);
                }
            }

            if (pdfDoc.getPageCount() === 0) {
                throw new Error('No pages were successfully added to the PDF');
            }

            console.log('Saving PDF with', pdfDoc.getPageCount(), 'pages');
            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
            saveAs(blob, "scanned-document.pdf");
            console.log('PDF saved successfully');
        } catch (error: any) {
            console.error("Error creating PDF:", error);
            alert(`Failed to create PDF: ${error.message || 'Unknown error'}. Please try again.`);
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
                        <div className="flex flex-col sm:flex-row gap-3 z-10">
                            <Button onClick={startCamera} size="lg" className="gap-2">
                                <Camera className="h-5 w-5" />
                                Start Camera
                            </Button>
                            <Button 
                                onClick={() => fileInputRef.current?.click()} 
                                size="lg" 
                                variant="secondary"
                                className="gap-2"
                            >
                                <Upload className="h-5 w-5" />
                                Upload Images
                            </Button>
                        </div>
                        <p className="text-sm text-gray-400">Scan with camera or upload existing images</p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleFileUpload}
                            className="hidden"
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
                        <div className="flex gap-2">
                            <Button 
                                onClick={() => fileInputRef.current?.click()} 
                                variant="outline" 
                                size="sm"
                                className="gap-2"
                            >
                                <Upload className="h-4 w-4" />
                                Add More
                            </Button>
                            <Button onClick={() => setCapturedImages([])} variant="ghost" size="sm" className="text-destructive">
                                Clear All
                            </Button>
                        </div>
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
