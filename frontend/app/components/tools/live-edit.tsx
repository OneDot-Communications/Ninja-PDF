"use client";

import React, { useEffect, useRef, useState } from "react";
import { Stage, Layer, Rect, Text as KonvaText } from "react-konva";

// Disable worker for Next.js/Turbopack compatibility
// pdf.js will run in the main thread instead of using a Web Worker.

type Tool = "select" | "rect" | "text";

type RectAnnotation = {
    id: string;
    page: number;
    x: number;
    y: number;
    width: number;
    height: number;
};

type TextAnnotation = {
    id: string;
    page: number;
    x: number;
    y: number;
    text: string;
};

export const AdvancedPdfEditor: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const [pdfDoc, setPdfDoc] = useState<any>(null);
    const [numPages, setNumPages] = useState<number>(0);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [scale, setScale] = useState<number>(1.3);

    const [pageSize, setPageSize] = useState<{ width: number; height: number }>({
        width: 0,
        height: 0,
    });

    const [file, setFile] = useState<File | null>(null);
    const [fileUrl, setFileUrl] = useState<string | null>(null);

    const [tool, setTool] = useState<Tool>("select");

    const [rectAnnotations, setRectAnnotations] = useState<RectAnnotation[]>([]);
    const [textAnnotations, setTextAnnotations] = useState<TextAnnotation[]>([]);

    // Temporary state for drawing rectangles
    const [isDrawing, setIsDrawing] = useState(false);
    const [drawingRect, setDrawingRect] = useState<RectAnnotation | null>(null);

    // Load PDF when fileUrl changes
    useEffect(() => {
        if (!fileUrl) return;


        const loadPdf = async () => {
            try {
                const pdfjsLib = await import("pdfjs-dist");
                (pdfjsLib as any).GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
                const loadingTask = pdfjsLib.getDocument({
                    url: fileUrl,
                });
                const pdf = await loadingTask.promise;
                setPdfDoc(pdf);
                setNumPages(pdf.numPages);
                setCurrentPage(1);
                renderPage(pdf, 1, scale);
            } catch (error) {
                console.error("Error loading PDF:", error);
            }
        };

        loadPdf();

        // Cleanup object URL when component unmounts or file changes
        return () => {
            if (fileUrl) URL.revokeObjectURL(fileUrl);
        };

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fileUrl]);

    // Re-render page when currentPage or scale changes
    useEffect(() => {
        if (!pdfDoc) return;
        renderPage(pdfDoc, currentPage, scale);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPage, scale, pdfDoc]);

    const renderPage = async (pdf: any, pageNum: number, scaleValue: number) => {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: scaleValue });

        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext("2d");
        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        setPageSize({ width: viewport.width, height: viewport.height });

        const renderContext = {
            canvasContext: context,
            viewport,
        };

        await page.render(renderContext).promise;
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setFile(f);
        const url = URL.createObjectURL(f);
        setFileUrl(url);
    };

    const handlePrevPage = () => {
        if (!pdfDoc) return;
        setCurrentPage((p) => Math.max(1, p - 1));
    };

    const handleNextPage = () => {
        if (!pdfDoc) return;
        setCurrentPage((p) => Math.min(numPages, p + 1));
    };

    const handleZoomIn = () => setScale((s) => Math.min(3, s + 0.2));
    const handleZoomOut = () => setScale((s) => Math.max(0.5, s - 0.2));

    const makeId = () =>
        typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : Math.random().toString(36).slice(2);

    // Konva events
    const handleStageMouseDown = (e: any) => {
        if (tool !== "rect" && tool !== "text") return;

        const stage = e.target.getStage();
        const pointerPosition = stage.getPointerPosition();
        if (!pointerPosition) return;

        const { x, y } = pointerPosition;

        if (tool === "rect") {
            setIsDrawing(true);
            const id = makeId();
            setDrawingRect({
                id,
                page: currentPage,
                x,
                y,
                width: 0,
                height: 0,
            });
        }

        if (tool === "text") {
            const text = window.prompt("Enter annotation text:") || "";
            if (!text.trim()) return;

            const id = makeId();
            setTextAnnotations((prev) => [
                ...prev,
                {
                    id,
                    page: currentPage,
                    x,
                    y,
                    text,
                },
            ]);
        }
    };

    const handleStageMouseMove = (e: any) => {
        if (!isDrawing || tool !== "rect" || !drawingRect) return;
        const stage = e.target.getStage();
        const pointerPosition = stage.getPointerPosition();
        if (!pointerPosition) return;

        const { x, y } = pointerPosition;

        const newRect = { ...drawingRect };

        newRect.width = x - drawingRect.x;
        newRect.height = y - drawingRect.y;

        setDrawingRect(newRect);
    };

    const handleStageMouseUp = () => {
        if (tool !== "rect") return;
        if (!isDrawing || !drawingRect) {
            setIsDrawing(false);
            setDrawingRect(null);
            return;
        }

        // Avoid tiny accidental clicks
        if (
            Math.abs(drawingRect.width) > 5 &&
            Math.abs(drawingRect.height) > 5
        ) {
            setRectAnnotations((prev) => [...prev, drawingRect]);
        }

        setIsDrawing(false);
        setDrawingRect(null);
    };

    const currentPageRects = rectAnnotations.filter(
        (ann) => ann.page === currentPage
    );
    const currentPageTexts = textAnnotations.filter(
        (ann) => ann.page === currentPage
    );

    // TODO later: send `file`, `rectAnnotations`, `textAnnotations` to backend (Go + pdfcpu)
    const handleExport = async () => {
        if (!file) {
            alert("Upload a PDF first.");
            return;
        }

        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("rectAnnotations", JSON.stringify(rectAnnotations));
            formData.append("textAnnotations", JSON.stringify(textAnnotations));

            const res = await fetch("http://localhost:8080/api/pdf/apply-edits", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                const msg = await res.text();
                console.error("Export failed:", msg);
                alert("Backend error: " + msg);
                return;
            }

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = url;
            a.download =
                file.name.replace(/\.pdf$/i, "") + "-edited.pdf";
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error(err);
            alert("Failed to export PDF. Check console for details.");
        }
    };


    return (
        <div className="flex flex-col gap-4 h-full">
            {/* Top toolbar */}
            <div className="flex flex-wrap items-center gap-3 border-b pb-3">
                <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    className="text-sm"
                />

                <div className="flex items-center gap-2">
                    <button
                        className={`px-2 py-1 rounded text-sm border ${tool === "select" ? "bg-black text-white" : "bg-white"
                            }`}
                        onClick={() => setTool("select")}
                    >
                        Select
                    </button>
                    <button
                        className={`px-2 py-1 rounded text-sm border ${tool === "rect" ? "bg-black text-white" : "bg-white"
                            }`}
                        onClick={() => setTool("rect")}
                    >
                        Rectangle
                    </button>
                    <button
                        className={`px-2 py-1 rounded text-sm border ${tool === "text" ? "bg-black text-white" : "bg-white"
                            }`}
                        onClick={() => setTool("text")}
                    >
                        Text
                    </button>
                </div>

                <div className="flex items-center gap-2 ml-auto">
                    <button
                        className="px-2 py-1 rounded border text-sm"
                        onClick={handleZoomOut}
                    >
                        -
                    </button>
                    <span className="text-sm">
                        {Math.round(scale * 100)}%
                    </span>
                    <button
                        className="px-2 py-1 rounded border text-sm"
                        onClick={handleZoomIn}
                    >
                        +
                    </button>

                    <div className="flex items-center gap-1 ml-4">
                        <button
                            className="px-2 py-1 rounded border text-sm"
                            onClick={handlePrevPage}
                            disabled={currentPage <= 1}
                        >
                            Prev
                        </button>
                        <span className="text-sm">
                            Page {currentPage} / {numPages || "-"}
                        </span>
                        <button
                            className="px-2 py-1 rounded border text-sm"
                            onClick={handleNextPage}
                            disabled={!numPages || currentPage >= numPages}
                        >
                            Next
                        </button>
                    </div>

                    <button
                        className="px-3 py-1 rounded border text-sm ml-4"
                        onClick={handleExport}
                    >
                        Export
                    </button>
                </div>
            </div>

            {/* PDF + Overlay */}
            <div className="flex-1 overflow-auto">
                <div
                    style={{
                        position: "relative",
                        display: "inline-block",
                        border: "1px solid #e5e7eb",
                    }}
                >
                    <canvas ref={canvasRef} />

                    {pageSize.width > 0 && (
                        <Stage
                            width={pageSize.width}
                            height={pageSize.height}
                            style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                pointerEvents: "auto",
                            }}
                            onMouseDown={handleStageMouseDown}
                            onMouseMove={handleStageMouseMove}
                            onMouseUp={handleStageMouseUp}
                        >
                            <Layer>
                                {currentPageRects.map((ann) => (
                                    <Rect
                                        key={ann.id}
                                        x={ann.width >= 0 ? ann.x : ann.x + ann.width}
                                        y={ann.height >= 0 ? ann.y : ann.y + ann.height}
                                        width={Math.abs(ann.width)}
                                        height={Math.abs(ann.height)}
                                        stroke="red"
                                        dash={[4, 4]}
                                    />
                                ))}

                                {drawingRect && drawingRect.page === currentPage && (
                                    <Rect
                                        x={
                                            drawingRect.width >= 0
                                                ? drawingRect.x
                                                : drawingRect.x + drawingRect.width
                                        }
                                        y={
                                            drawingRect.height >= 0
                                                ? drawingRect.y
                                                : drawingRect.y + drawingRect.height
                                        }
                                        width={Math.abs(drawingRect.width)}
                                        height={Math.abs(drawingRect.height)}
                                        stroke="red"
                                        dash={[4, 4]}
                                    />
                                )}

                                {currentPageTexts.map((ann) => (
                                    <KonvaText
                                        key={ann.id}
                                        x={ann.x}
                                        y={ann.y}
                                        text={ann.text}
                                        fontSize={14}
                                        fill="blue"
                                    />
                                ))}
                            </Layer>
                        </Stage>
                    )}
                </div>
            </div>
        </div>
    );
};
