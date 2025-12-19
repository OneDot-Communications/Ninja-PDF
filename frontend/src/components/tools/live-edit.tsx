"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Stage, Layer, Rect, Text as KonvaText, Line } from "react-konva";
import { v4 as uuidv4 } from "uuid";

type Tool = "select" | "highlight" | "underline" | "strikeout" | "rect" | "text" | "edit" | "eraser";

type Annotation = {
    id: string;
    page: number;
    x: number;
    y: number;
    width?: number;
    height?: number;
    text?: string;
    type: "rect" | "text" | "highlight" | "underline" | "strikeout";
    color?: string;
    fontSize?: number;
    fontFamily?: string;
};

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
    color?: string;
    isBold?: boolean;
    isItalic?: boolean;
};

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
    fontFamily: string;
    color?: string;
    isBold?: boolean;
    isItalic?: boolean;
};

type HistoryItem = {
    type: "add" | "remove" | "edit";
    data: Annotation | TextEdit;
    timestamp: number;
};

export const AdvancedPdfEditor: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const renderTaskRef = useRef<any>(null);
    const stageRef = useRef<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
    const [selectedColor, setSelectedColor] = useState<string>("#ffff00");
    const [selectedFont, setSelectedFont] = useState<string>("Helvetica");
    const [selectedFontSize, setSelectedFontSize] = useState<number>(12);

    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    const [extractedTexts, setExtractedTexts] = useState<ExtractedTextItem[]>([]);
    const [textEdits, setTextEdits] = useState<TextEdit[]>([]);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [historyIndex, setHistoryIndex] = useState<number>(-1);
    const [searchText, setSearchText] = useState<string>("");
    const [searchResults, setSearchResults] = useState<ExtractedTextItem[]>([]);
    const [currentSearchIndex, setCurrentSearchIndex] = useState<number>(0);

    const [isDrawing, setIsDrawing] = useState(false);
    const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
    const [currentShape, setCurrentShape] = useState<Annotation | null>(null);
    const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
    const [isEditingText, setIsEditingText] = useState<boolean>(false);
    const [editingTextId, setEditingTextId] = useState<string | null>(null);
    const [editingTextValue, setEditingTextValue] = useState<string>("");
    const [editingTextPosition, setEditingTextPosition] = useState<{ x: number; y: number } | null>(null);

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
                setExtractedTexts([]);
                setTextEdits([]);
                setAnnotations([]);
                setHistory([]);
                setHistoryIndex(-1);
                renderPage(pdf, 1, scale);
            } catch (error) {
                console.error("Error loading PDF:", error);
            }
        };

        loadPdf();

        return () => {
            if (fileUrl) URL.revokeObjectURL(fileUrl);
        };
    }, [fileUrl]);

    useEffect(() => {
        if (!pdfDoc) return;
        renderPage(pdfDoc, currentPage, scale);
    }, [currentPage, scale, pdfDoc]);

    useEffect(() => {
        if (!searchText.trim()) {
            setSearchResults([]);
            return;
        }

        const results = extractedTexts.filter(item =>
            item.originalText.toLowerCase().includes(searchText.toLowerCase())
        );
        setSearchResults(results);
        setCurrentSearchIndex(0);
    }, [searchText, extractedTexts]);

    const renderPage = async (pdf: any, pageNum: number, scaleValue: number) => {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: scaleValue });

        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext("2d");
        if (!context) return;

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

        await extractTextFromPage(page, pageNum, viewport);
    };

    const extractTextFromPage = async (page: any, pageNum: number, viewport: any) => {
        try {
            const textContent = await page.getTextContent();
            const items: ExtractedTextItem[] = [];

            for (const item of textContent.items) {
                if (!item.str || item.str.trim() === "") continue;

                const tx = item.transform;
                const fontSize = Math.sqrt(tx[0] * tx[0] + tx[1] * tx[1]);
                const [x, y] = viewport.convertToViewportPoint(tx[4], tx[5]);
                const width = item.width * viewport.scale;
                const height = item.height * viewport.scale;
                const fontName = item.fontName || "sans-serif";
                const isBold = fontName.includes("Bold");
                const isItalic = fontName.includes("Italic");

                items.push({
                    id: `text-${pageNum}-${items.length}`,
                    page: pageNum,
                    x: x,
                    y: y - height,
                    width: width,
                    height: height,
                    originalText: item.str,
                    fontSize: fontSize,
                    fontFamily: fontName,
                    color: item.color || "#000000",
                    isBold,
                    isItalic,
                });
            }

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
    const handleZoomReset = () => setScale(1.3);

    const handlePrevSearch = () => {
        if (searchResults.length === 0) return;
        setCurrentSearchIndex((prev) => (prev - 1 + searchResults.length) % searchResults.length);
    };

    const handleNextSearch = () => {
        if (searchResults.length === 0) return;
        setCurrentSearchIndex((prev) => (prev + 1) % searchResults.length);
    };

    const makeId = () => uuidv4();

    const addToHistory = useCallback((item: HistoryItem) => {
        setHistory((prev) => {
            const newHistory = prev.slice(0, historyIndex + 1);
            newHistory.push(item);
            return newHistory;
        });
        setHistoryIndex((prev) => prev + 1);
    }, [historyIndex]);

    const handleUndo = () => {
        if (historyIndex < 0) return;

        const item = history[historyIndex];
        if (item.type === "add") {
            if ("type" in item.data) {
                setAnnotations((prev) => prev.filter((a) => a.id !== item.data.id));
            } else {
                setTextEdits((prev) => prev.filter((t) => t.id !== item.data.id));
            }
        } else if (item.type === "remove") {
            if ("type" in item.data) {
                setAnnotations((prev) => [...prev, item.data as Annotation]);
            } else {
                setTextEdits((prev) => [...prev, item.data as TextEdit]);
            }
        }

        setHistoryIndex((prev) => prev - 1);
    };

    const handleRedo = () => {
        if (historyIndex >= history.length - 1) return;

        const item = history[historyIndex + 1];
        if (item.type === "add") {
            if ("type" in item.data) {
                setAnnotations((prev) => [...prev, item.data as Annotation]);
            } else {
                setTextEdits((prev) => [...prev, item.data as TextEdit]);
            }
        } else if (item.type === "remove") {
            if ("type" in item.data) {
                setAnnotations((prev) => prev.filter((a) => a.id !== item.data.id));
            } else {
                setTextEdits((prev) => prev.filter((t) => t.id !== item.data.id));
            }
        }

        setHistoryIndex((prev) => prev + 1);
    };

    const handleTextClick = (textItem: ExtractedTextItem) => {
        if (tool !== "edit") return;

        setSelectedTextId(textItem.id);
        setIsEditingText(true);
        setEditingTextId(textItem.id);
        setEditingTextValue(textItem.originalText);
        setEditingTextPosition({ x: textItem.x, y: textItem.y });
    };

    const handleTextEditSubmit = () => {
        if (!editingTextId || !editingTextPosition) return;

        const textItem = extractedTexts.find(t => t.id === editingTextId);
        if (!textItem) return;

        const existingEdit = textEdits.find((e) => e.id === textItem.id);

        if (editingTextValue === textItem.originalText) {
            if (existingEdit) {
                setTextEdits((prev) => prev.filter((e) => e.id !== textItem.id));
                addToHistory({
                    type: "remove",
                    data: existingEdit,
                    timestamp: Date.now(),
                });
            }
        } else {
            const edit: TextEdit = {
                id: textItem.id,
                page: textItem.page,
                x: textItem.x,
                y: textItem.y,
                width: textItem.width,
                height: textItem.height,
                originalText: textItem.originalText,
                newText: editingTextValue,
                fontSize: textItem.fontSize,
                fontFamily: textItem.fontFamily,
                color: textItem.color,
                isBold: textItem.isBold,
                isItalic: textItem.isItalic,
            };

            setTextEdits((prev) => {
                const filtered = prev.filter((e) => e.id !== textItem.id);
                return [...filtered, edit];
            });

            addToHistory({
                type: existingEdit ? "edit" : "add",
                data: edit,
                timestamp: Date.now(),
            });
        }

        setIsEditingText(false);
        setEditingTextId(null);
        setEditingTextValue("");
        setEditingTextPosition(null);
        setSelectedTextId(null);
    };

    const handleStageMouseDown = (e: any) => {
        if (tool === "select" || tool === "edit") return;

        const stage = e.target.getStage();
        const pointerPosition = stage.getPointerPosition();
        if (!pointerPosition) return;

        const { x, y } = pointerPosition;
        setStartPos({ x, y });
        setIsDrawing(true);

        if (tool === "text") {
            setIsDrawing(false);
            return;
        }

        const id = makeId();
        const newAnnotation: Annotation = {
            id,
            page: currentPage,
            x,
            y,
            width: 0,
            height: 0,
            type: tool as any,
            color: selectedColor,
        };

        setCurrentShape(newAnnotation);
    };

    const handleStageMouseMove = (e: any) => {
        if (!isDrawing || !startPos || !currentShape) return;

        const stage = e.target.getStage();
        const pointerPosition = stage.getPointerPosition();
        if (!pointerPosition) return;

        const { x, y } = pointerPosition;
        const width = x - startPos.x;
        const height = y - startPos.y;

        setCurrentShape({
            ...currentShape,
            width,
            height,
        });
    };

    const handleStageMouseUp = () => {
        if (!isDrawing || !currentShape) {
            setIsDrawing(false);
            setCurrentShape(null);
            return;
        }

        if (
            Math.abs(currentShape.width || 0) > 5 &&
            Math.abs(currentShape.height || 0) > 5
        ) {
            setAnnotations((prev) => [...prev, currentShape]);
            addToHistory({
                type: "add",
                data: currentShape,
                timestamp: Date.now(),
            });
        }

        setIsDrawing(false);
        setCurrentShape(null);
        setStartPos(null);
    };

    const handleStageClick = (e: any) => {
        if (tool !== "text") return;

        const stage = e.target.getStage();
        const pointerPosition = stage.getPointerPosition();
        if (!pointerPosition) return;

        const { x, y } = pointerPosition;

        const textInput = document.createElement("input");
        textInput.type = "text";
        textInput.style.position = "absolute";
        textInput.style.left = `${pointerPosition.x}px`;
        textInput.style.top = `${pointerPosition.y}px`;
        textInput.style.fontSize = `${selectedFontSize}px`;
        textInput.style.fontFamily = selectedFont;
        textInput.style.zIndex = "1000";
        textInput.style.backgroundColor = "white";
        textInput.style.border = "1px solid #ccc";
        textInput.style.padding = "2px";
        textInput.style.outline = "none";

        document.body.appendChild(textInput);
        textInput.focus();

        const handleTextSubmit = () => {
            const text = textInput.value;
            if (text.trim()) {
                const id = makeId();
                const newAnnotation: Annotation = {
                    id,
                    page: currentPage,
                    x,
                    y,
                    text,
                    type: "text",
                    color: "#000000",
                    fontSize: selectedFontSize,
                    fontFamily: selectedFont,
                };

                setAnnotations((prev) => [...prev, newAnnotation]);
                addToHistory({
                    type: "add",
                    data: newAnnotation,
                    timestamp: Date.now(),
                });
            }

            document.body.removeChild(textInput);
        };

        textInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                handleTextSubmit();
            } else if (e.key === "Escape") {
                document.body.removeChild(textInput);
            }
        });

        textInput.addEventListener("blur", handleTextSubmit);
    };

    const handleDeleteAnnotation = (id: string) => {
        const annotation = annotations.find(a => a.id === id);
        if (!annotation) return;

        setAnnotations((prev) => prev.filter((a) => a.id !== id));
        addToHistory({
            type: "remove",
            data: annotation,
            timestamp: Date.now(),
        });
    };

    const handleExport = async () => {
        if (!file) {
            alert("Upload a PDF first.");
            return;
        }

        try {
            const formData = new FormData();
            formData.append("file", file);

            // Separate annotations by type for backend
            const rectAnnotations = annotations.filter(a =>
                a.type === "rect" || a.type === "highlight" ||
                a.type === "underline" || a.type === "strikeout"
            );
            const textAnnotations = annotations.filter(a => a.type === "text");

            formData.append("rectAnnotations", JSON.stringify(rectAnnotations));
            formData.append("textAnnotations", JSON.stringify(textAnnotations));

            // Send text edits with scale info
            const textEditsForExport = textEdits.map((edit) => ({
                ...edit,
                scale: scale,
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
            a.download = file.name.replace(/\.pdf$/i, "") + "-edited.pdf";
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error(err);
            alert("Failed to export PDF. Check console for details.");
        }
    };

    const currentPageAnnotations = annotations.filter(
        (ann) => ann.page === currentPage
    );
    const currentPageExtractedTexts = extractedTexts.filter(
        (t) => t.page === currentPage
    );
    const currentPageTextEdits = textEdits.filter(
        (e) => e.page === currentPage
    );

    const getDisplayText = (item: ExtractedTextItem) => {
        const edit = textEdits.find((e) => e.id === item.id);
        return edit ? edit.newText : item.originalText;
    };

    const isTextEdited = (item: ExtractedTextItem) => {
        return textEdits.some((e) => e.id === item.id);
    };

    const isSearchResult = (item: ExtractedTextItem) => {
        return searchResults.some((r) => r.id === item.id);
    };

    const isCurrentSearchResult = (item: ExtractedTextItem) => {
        if (searchResults.length === 0) return false;
        return searchResults[currentSearchIndex]?.id === item.id;
    };

    return (
        <div className="flex flex-col gap-4 h-full">
            <div className="flex flex-wrap items-center gap-3 border-b pb-3">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    className="text-sm hidden"
                />
                <button
                    className="px-3 py-1 rounded border text-sm bg-blue-500 text-white"
                    onClick={() => fileInputRef.current?.click()}
                >
                    Open PDF
                </button>

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
                        className={`px-2 py-1 rounded text-sm border ${tool === "highlight" ? "bg-black text-white" : "bg-white"
                            }`}
                        onClick={() => setTool("highlight")}
                    >
                        Highlight
                    </button>
                    <button
                        className={`px-2 py-1 rounded text-sm border ${tool === "underline" ? "bg-black text-white" : "bg-white"
                            }`}
                        onClick={() => setTool("underline")}
                    >
                        Underline
                    </button>
                    <button
                        className={`px-2 py-1 rounded text-sm border ${tool === "strikeout" ? "bg-black text-white" : "bg-white"
                            }`}
                        onClick={() => setTool("strikeout")}
                    >
                        Strikeout
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
                    <button
                        className={`px-2 py-1 rounded text-sm border ${tool === "eraser" ? "bg-black text-white" : "bg-white"
                            }`}
                        onClick={() => setTool("eraser")}
                    >
                        Eraser
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
                    <button
                        className="px-2 py-1 rounded border text-sm"
                        onClick={handleZoomReset}
                    >
                        Reset
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
                        className="px-3 py-1 rounded border text-sm ml-4 bg-green-500 text-white"
                        onClick={handleExport}
                    >
                        Export
                    </button>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 border-b pb-3">
                {tool === "highlight" && (
                    <div className="flex items-center gap-2">
                        <span className="text-sm">Highlight Color:</span>
                        <input
                            type="color"
                            value={selectedColor}
                            onChange={(e) => setSelectedColor(e.target.value)}
                            className="w-8 h-8 border rounded"
                        />
                    </div>
                )}

                {tool === "text" && (
                    <div className="flex items-center gap-2">
                        <span className="text-sm">Font:</span>
                        <select
                            value={selectedFont}
                            onChange={(e) => setSelectedFont(e.target.value)}
                            className="px-2 py-1 border rounded text-sm"
                        >
                            <option value="Helvetica">Helvetica</option>
                            <option value="Times New Roman">Times New Roman</option>
                            <option value="Arial">Arial</option>
                            <option value="Courier New">Courier New</option>
                        </select>
                        <span className="text-sm">Size:</span>
                        <input
                            type="number"
                            min="8"
                            max="72"
                            value={selectedFontSize}
                            onChange={(e) => setSelectedFontSize(Number(e.target.value))}
                            className="w-16 px-2 py-1 border rounded text-sm"
                        />
                    </div>
                )}

                <div className="flex items-center gap-2 ml-auto">
                    <button
                        className="px-2 py-1 rounded border text-sm"
                        onClick={handleUndo}
                        disabled={historyIndex < 0}
                    >
                        Undo
                    </button>
                    <button
                        className="px-2 py-1 rounded border text-sm"
                        onClick={handleRedo}
                        disabled={historyIndex >= history.length - 1}
                    >
                        Redo
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-2 border-b pb-3">
                <input
                    type="text"
                    placeholder="Search in document..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="flex-1 px-3 py-1 border rounded text-sm"
                />
                <button
                    className="px-2 py-1 rounded border text-sm"
                    onClick={handlePrevSearch}
                    disabled={searchResults.length === 0}
                >
                    Prev
                </button>
                <span className="text-sm">
                    {searchResults.length > 0 ? `${currentSearchIndex + 1} / ${searchResults.length}` : "0 results"}
                </span>
                <button
                    className="px-2 py-1 rounded border text-sm"
                    onClick={handleNextSearch}
                    disabled={searchResults.length === 0}
                >
                    Next
                </button>
            </div>

            {tool === "edit" && (
                <div className="text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded">
                    Click on any text in the PDF to edit it. Edited text will be highlighted in yellow.
                </div>
            )}

            <div className="flex-1 overflow-auto">
                <div
                    style={{
                        position: "relative",
                        display: "inline-block",
                        border: "1px solid #e5e7eb",
                    }}
                >
                    <canvas ref={canvasRef} />

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
                                            : isSearchResult(item)
                                                ? isCurrentSearchResult(item)
                                                    ? "rgba(255, 0, 0, 0.3)"
                                                    : "rgba(0, 0, 255, 0.2)"
                                                : "transparent",
                                        border: isTextEdited(item)
                                            ? "1px solid rgba(255, 200, 0, 0.5)"
                                            : isCurrentSearchResult(item)
                                                ? "1px solid rgba(255, 0, 0, 0.5)"
                                                : "none",
                                        transition: "background-color 0.2s",
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isTextEdited(item) && !isSearchResult(item)) {
                                            e.currentTarget.style.backgroundColor = "rgba(0, 100, 255, 0.2)";
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isTextEdited(item) && !isSearchResult(item)) {
                                            e.currentTarget.style.backgroundColor = "transparent";
                                        }
                                    }}
                                    title={`Click to edit: "${getDisplayText(item)}"`}
                                />
                            ))}
                        </div>
                    )}

                    {isEditingText && editingTextPosition && (
                        <div
                            style={{
                                position: "absolute",
                                left: editingTextPosition.x,
                                top: editingTextPosition.y,
                                zIndex: 1000,
                            }}
                        >
                            <input
                                type="text"
                                value={editingTextValue}
                                onChange={(e) => setEditingTextValue(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        handleTextEditSubmit();
                                    } else if (e.key === "Escape") {
                                        setIsEditingText(false);
                                        setEditingTextId(null);
                                        setEditingTextValue("");
                                        setEditingTextPosition(null);
                                        setSelectedTextId(null);
                                    }
                                }}
                                onBlur={handleTextEditSubmit}
                                autoFocus
                                style={{
                                    fontSize: `${selectedFontSize}px`,
                                    fontFamily: selectedFont,
                                    border: "1px solid #ccc",
                                    padding: "2px",
                                    outline: "none",
                                    minWidth: "200px",
                                }}
                            />
                        </div>
                    )}

                    {pageSize.width > 0 && (
                        <Stage
                            ref={stageRef}
                            width={pageSize.width}
                            height={pageSize.height}
                            style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                pointerEvents: tool === "edit" ? "none" : "auto",
                            }}
                            onMouseDown={handleStageMouseDown}
                            onMouseMove={handleStageMouseMove}
                            onMouseUp={handleStageMouseUp}
                            onClick={handleStageClick}
                        >
                            <Layer>
                                {currentPageAnnotations.map((ann) => {
                                    if (ann.type === "rect") {
                                        return (
                                            <Rect
                                                key={ann.id}
                                                x={ann.width && ann.width >= 0 ? ann.x : ann.x + (ann.width || 0)}
                                                y={ann.height && ann.height >= 0 ? ann.y : ann.y + (ann.height || 0)}
                                                width={Math.abs(ann.width || 0)}
                                                height={Math.abs(ann.height || 0)}
                                                stroke={ann.color || "red"}
                                                strokeWidth={2}
                                                dash={[4, 4]}
                                                onClick={() => tool === "eraser" && handleDeleteAnnotation(ann.id)}
                                            />
                                        );
                                    } else if (ann.type === "highlight") {
                                        return (
                                            <Rect
                                                key={ann.id}
                                                x={ann.width && ann.width >= 0 ? ann.x : ann.x + (ann.width || 0)}
                                                y={ann.height && ann.height >= 0 ? ann.y : ann.y + (ann.height || 0)}
                                                width={Math.abs(ann.width || 0)}
                                                height={Math.abs(ann.height || 0)}
                                                fill={ann.color || "#ffff00"}
                                                opacity={0.3}
                                                onClick={() => tool === "eraser" && handleDeleteAnnotation(ann.id)}
                                            />
                                        );
                                    } else if (ann.type === "underline") {
                                        return (
                                            <Line
                                                key={ann.id}
                                                points={[
                                                    ann.width && ann.width >= 0 ? ann.x : ann.x + (ann.width || 0),
                                                    ann.height && ann.height >= 0 ? ann.y + (ann.height || 0) : ann.y,
                                                    ann.width && ann.width >= 0 ? ann.x + (ann.width || 0) : ann.x,
                                                    ann.height && ann.height >= 0 ? ann.y + (ann.height || 0) : ann.y,
                                                ]}
                                                stroke={ann.color || "blue"}
                                                strokeWidth={2}
                                                onClick={() => tool === "eraser" && handleDeleteAnnotation(ann.id)}
                                            />
                                        );
                                    } else if (ann.type === "strikeout") {
                                        return (
                                            <Line
                                                key={ann.id}
                                                points={[
                                                    ann.width && ann.width >= 0 ? ann.x : ann.x + (ann.width || 0),
                                                    ann.height && ann.height >= 0 ? ann.y + (ann.height || 0) / 2 : ann.y,
                                                    ann.width && ann.width >= 0 ? ann.x + (ann.width || 0) : ann.x,
                                                    ann.height && ann.height >= 0 ? ann.y + (ann.height || 0) / 2 : ann.y,
                                                ]}
                                                stroke={ann.color || "red"}
                                                strokeWidth={2}
                                                onClick={() => tool === "eraser" && handleDeleteAnnotation(ann.id)}
                                            />
                                        );
                                    } else if (ann.type === "text" && ann.text) {
                                        return (
                                            <KonvaText
                                                key={ann.id}
                                                x={ann.x}
                                                y={ann.y}
                                                text={ann.text}
                                                fontSize={ann.fontSize || 14}
                                                fontFamily={ann.fontFamily || "Arial"}
                                                fill={ann.color || "#000000"}
                                                onClick={() => tool === "eraser" && handleDeleteAnnotation(ann.id)}
                                            />
                                        );
                                    }
                                    return null;
                                })}

                                {currentShape && currentShape.page === currentPage && (
                                    <>
                                        {currentShape.type === "rect" && (
                                            <Rect
                                                x={currentShape.width && currentShape.width >= 0 ? currentShape.x : currentShape.x + (currentShape.width || 0)}
                                                y={currentShape.height && currentShape.height >= 0 ? currentShape.y : currentShape.y + (currentShape.height || 0)}
                                                width={Math.abs(currentShape.width || 0)}
                                                height={Math.abs(currentShape.height || 0)}
                                                stroke={currentShape.color || "red"}
                                                strokeWidth={2}
                                                dash={[4, 4]}
                                            />
                                        )}
                                        {currentShape.type === "highlight" && (
                                            <Rect
                                                x={currentShape.width && currentShape.width >= 0 ? currentShape.x : currentShape.x + (currentShape.width || 0)}
                                                y={currentShape.height && currentShape.height >= 0 ? currentShape.y : currentShape.y + (currentShape.height || 0)}
                                                width={Math.abs(currentShape.width || 0)}
                                                height={Math.abs(currentShape.height || 0)}
                                                fill={currentShape.color || "#ffff00"}
                                                opacity={0.3}
                                            />
                                        )}
                                        {currentShape.type === "underline" && (
                                            <Line
                                                points={[
                                                    currentShape.width && currentShape.width >= 0 ? currentShape.x : currentShape.x + (currentShape.width || 0),
                                                    currentShape.height && currentShape.height >= 0 ? currentShape.y + (currentShape.height || 0) : currentShape.y,
                                                    currentShape.width && currentShape.width >= 0 ? currentShape.x + (currentShape.width || 0) : currentShape.x,
                                                    currentShape.height && currentShape.height >= 0 ? currentShape.y + (currentShape.height || 0) : currentShape.y,
                                                ]}
                                                stroke={currentShape.color || "blue"}
                                                strokeWidth={2}
                                            />
                                        )}
                                        {currentShape.type === "strikeout" && (
                                            <Line
                                                points={[
                                                    currentShape.width && currentShape.width >= 0 ? currentShape.x : currentShape.x + (currentShape.width || 0),
                                                    currentShape.height && currentShape.height >= 0 ? currentShape.y + (currentShape.height || 0) / 2 : currentShape.y,
                                                    currentShape.width && currentShape.width >= 0 ? currentShape.x + (currentShape.width || 0) : currentShape.x,
                                                    currentShape.height && currentShape.height >= 0 ? currentShape.y + (currentShape.height || 0) / 2 : currentShape.y,
                                                ]}
                                                stroke={currentShape.color || "red"}
                                                strokeWidth={2}
                                            />
                                        )}
                                    </>
                                )}
                            </Layer>
                        </Stage>
                    )}

                    {pageSize.width > 0 && currentPageTextEdits.length > 0 && (
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
                            {currentPageTextEdits.map((edit) => (
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
                                        fontFamily: edit.fontFamily,
                                        fontWeight: edit.isBold ? "bold" : "normal",
                                        fontStyle: edit.isItalic ? "italic" : "normal",
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

            {(textEdits.length > 0 || annotations.length > 0) && (
                <div className="text-sm text-gray-600 border-t pt-2">
                    {textEdits.length} text edit(s) and {annotations.length} annotation(s) pending. Click Export to apply changes.
                </div>
            )}
        </div>
    );
};