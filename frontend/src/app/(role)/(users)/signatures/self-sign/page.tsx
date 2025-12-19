"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { pdfStrategyManager } from "@/lib/services/pdf-service";

export default function SelfSignPage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [savedSignature, setSavedSignature] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [position, setPosition] = useState<"bottom-right" | "bottom-left" | "top-right" | "top-left" | "center">("bottom-right");
    const [pageOption, setPageOption] = useState<"first" | "last" | "all">("last");

    useEffect(() => {
        // Load user's default signature
        api.getDefaultSignature()
            .then(sig => setSavedSignature(sig))
            .catch(() => {
                toast.error("Please create a signature first.");
                router.push("/signatures/my-signature");
            });
    }, [router]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (selected && selected.type === "application/pdf") {
            setFile(selected);
        } else {
            toast.error("Please select a PDF file");
        }
    };

    const handleSign = async () => {
        if (!file || !savedSignature) {
            toast.error("Please select a file and ensure you have a saved signature");
            return;
        }

        setLoading(true);
        try {
            const result = await pdfStrategyManager.execute('sign-pdf', [file], {
                signatureImage: savedSignature.image_url,
                position,
                pageOption,
                scale: 0.3
            });

            // Download the signed PDF
            const url = URL.createObjectURL(result.blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = result.fileName || `signed-${file.name}`;
            a.click();
            URL.revokeObjectURL(url);

            toast.success("Document signed and downloaded!");
        } catch (err) {
            console.error(err);
            toast.error("Failed to sign document");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 max-w-3xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Sign a Document</h1>
                <p className="text-muted-foreground mt-1">Upload a PDF and apply your saved signature.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>1. Upload Document</CardTitle>
                    <CardDescription>Select a PDF file to sign.</CardDescription>
                </CardHeader>
                <CardContent>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={handleFileSelect}
                    />

                    {file ? (
                        <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50">
                            <div className="flex items-center gap-3">
                                <FileText className="w-8 h-8 text-blue-600" />
                                <div>
                                    <div className="font-medium">{file.name}</div>
                                    <div className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                                </div>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => setFile(null)}>Change</Button>
                        </div>
                    ) : (
                        <Button
                            variant="outline"
                            className="w-full h-32 border-dashed"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <div className="text-center">
                                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                                <span className="text-muted-foreground">Click to upload PDF</span>
                            </div>
                        </Button>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>2. Your Signature</CardTitle>
                    <CardDescription>This signature will be applied to your document.</CardDescription>
                </CardHeader>
                <CardContent>
                    {savedSignature ? (
                        <div className="flex items-center gap-4 p-4 border rounded-lg bg-white">
                            <img src={savedSignature.image_url} alt="Signature" className="h-16 max-w-[200px] object-contain" />
                            <div className="flex-1">
                                <div className="font-medium">{savedSignature.name}</div>
                                <span className="text-xs text-green-600">Default Signature</span>
                            </div>
                            <Button variant="link" onClick={() => router.push('/signatures/my-signature')}>
                                Change
                            </Button>
                        </div>
                    ) : (
                        <div className="text-center py-6">
                            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                            <p className="text-muted-foreground">Loading signature...</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>3. Placement Options</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Position</Label>
                            <select
                                className="w-full p-2 border rounded-md"
                                value={position}
                                onChange={(e) => setPosition(e.target.value as any)}
                            >
                                <option value="bottom-right">Bottom Right</option>
                                <option value="bottom-left">Bottom Left</option>
                                <option value="top-right">Top Right</option>
                                <option value="top-left">Top Left</option>
                                <option value="center">Center</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label>Apply To</Label>
                            <select
                                className="w-full p-2 border rounded-md"
                                value={pageOption}
                                onChange={(e) => setPageOption(e.target.value as any)}
                            >
                                <option value="last">Last Page Only</option>
                                <option value="first">First Page Only</option>
                                <option value="all">All Pages</option>
                            </select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Button
                className="w-full gap-2"
                size="lg"
                onClick={handleSign}
                disabled={!file || !savedSignature || loading}
            >
                {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Signing...</>
                ) : (
                    <><CheckCircle className="w-4 h-4" /> Sign & Download</>
                )}
            </Button>
        </div>
    );
}
