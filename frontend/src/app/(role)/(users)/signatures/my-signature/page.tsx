"use client";

import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Save, PenTool, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export default function MySignaturePage() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [savedSignatures, setSavedSignatures] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [signatureName, setSignatureName] = useState("My Signature");
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadSignatures();
        setupCanvas();
    }, []);

    const loadSignatures = async () => {
        try {
            const data = await api.getSavedSignatures();
            setSavedSignatures(data || []);
        } catch (err) {
            console.error("Failed to load signatures:", err);
        } finally {
            setLoading(false);
        }
    };

    const setupCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
    };

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        setIsDrawing(true);
        const rect = canvas.getBoundingClientRect();
        ctx.beginPath();
        ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
        ctx.stroke();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    const saveSignature = async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        setIsSaving(true);
        try {
            // Convert canvas to blob
            const blob = await new Promise<Blob | null>((resolve) => {
                canvas.toBlob(resolve, "image/png");
            });

            if (!blob) {
                toast.error("Failed to capture signature");
                return;
            }

            const formData = new FormData();
            formData.append("image", blob, "signature.png");
            formData.append("name", signatureName);
            formData.append("is_default", savedSignatures.length === 0 ? "true" : "false");

            await api.createSavedSignature(formData);
            toast.success("Signature saved successfully!");
            clearCanvas();
            loadSignatures();
        } catch (err) {
            console.error(err);
            toast.error("Failed to save signature");
        } finally {
            setIsSaving(false);
        }
    };

    const deleteSignature = async (id: number) => {
        if (!confirm("Delete this signature?")) return;
        try {
            await api.deleteSavedSignature(id);
            toast.success("Signature deleted");
            loadSignatures();
        } catch (err) {
            toast.error("Failed to delete signature");
        }
    };

    const setAsDefault = async (id: number) => {
        try {
            await api.setDefaultSignature(id);
            toast.success("Default signature updated");
            loadSignatures();
        } catch (err) {
            toast.error("Failed to update default");
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">My Signature</h1>
                <p className="text-muted-foreground mt-1">Create and manage your e-signatures.</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Drawing Panel */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <PenTool className="w-5 h-5" /> Draw Your Signature
                        </CardTitle>
                        <CardDescription>Use your mouse or touchpad to draw your signature below.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="border-2 border-dashed rounded-lg bg-white">
                            <canvas
                                ref={canvasRef}
                                width={400}
                                height={150}
                                className="w-full cursor-crosshair touch-none"
                                onMouseDown={startDrawing}
                                onMouseMove={draw}
                                onMouseUp={stopDrawing}
                                onMouseLeave={stopDrawing}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Signature Name</Label>
                            <Input
                                value={signatureName}
                                onChange={(e) => setSignatureName(e.target.value)}
                                placeholder="e.g. Work Signature"
                            />
                        </div>

                        <div className="flex gap-2">
                            <Button variant="outline" onClick={clearCanvas} className="gap-2">
                                <RotateCcw className="w-4 h-4" /> Clear
                            </Button>
                            <Button onClick={saveSignature} disabled={isSaving} className="gap-2 flex-1">
                                <Save className="w-4 h-4" /> {isSaving ? "Saving..." : "Save Signature"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Saved Signatures */}
                <Card>
                    <CardHeader>
                        <CardTitle>Saved Signatures</CardTitle>
                        <CardDescription>Your saved signatures for quick use.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="space-y-4">
                                <Skeleton className="h-20 w-full" />
                                <Skeleton className="h-20 w-full" />
                            </div>
                        ) : savedSignatures.length === 0 ? (
                            <div className="text-center py-10 text-muted-foreground">
                                No saved signatures yet. Draw one above.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {savedSignatures.map((sig) => (
                                    <div key={sig.id} className="flex items-center gap-4 p-4 border rounded-lg bg-slate-50">
                                        <img src={sig.image_url} alt={sig.name} className="h-12 max-w-[150px] object-contain border bg-white p-1" />
                                        <div className="flex-1">
                                            <div className="font-medium">{sig.name}</div>
                                            {sig.is_default && (
                                                <span className="text-xs text-green-600 font-medium">Default</span>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            {!sig.is_default && (
                                                <Button variant="ghost" size="sm" onClick={() => setAsDefault(sig.id)}>
                                                    Set Default
                                                </Button>
                                            )}
                                            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteSignature(sig.id)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
