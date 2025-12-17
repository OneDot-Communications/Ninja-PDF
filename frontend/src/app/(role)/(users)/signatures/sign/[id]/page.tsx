"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/app/lib/api";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Loader2, CheckCircle, FileText, PenTool, Type, Image } from "lucide-react";
import { toast } from "sonner";

export default function SignDocumentPage() {
    const { id } = useParams();
    const router = useRouter();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [request, setRequest] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [signing, setSigning] = useState(false);
    const [signatureMethod, setSignatureMethod] = useState<"saved" | "draw" | "type">("saved");
    const [signatureText, setSignatureText] = useState("");
    const [savedSignatures, setSavedSignatures] = useState<any[]>([]);
    const [selectedSignature, setSelectedSignature] = useState<any>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    useEffect(() => {
        if (id) {
            Promise.all([
                api.getSignatureRequest(id as string),
                api.getSavedSignatures()
            ])
                .then(([req, sigs]) => {
                    setRequest(req);
                    setSavedSignatures(sigs || []);
                    // Auto-select default signature
                    const defaultSig = sigs?.find((s: any) => s.is_default) || sigs?.[0];
                    if (defaultSig) setSelectedSignature(defaultSig);
                })
                .catch(err => {
                    console.error(err);
                    toast.error("Failed to load document");
                })
                .finally(() => setLoading(false));
        }
    }, [id]);

    useEffect(() => {
        if (signatureMethod === "draw") {
            setupCanvas();
        }
    }, [signatureMethod]);

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

    const stopDrawing = () => setIsDrawing(false);

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    const handleSign = async () => {
        let signatureData = "";

        if (signatureMethod === "saved") {
            if (!selectedSignature) {
                toast.error("Please select a signature");
                return;
            }
            signatureData = selectedSignature.image_url;
        } else if (signatureMethod === "type") {
            if (!signatureText.trim()) {
                toast.error("Please type your name");
                return;
            }
            signatureData = signatureText;
        } else if (signatureMethod === "draw") {
            const canvas = canvasRef.current;
            if (!canvas) return;
            signatureData = canvas.toDataURL("image/png");
        }

        setSigning(true);
        try {
            await api.signRequest(id as string, { signature: signatureData });
            toast.success("Document signed successfully!");
            router.push('/signatures/signed');
        } catch (error) {
            console.error(error);
            toast.error("Failed to sign document.");
        } finally {
            setSigning(false);
        }
    };

    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;
    if (!request) return <div className="p-10 text-center">Document not found.</div>;

    return (
        <div className="max-w-5xl mx-auto space-y-6 py-10">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Sign Document</h1>
                    <p className="text-muted-foreground mt-1">{request.document_name}</p>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6">
                    <Card className="min-h-[500px] flex items-center justify-center bg-slate-50 border-2 border-dashed">
                        {request.document ? (
                            <iframe src={request.document} className="w-full h-[500px]" title="PDF Preview"></iframe>
                        ) : (
                            <div className="text-center">
                                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                <p className="text-muted-foreground">PDF Preview Unavailable</p>
                                <Button variant="link" onClick={() => window.open(request.document, '_blank')}>Download PDF</Button>
                            </div>
                        )}
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Your Signature</CardTitle>
                            <CardDescription>Choose how you want to sign.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Tabs value={signatureMethod} onValueChange={(v) => setSignatureMethod(v as any)}>
                                <TabsList className="grid grid-cols-3 w-full">
                                    <TabsTrigger value="saved" className="gap-1"><Image className="w-3 h-3" /> Saved</TabsTrigger>
                                    <TabsTrigger value="draw" className="gap-1"><PenTool className="w-3 h-3" /> Draw</TabsTrigger>
                                    <TabsTrigger value="type" className="gap-1"><Type className="w-3 h-3" /> Type</TabsTrigger>
                                </TabsList>

                                <TabsContent value="saved" className="mt-4 space-y-3">
                                    {savedSignatures.length === 0 ? (
                                        <div className="text-center py-4">
                                            <p className="text-sm text-muted-foreground mb-2">No saved signatures</p>
                                            <Button variant="link" size="sm" onClick={() => router.push('/signatures/my-signature')}>
                                                Create One
                                            </Button>
                                        </div>
                                    ) : (
                                        savedSignatures.map(sig => (
                                            <div
                                                key={sig.id}
                                                className={`p-3 border rounded-lg cursor-pointer transition-all ${selectedSignature?.id === sig.id ? 'border-primary bg-primary/5' : 'hover:border-gray-400'
                                                    }`}
                                                onClick={() => setSelectedSignature(sig)}
                                            >
                                                <img src={sig.image_url} alt={sig.name} className="h-10 max-w-full object-contain" />
                                                <div className="text-xs text-muted-foreground mt-1">{sig.name}</div>
                                            </div>
                                        ))
                                    )}
                                </TabsContent>

                                <TabsContent value="draw" className="mt-4 space-y-3">
                                    <div className="border-2 border-dashed rounded-lg bg-white">
                                        <canvas
                                            ref={canvasRef}
                                            width={280}
                                            height={100}
                                            className="w-full cursor-crosshair touch-none"
                                            onMouseDown={startDrawing}
                                            onMouseMove={draw}
                                            onMouseUp={stopDrawing}
                                            onMouseLeave={stopDrawing}
                                        />
                                    </div>
                                    <Button variant="outline" size="sm" onClick={clearCanvas} className="w-full">Clear</Button>
                                </TabsContent>

                                <TabsContent value="type" className="mt-4 space-y-3">
                                    <div className="space-y-2">
                                        <Label>Type your full name</Label>
                                        <Input
                                            value={signatureText}
                                            onChange={(e) => setSignatureText(e.target.value)}
                                            placeholder="e.g. John Doe"
                                            className="font-serif italic text-lg"
                                        />
                                    </div>
                                    {signatureText && (
                                        <div className="p-4 border rounded-lg bg-white text-center">
                                            <span className="font-serif italic text-2xl">{signatureText}</span>
                                        </div>
                                    )}
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Details</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm space-y-2">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Sender:</span>
                                <span>{request.sender_email}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Date:</span>
                                <span>{new Date(request.created_at).toLocaleDateString()}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Button className="w-full gap-2" size="lg" onClick={handleSign} disabled={signing}>
                        {signing ? <Loader2 className="animate-spin w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                        Sign Document
                    </Button>

                    <p className="text-xs text-muted-foreground text-center">
                        By clicking "Sign Document", you agree to be legally bound by this electronic signature.
                    </p>
                </div>
            </div>
        </div>
    );
}

