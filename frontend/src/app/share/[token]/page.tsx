"use client";

import { useEffect, useState, use } from "react";
import { api } from "@/lib/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Download, FileIcon, ShieldCheck, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
    params: Promise<{ token: string }>;
}

export default function SharePage({ params }: Props) {
    const wrappedParams = use(params);
    const { token } = wrappedParams;
    const [info, setInfo] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [password, setPassword] = useState("");
    const [unlocking, setUnlocking] = useState(false);
    const [error, setError] = useState("");
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

    useEffect(() => {
        if (token) {
            setLoading(true);
            api.getPublicFileInfo(token)
                .then(data => {
                    setInfo(data);
                    // If public, auto-fetch access URL
                    if (!data.is_protected) {
                        api.accessPublicFile(token)
                            .then(res => setDownloadUrl(res.url))
                            .catch(err => console.error(err));
                    }
                })
                .catch(err => setError(err.message || "File not found or link expired"))
                .finally(() => setLoading(false));
        }
    }, [token]);

    const handleUnlock = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setUnlocking(true);
            const data = await api.accessPublicFile(token, password);
            setDownloadUrl(data.url);
            toast.success("File unlocked");
        } catch (err: any) {
            toast.error("Incorrect password");
            setError("Incorrect password");
        } finally {
            setUnlocking(false);
        }
    };

    const handlePreview = () => {
        if (!downloadUrl) return;
        window.open(downloadUrl, '_blank');
    };

    const handleDownload = () => {
        if (!downloadUrl || !info) return;
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.setAttribute('download', info.name);
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast.success("Download started");
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="space-y-2">
                        <Skeleton className="h-8 w-3/4 mx-auto" />
                        <Skeleton className="h-4 w-1/2 mx-auto" />
                    </CardHeader>
                    <CardContent className="flex justify-center py-10">
                        <Skeleton className="h-12 w-12 rounded-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error && !info) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <Card className="w-full max-w-md border-destructive/50">
                    <CardContent className="flex flex-col items-center py-10 text-center gap-4">
                        <AlertCircle className="w-12 h-12 text-destructive" />
                        <h2 className="text-xl font-bold">Access Error</h2>
                        <p className="text-muted-foreground">{error}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const { name, size_bytes, is_protected, mime_type } = info;
    const isLocked = is_protected && !downloadUrl;

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="text-center">
                    <div className="mx-auto bg-blue-100 p-3 rounded-full w-fit mb-4">
                        <FileIcon className="w-8 h-8 text-blue-600" />
                    </div>
                    <CardTitle className="text-xl break-all">{name}</CardTitle>
                    <CardDescription>
                        Size: {(size_bytes / 1024 / 1024).toFixed(2)} MB • {mime_type || 'Unknown Type'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLocked ? (
                        <form onSubmit={handleUnlock} className="space-y-4">
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm flex items-start gap-2 text-amber-800">
                                <Lock className="w-4 h-4 mt-0.5 shrink-0" />
                                <p>This file is password protected. Please enter the password to unlock.</p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                                    placeholder="Enter password..."
                                    className={error ? "border-destructive" : ""}
                                />
                                {error && <p className="text-sm text-destructive">{error}</p>}
                            </div>

                            <Button type="submit" className="w-full" disabled={unlocking || !password}>
                                {unlocking ? "Verifying..." : "Unlock File"}
                            </Button>
                        </form>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm flex items-start gap-2 text-green-800">
                                <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
                                <p>This file is safe and ready to view or download.</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <Button variant="outline" size="lg" onClick={handlePreview} disabled={!downloadUrl}>
                                    <FileIcon className="w-4 h-4 mr-2" /> Preview
                                </Button>
                                <Button size="lg" onClick={handleDownload} disabled={!downloadUrl}>
                                    <Download className="w-4 h-4 mr-2" /> Download
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
