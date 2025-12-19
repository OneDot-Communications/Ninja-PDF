"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface FilePreviewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    file: {
        name: string;
        url: string;
        mime_type: string;
        size_bytes: number;
        [key: string]: any;
    } | null;
}

export function FilePreviewDialog({ open, onOpenChange, file }: FilePreviewDialogProps) {
    const [blobUrl, setBlobUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);

    // Resolve full URL for relative paths
    const getFullUrl = (url: string) => {
        if (!url) return "";
        if (url.startsWith("http") || url.startsWith("blob:") || url.startsWith("data:")) return url;
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        return `${baseUrl.replace(/\/+$/, "")}${url}`;
    };

    useEffect(() => {
        if (open && file?.url) {
            const fetchSecureFile = async () => {
                try {
                    setLoading(true);
                    setError(false);
                    const fullUrl = getFullUrl(file.url);

                    // Fetch with credentials only for internal/same-origin requests
                    // S3/External URLs rely on query signatures and often fail CORS if credentials are sent with wildcard allow-origin
                    const isInternal = !fullUrl.startsWith("http") || fullUrl.includes(window.location.hostname) || fullUrl.includes("localhost");

                    const response = await fetch(fullUrl, {
                        credentials: isInternal ? "include" : "omit"
                    });

                    if (!response.ok) {
                        // Handle expected errors gracefully without throwing (avoids console noise)
                        if (response.status === 404 || response.status === 403) {
                            console.warn(`Preview failed: ${response.status} ${response.statusText}`);
                            setError(true);
                            // Optional: Show specific toast
                            // toast.error(response.status === 404 ? "File missing from server." : "Access denied.");
                            return;
                        }
                        throw new Error(`Failed to load file (${response.status} ${response.statusText})`);
                    }

                    const blob = await response.blob();
                    // Create an object URL from the blob
                    // We explicitly set the type if available to help the browser render it correctly
                    const contentBlob = new Blob([blob], { type: file.mime_type || blob.type });
                    const objectUrl = URL.createObjectURL(contentBlob);

                    setBlobUrl(objectUrl);
                } catch (err: any) {
                    console.error("Preview error:", err);
                    setError(true);
                    // Show specific error to user via toast
                    toast.error(err.message || "Could not load file preview.");
                } finally {
                    setLoading(false);
                }
            };

            fetchSecureFile();
        } else {
            // Cleanup on close
            setBlobUrl(null);
            setError(false);
        }
    }, [open, file]);

    // Cleanup object URL on unmount or url change
    useEffect(() => {
        return () => {
            if (blobUrl) URL.revokeObjectURL(blobUrl);
        };
    }, [blobUrl]);

    if (!file) return null;

    const fullUrl = getFullUrl(file.url);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
                <DialogHeader className="p-4 border-b flex flex-row items-center justify-between space-y-0 bg-slate-50">
                    <DialogTitle className="truncate font-medium flex-1 pr-4">{file.name}</DialogTitle>
                    <div className="flex items-center gap-1">
                        {blobUrl && (
                            <>
                                <Button size="sm" variant="outline" asChild className="gap-2 h-8">
                                    <a href={blobUrl} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="w-3.5 h-3.5" /> View Full
                                    </a>
                                </Button>
                                <Button size="sm" variant="default" asChild className="gap-2 h-8">
                                    <a href={blobUrl} download={file.name}>
                                        <Download className="w-3.5 h-3.5" /> Download
                                    </a>
                                </Button>
                            </>
                        )}
                    </div>
                </DialogHeader>

                <div className="flex-1 bg-slate-100 flex items-center justify-center relative overflow-hidden">
                    {loading && (
                        <div className="flex flex-col items-center gap-3 text-muted-foreground animate-in fade-in">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            <p>Loading secure preview...</p>
                        </div>
                    )}

                    {!loading && error && (
                        <div className="text-center p-6 max-w-md">
                            <div className="bg-red-50 text-red-600 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                                <ExternalLink className="w-6 h-6" />
                            </div>
                            <h3 className="font-semibold mb-2">Preview Unavailable</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                The file could not be loaded. It may have been deleted from the server or you don't have permission.
                                <br />Try re-uploading the file.
                            </p>
                        </div>
                    )}

                    {!loading && !error && blobUrl && (
                        <iframe
                            src={blobUrl}
                            className="w-full h-full border-none bg-white"
                            title={file.name}
                            sandbox="allow-same-origin allow-scripts"
                        />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
