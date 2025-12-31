"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { getPdfJs } from "@/lib/services/pdf-service";

interface PdfPreviewProps {
    file: File;
    pageNumber?: number;
    scale?: number;
    className?: string;
    onLoadSuccess?: (numPages: number) => void;
    children?: React.ReactNode;
    contentRef?: React.RefObject<HTMLDivElement>;
}

export function PdfPreview({
    file,
    pageNumber = 1,
    scale = 1,
    className,
    onLoadSuccess,
    children,
    contentRef
}: PdfPreviewProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const renderTaskRef = useRef<any>(null);

    useEffect(() => {
        let isMounted = true;

        const loadPdf = async () => {
            try {
                if (!isMounted) return;
                setLoading(true);
                setError(null);

                // Cancel any previous render task immediately
                if (renderTaskRef.current) {
                    try {
                        await renderTaskRef.current.cancel();
                    } catch (e) {
                        // ignore
                    }
                    renderTaskRef.current = null;
                }

                const pdfjsLib = await getPdfJs();
                const arrayBuffer = await file.arrayBuffer();

                if (!isMounted) return;

                const loadingTask = (pdfjsLib as any).getDocument({ data: new Uint8Array(arrayBuffer) });
                const pdf = await loadingTask.promise;

                if (!isMounted) return;

                if (onLoadSuccess) {
                    onLoadSuccess(pdf.numPages);
                }

                const page = await pdf.getPage(pageNumber);
                const viewport = page.getViewport({ scale });

                const canvas = canvasRef.current;
                if (!canvas) return;

                const context = canvas.getContext("2d");
                if (!context) return;

                // Ensure canvas runs in clean state
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                const renderContext = {
                    canvasContext: context,
                    viewport: viewport,
                };

                const renderTask = page.render(renderContext as any);
                renderTaskRef.current = renderTask;

                await renderTask.promise;
            } catch (err: any) {
                if (err.name !== 'RenderingCancelledException') {
                    console.error("Error rendering PDF:", err);
                    if (isMounted) {
                        if (err.name === 'InvalidPDFException' || err.message?.includes('Invalid PDF structure')) {
                            setError("Invalid or corrupted PDF file.");
                        } else if (err.name === 'PasswordException' || err.message?.includes('password')) {
                            setError("Password protected PDF.");
                        } else {
                            setError("Failed to load PDF preview.");
                        }
                    }
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                    // Clear ref if this task finished
                    if (renderTaskRef.current?.promise?._status === 1) {
                        renderTaskRef.current = null;
                    }
                }
            }
        };

        const timer = setTimeout(loadPdf, 50);

        return () => {
            isMounted = false;
            clearTimeout(timer);
            if (renderTaskRef.current) {
                renderTaskRef.current.cancel();
                renderTaskRef.current = null;
            }
        };
    }, [file, pageNumber, scale, onLoadSuccess]);

    return (
        <div className={cn("relative flex items-center justify-center bg-muted/20 min-h-[600px]", className)}>
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
            )}
            {error && (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-destructive bg-white/80 z-20">
                    {error}
                </div>
            )}

            {/* TIGHT WRAPPER for Canvas + Overlay */}
            <div className="relative shadow-md inline-block" ref={contentRef}>
                <canvas ref={canvasRef} className="block max-w-full" />
                {children}
            </div>
        </div>
    );
}
