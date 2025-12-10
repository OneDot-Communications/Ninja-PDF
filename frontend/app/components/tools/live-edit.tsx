"use client";

import React, { useEffect, useRef, useState } from "react";
import { Stage, Layer, Rect, Text as KonvaText } from "react-konva";

type Tool = "select" | "rect" | "text" | "edit";

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

// Extracted text item from PDF with position info
type ExtractedTextItem = {
    id: string;
    page: number;
    x: number;
    y: number;
    width: number;
    height: number;
    originalText: string;
    fontSize: number;
    fontFamily: string;
};

// Text edit representing a modification to original text
type TextEdit = {
    id: string;
    page: number;
    x: number;
    y: number;
    width: number;
    height: number;
    originalText: string;
    newText: string;
    fontSize: number;
};

export const AdvancedPdfEditor: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const renderTaskRef = useRef<any>(null);

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

    // Extracted text items from PDF
    const [extractedTexts, setExtractedTexts] = useState<ExtractedTextItem[]>([]);
    // Text edits made by user
    const [textEdits, setTextEdits] = useState<TextEdit[]>([]);
    // Currently selected text item for editing
    const [selectedTextId, setSelectedTextId] = useState<string | null>(null);

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
                // Clear previous extractions and edits
                setExtractedTexts([]);
                setTextEdits([]);
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

        // Cancel previous render if it exists
        if (renderTaskRef.current) {
            renderTaskRef.current.cancel();
        }

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        setPageSize({ width: viewport.width, height: viewport.height });

        const renderContext = {
            canvasContext: context,
            viewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;

        try {
            await renderTask.promise;
        } catch (error: any) {
            if (error.name === "RenderingCancelledException") {
                return;
            }
            console.error("Render error:", error);
        }

        // Extract text content with positions
        await extractTextFromPage(page, pageNum, viewport);
    };

    const extractTextFromPage = async (page: any, pageNum: number, viewport: any) => {
        try {
            const textContent = await page.getTextContent();
            const items: ExtractedTextItem[] = [];

            for (const item of textContent.items) {
                if (!item.str || item.str.trim() === "") continue;

                // Transform coordinates from PDF space to screen space
                const tx = item.transform;
                // tx = [scaleX, skewX, skewY, scaleY, translateX, translateY]
                const fontSize = Math.sqrt(tx[0] * tx[0] + tx[1] * tx[1]);

                // Convert PDF coordinates to viewport coordinates
                const [x, y] = viewport.convertToViewportPoint(tx[4], tx[5]);

                // Approximate width and height
                const width = item.width * viewport.scale;
                const height = fontSize * viewport.scale;

                items.push({
                    id: `text-${pageNum}-${items.length}`,
                    page: pageNum,
                    x: x,
                    y: y - height, // Adjust for baseline
                    width: width,
                    height: height,
                    originalText: item.str,
                    fontSize: fontSize,
                    fontFamily: item.fontName || "sans-serif",
                });
            }

            // Update extracted texts, removing old items for this page
            setExtractedTexts((prev) => [
                ...prev.filter((t) => t.page !== pageNum),
                ...items,
            ]);
        } catch (error) {
            console.error("Error extracting text:", error);
        }
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

    // Handle clicking on extracted text to edit it
    const handleTextClick = (textItem: ExtractedTextItem) => {
        if (tool !== "edit") return;

        // Check if already edited
        const existingEdit = textEdits.find(
            (e) => e.id === textItem.id
        );

        const currentText = existingEdit ? existingEdit.newText : textItem.originalText;
        const newText = window.prompt("Edit text:", currentText);

        if (newText === null) return; // Cancelled

        if (newText === textItem.originalText) {
            // Reverted to original, remove edit
            setTextEdits((prev) => prev.filter((e) => e.id !== textItem.id));
        } else {
            // Add or update edit
            const edit: TextEdit = {
                id: textItem.id,
                page: textItem.page,
                x: textItem.x,
                y: textItem.y,
                width: textItem.width,
                height: textItem.height,
                originalText: textItem.originalText,
                newText: newText,
                fontSize: textItem.fontSize,
            };

            setTextEdits((prev) => {
                const filtered = prev.filter((e) => e.id !== textItem.id);
                return [...filtered, edit];
            });
        }
    };

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
    const currentPageExtractedTexts = extractedTexts.filter(
        (t) => t.page === currentPage
    );

    // Get display text for an extracted item (shows edited version if exists)
    const getDisplayText = (item: ExtractedTextItem) => {
        const edit = textEdits.find((e) => e.id === item.id);
        return edit ? edit.newText : item.originalText;
    };

    // Check if text item has been edited
    const isTextEdited = (item: ExtractedTextItem) => {
        return textEdits.some((e) => e.id === item.id);
    };

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

            // Send text edits with scale info for coordinate conversion
            const textEditsForExport = textEdits.map((edit) => ({
                ...edit,
                scale: scale, // Include current scale for backend coordinate conversion
            }));
            formData.append("textEdits", JSON.stringify(textEditsForExport));

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
                        className={`px-2 py-1 rounded text-sm border ${tool === "edit" ? "bg-black text-white" : "bg-white"
                            }`}
                        onClick={() => setTool("edit")}
                    >
                        Edit Text
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
                        Add Text
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

            {/* Edit mode indicator */}
            {tool === "edit" && (
                <div className="text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded">
                    Click on any text in the PDF to edit it. Edited text will be highlighted in yellow.
                </div>
            )}

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

                    {/* Clickable text overlay for edit mode */}
                    {tool === "edit" && pageSize.width > 0 && (
                        <div
                            style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                width: pageSize.width,
                                height: pageSize.height,
                                pointerEvents: "auto",
                            }}
                        >
                            {currentPageExtractedTexts.map((item) => (
                                <div
                                    key={item.id}
                                    onClick={() => handleTextClick(item)}
                                    style={{
                                        position: "absolute",
                                        left: item.x,
                                        top: item.y,
                                        width: item.width,
                                        height: item.height,
                                        cursor: "pointer",
                                        backgroundColor: isTextEdited(item)
                                            ? "rgba(255, 255, 0, 0.3)"
                                            : "transparent",
                                        border: isTextEdited(item)
                                            ? "1px solid rgba(255, 200, 0, 0.5)"
                                            : "none",
                                        transition: "background-color 0.2s",
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = "rgba(0, 100, 255, 0.2)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = isTextEdited(item)
                                            ? "rgba(255, 255, 0, 0.3)"
                                            : "transparent";
                                    }}
                                    title={`Click to edit: "${getDisplayText(item)}"`}
                                />
                            ))}
                        </div>
                    )}

                    {pageSize.width > 0 && tool !== "edit" && (
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

                    {/* Show edited text overlays always */}
                    {pageSize.width > 0 && textEdits.filter(e => e.page === currentPage).length > 0 && (
                        <div
                            style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                width: pageSize.width,
                                height: pageSize.height,
                                pointerEvents: "none",
                            }}
                        >
                            {textEdits
                                .filter((e) => e.page === currentPage)
                                .map((edit) => (
                                    <div
                                        key={edit.id + "-overlay"}
                                        style={{
                                            position: "absolute",
                                            left: edit.x,
                                            top: edit.y,
                                            backgroundColor: "rgba(255, 255, 0, 0.3)",
                                            border: "1px dashed orange",
                                            padding: "1px 2px",
                                            fontSize: edit.fontSize * scale,
                                            lineHeight: 1,
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        {edit.newText}
                                    </div>
                                ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Status bar */}
            {textEdits.length > 0 && (
                <div className="text-sm text-gray-600 border-t pt-2">
                    {textEdits.length} text edit(s) pending. Click Export to apply changes.
                </div>
            )}
        </div>
    );
};
