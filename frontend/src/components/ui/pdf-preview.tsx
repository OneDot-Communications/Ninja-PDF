"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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
    const isRenderingRef = useRef(false);
    const pdfDocRef = useRef<any>(null);

    // Memoize onLoadSuccess to prevent re-renders
    const onLoadSuccessRef = useRef(onLoadSuccess);
    onLoadSuccessRef.current = onLoadSuccess;

    useEffect(() => {
        let isMounted = true;
        let loadingTask: any = null;

        const loadPdf = async () => {
            try {
                if (!isMounted) return;
                setLoading(true);
                setError(null);

                // Wait for any in-progress render to complete cancellation
                if (renderTaskRef.current) {
                    try {
                        renderTaskRef.current.cancel();
                        await renderTaskRef.current.promise.catch(() => { });
                    } catch {
                        // Ignore cancellation errors
                    }
                    renderTaskRef.current = null;
                }

                // Wait a tick to ensure canvas is freed
                await new Promise(resolve => setTimeout(resolve, 10));

                if (!isMounted) return;

                const pdfjsLib = await getPdfJs();

                const arrayBuffer = await file.arrayBuffer();
                loadingTask = (pdfjsLib as any).getDocument({ data: new Uint8Array(arrayBuffer) });

                const pdf = await loadingTask.promise;
                pdfDocRef.current = pdf;

                if (!isMounted) {
                    pdf.destroy();
                    return;
                }

                if (onLoadSuccessRef.current) {
                    onLoadSuccessRef.current(pdf.numPages);
                }

                const page = await pdf.getPage(pageNumber);
                const viewport = page.getViewport({ scale });

                const canvas = canvasRef.current;
                if (!canvas || !isMounted) return;

                const context = canvas.getContext("2d");
                if (!context) return;

                // Clear canvas before resizing
                context.clearRect(0, 0, canvas.width, canvas.height);

                canvas.height = viewport.height;
                canvas.width = viewport.width;

                // Check if another render started
                if (isRenderingRef.current) {
                    return;
                }

                isRenderingRef.current = true;

                const renderContext = {
                    canvasContext: context,
                    viewport: viewport,
                };

                const renderTask = page.render(renderContext as any);
                renderTaskRef.current = renderTask;

                await renderTask.promise;

                renderTaskRef.current = null;
                isRenderingRef.current = false;

            } catch (err: any) {
                isRenderingRef.current = false;

                if (err.name === 'RenderingCancelledException' || !isMounted) {
                    return; // Normal cancellation, not an error
                }

                console.error("Error rendering PDF:", err);
                if (err.name === 'InvalidPDFException' || err.message?.includes('Invalid PDF structure')) {
                    setError("Invalid or corrupted PDF file.");
                } else if (err.name === 'PasswordException' || err.message?.includes('password')) {
                    setError("Password protected PDF.");
                } else {
                    setError("Failed to load PDF preview.");
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

            // Cancel any pending render
            if (renderTaskRef.current) {
                try {
                    renderTaskRef.current.cancel();
                } catch { }
                renderTaskRef.current = null;
            }

            // Cancel loading task
            if (loadingTask) {
                try {
                    loadingTask.destroy();
                } catch { }
            }

            // Cleanup PDF document
            if (pdfDocRef.current) {
                try {
                    pdfDocRef.current.destroy();
                } catch { }
                pdfDocRef.current = null;
            }

            isRenderingRef.current = false;
        };
    }, [file, pageNumber, scale]);

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

