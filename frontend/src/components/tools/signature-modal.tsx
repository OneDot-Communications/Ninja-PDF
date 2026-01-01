"use client";

import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "../ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { Button } from "../ui/button";
import { User, Users, Check, X, Trash2, Image as ImageIcon, Type } from "lucide-react";
import { cn } from "@/lib/utils";

interface SignatureModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (signatureImage: string | null) => void;
}

export function SignatureModal({ isOpen, onClose, onSave }: SignatureModalProps) {
    const [mainTab, setMainTab] = useState<"me" | "others">("me");
    const [subTab, setSubTab] = useState<"type" | "draw" | "upload">("draw");
    const [drawColor, setDrawColor] = useState<"black" | "blue">("black");
    const [addInitials, setAddInitials] = useState(false);

    // Canvas State
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasDrawn, setHasDrawn] = useState(false);

    // Type State
    const [typedText, setTypedText] = useState("");

    // Upload State
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);

    // Reset state when opening
    useEffect(() => {
        if (isOpen) {
            setHasDrawn(false);
            setTypedText("");
            setUploadedImage(null);
            // Clear canvas if it exists
            const canvas = canvasRef.current;
            if (canvas) {
                const ctx = canvas.getContext("2d");
                if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }
    }, [isOpen]);

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        setIsDrawing(true);
        const { offsetX, offsetY } = getCoordinates(e, canvas);
        ctx.strokeStyle = drawColor === "blue" ? "#0000FF" : "#000000";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(offsetX, offsetY);
        setHasDrawn(true);
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

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext("2d");
            if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        setHasDrawn(false);
    };

    const handleCreateSignature = () => {
        if (subTab === "draw" && hasDrawn) {
            const canvas = canvasRef.current;
            if (canvas) {
                onSave(canvas.toDataURL("image/png"));
            }
        } else if (subTab === "type" && typedText) {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            if (!ctx) return;

            ctx.font = "48px 'Dancing Script', cursive, sans-serif";
            const metrics = ctx.measureText(typedText);
            canvas.width = metrics.width + 40;
            canvas.height = 100;

            // Reset after resize
            ctx.font = "48px 'Dancing Script', cursive, sans-serif";
            ctx.fillStyle = drawColor === "blue" ? "#0000FF" : "#000000";
            ctx.fillText(typedText, 20, 60);
            onSave(canvas.toDataURL("image/png"));
        } else if (subTab === "upload" && uploadedImage) {
            onSave(uploadedImage);
        } else {
            onSave(null);
        }
        onClose();
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    setUploadedImage(event.target.result as string);
                }
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden rounded-xl">
                <DialogHeader className="p-6 pb-2">
                    <div className="flex justify-between items-center">
                        <DialogTitle className="text-2xl font-bold">Make your mark.</DialogTitle>
                        {/* Native Close is used, customized or default */}
                    </div>
                    <p className="text-sm text-gray-500">Create your signature to finalize the document.</p>
                </DialogHeader>

                <div className="px-6">
                    {/* Main Tabs (Me / Others) */}
                    <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
                        <button
                            onClick={() => setMainTab("me")}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all",
                                mainTab === "me" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                            )}
                        >
                            <User className="w-4 h-4" />
                            Me (Only signer)
                        </button>
                        <button
                            onClick={() => setMainTab("others")}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all",
                                mainTab === "others" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                            )}
                        >
                            <Users className="w-4 h-4" />
                            Others (Request)
                        </button>
                    </div>

                    {mainTab === "me" ? (
                        <>
                            {/* Sub Tabs */}
                            <div className="flex border-b border-gray-200 mb-6">
                                <button
                                    onClick={() => setSubTab("type")}
                                    className={cn(
                                        "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                                        subTab === "type" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
                                    )}
                                >
                                    Type
                                </button>
                                <button
                                    onClick={() => setSubTab("draw")}
                                    className={cn(
                                        "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                                        subTab === "draw" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
                                    )}
                                >
                                    Draw
                                </button>
                                <button
                                    onClick={() => setSubTab("upload")}
                                    className={cn(
                                        "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                                        subTab === "upload" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
                                    )}
                                >
                                    Upload
                                </button>
                            </div>

                            {/* Content Area */}
                            <div className="mb-6 relative h-[300px] border border-gray-200 rounded-xl bg-gray-50/50 flex items-center justify-center overflow-hidden">
                                {subTab === "draw" && (
                                    <>
                                        <canvas
                                            ref={canvasRef}
                                            width={600}
                                            height={300}
                                            className="w-full h-full cursor-crosshair touch-none"
                                            onMouseDown={startDrawing}
                                            onMouseMove={draw}
                                            onMouseUp={stopDrawing}
                                            onMouseLeave={stopDrawing}
                                            onTouchStart={startDrawing}
                                            onTouchMove={draw}
                                            onTouchEnd={stopDrawing}
                                        />
                                        {!hasDrawn && (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-40">
                                                <svg className="w-24 h-24 text-gray-400 mb-2" viewBox="0 0 100 50">
                                                    <path d="M10,25 Q30,5 50,25 T90,25" fill="none" stroke="currentColor" strokeWidth="4" />
                                                </svg>
                                                <span className="text-gray-500 font-medium">Draw your signature here</span>
                                            </div>
                                        )}
                                        {hasDrawn && (
                                            <button
                                                onClick={clearCanvas}
                                                className="absolute top-4 right-4 flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 bg-white/80 px-2 py-1 rounded shadow-sm"
                                            >
                                                <Trash2 className="w-3 h-3" /> Clear
                                            </button>
                                        )}
                                    </>
                                )}

                                {subTab === "type" && (
                                    <div className="w-full h-full p-8 flex flex-col justify-center items-center">
                                        <input
                                            type="text"
                                            value={typedText}
                                            onChange={(e) => setTypedText(e.target.value)}
                                            placeholder="Type your name"
                                            className="w-full text-center text-4xl bg-transparent border-b-2 border-gray-300 focus:border-blue-600 outline-none pb-2 mb-4"
                                            style={{ fontFamily: "'Dancing Script', cursive", color: drawColor === "blue" ? "#0000FF" : "#000000" }}
                                        />
                                    </div>
                                )}

                                {subTab === "upload" && (
                                    <div className="w-full h-full flex flex-col items-center justify-center">
                                        {!uploadedImage ? (
                                            <label className="flex flex-col items-center justify-center cursor-pointer p-8">
                                                <ImageIcon className="w-12 h-12 text-gray-400 mb-4" />
                                                <span className="text-blue-600 font-medium">Click to upload signature image</span>
                                                <span className="text-sm text-gray-500 mt-1">PNG, JPG up to 5MB</span>
                                                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                            </label>
                                        ) : (
                                            <div className="relative w-full h-full flex items-center justify-center p-4">
                                                <img src={uploadedImage} alt="Uploaded Signature" className="max-w-full max-h-full object-contain" />
                                                <button
                                                    onClick={() => setUploadedImage(null)}
                                                    className="absolute top-4 right-4 bg-white rounded-full p-2 shadow-md hover:bg-gray-50"
                                                >
                                                    <X className="w-4 h-4 text-red-500" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <p className="text-center text-xs text-gray-400 mb-6 italic">
                                &quot;Don&apos;t worry, your mouse-drawing skills are better than you think.&quot;
                            </p>

                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-medium text-gray-700">Ink Color</span>
                                    <button
                                        onClick={() => setDrawColor("black")}
                                        className={cn(
                                            "w-6 h-6 rounded-full bg-black border-2 transition-all",
                                            drawColor === "black" ? "ring-2 ring-offset-2 ring-black border-white" : "border-transparent"
                                        )}
                                    />
                                    <button
                                        onClick={() => setDrawColor("blue")}
                                        className={cn(
                                            "w-6 h-6 rounded-full bg-[#0000FF] border-2 transition-all",
                                            drawColor === "blue" ? "ring-2 ring-offset-2 ring-[#0000FF] border-white" : "border-transparent"
                                        )}
                                    />
                                </div>

                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={addInitials}
                                        onChange={(e) => setAddInitials(e.target.checked)}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                                    />
                                    <span className="text-sm text-gray-600">Add Initials to corners</span>
                                </label>
                            </div>
                        </>
                    ) : (
                        <div className="h-[400px] flex items-center justify-center text-gray-500 flex-col gap-4">
                            <Users className="w-16 h-16 text-gray-300" />
                            <p>Request signatures from others feature coming soon.</p>
                            <Button variant="outline" onClick={() => setMainTab("me")}>Switch to Me</Button>
                        </div>
                    )}
                </div>

                <DialogFooter className="border-t border-gray-100 p-6 bg-gray-50/50 flex flex-row justify-between items-center sm:justify-end">
                    <div className="text-[10px] text-gray-400 max-w-[200px] leading-tight mr-auto sm:mr-4 hidden sm:block">
                        By clicking Create, you agree to the 18plus PDF Terms of Service.
                    </div>
                    <div className="flex gap-3 w-full sm:w-auto">
                        <Button variant="ghost" onClick={onClose} className="flex-1 sm:flex-none">Cancel</Button>
                        <Button
                            className="bg-blue-600 hover:bg-blue-700 text-white flex-1 sm:flex-none min-w-[140px]"
                            onClick={handleCreateSignature}
                            disabled={
                                mainTab === "others" ||
                                (subTab === "draw" && !hasDrawn) ||
                                (subTab === "type" && !typedText) ||
                                (subTab === "upload" && !uploadedImage)
                            }
                        >
                            Create Signature <Check className="w-4 h-4 ml-2" />
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
