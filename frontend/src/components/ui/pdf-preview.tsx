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
}

export function PdfPreview({
    file,
    pageNumber = 1,
    scale = 1,
    className,
    onLoadSuccess,
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

                // Cancel any previous render task
                if (renderTaskRef.current) {
                    renderTaskRef.current.cancel();
                }

                const pdfjsLib = await getPdfJs();

                const arrayBuffer = await file.arrayBuffer();
                const loadingTask = (pdfjsLib as any).getDocument({ data: new Uint8Array(arrayBuffer) });
                const pdf = await loadingTask.promise;

                if (onLoadSuccess) {
                    onLoadSuccess(pdf.numPages);
                }

                const page = await pdf.getPage(pageNumber);
                const viewport = page.getViewport({ scale });

                const canvas = canvasRef.current;
                if (!canvas) return;

                const context = canvas.getContext("2d");
                if (!context) return;

                canvas.height = viewport.height;
                canvas.width = viewport.width;

                const renderContext = {
                    canvasContext: context,
                    viewport: viewport,
                };

                const renderTask = page.render(renderContext as any);
                renderTaskRef.current = renderTask;
                await renderTask.promise;
                renderTaskRef.current = null;
            } catch (err: any) {
                if (err.name !== 'RenderingCancelledException') {
                    console.error("Error rendering PDF:", err);
                    if (err.name === 'InvalidPDFException' || err.message?.includes('Invalid PDF structure')) {
                        setError("Invalid or corrupted PDF file.");
                    } else if (err.name === 'PasswordException' || err.message?.includes('password')) {
                        setError("Password protected PDF.");
                    } else {
                        setError("Failed to load PDF preview.");
                    }
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        loadPdf();

        return () => {
            isMounted = false;
            if (renderTaskRef.current) {
                renderTaskRef.current.cancel();
                renderTaskRef.current = null;
            }
        };
    }, [file, pageNumber, scale, onLoadSuccess]);

    return (
        <div className={cn("relative flex items-center justify-center bg-muted/20", className)}>
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
            )}
            {error && (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-destructive">
                    {error}
                </div>
            )}
            <canvas ref={canvasRef} className="max-w-full shadow-md" />
        </div>
    );
}
