"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { saveAs } from "file-saver";
import { FileUpload } from "../ui/file-upload";
import { Button } from "../ui/button";
import {
    GitCompare,
    ZoomIn,
    ZoomOut,
    X,
    Download,
    FileText,
    Search,
    Link2,
    Link2Off
} from "lucide-react";
import { getPdfJs } from "@/lib/services/pdf-service";
import { toast } from "@/lib/hooks/use-toast";

interface TextChange {
    id: string;
    page: number;
    oldText: string;
    newText: string;
}

export function ComparePdfTool() {
    const [step, setStep] = useState<0 | 1 | 2>(0); // 0: Select File 1, 1: Select File 2, 2: Compare
    const [file1, setFile1] = useState<File | null>(null);
    const [file2, setFile2] = useState<File | null>(null);
    const [numPages1, setNumPages1] = useState(0);
    const [numPages2, setNumPages2] = useState(0);
    const [zoom, setZoom] = useState(40);
    const [isLoading, setIsLoading] = useState(false);
    const [scrollSync, setScrollSync] = useState(true);
    const [changes, setChanges] = useState<TextChange[]>([]);
    const [searchQuery, setSearchQuery] = useState("");

    const leftScrollRef = useRef<HTMLDivElement>(null);
    const rightScrollRef = useRef<HTMLDivElement>(null);
    const canvas1Refs = useRef<(HTMLCanvasElement | null)[]>([]);
    const canvas2Refs = useRef<(HTMLCanvasElement | null)[]>([]);
    const isScrolling = useRef(false);

    const handleScroll = useCallback((source: 'left' | 'right') => {
        if (!scrollSync || isScrolling.current) return;
        isScrolling.current = true;
        const sourceEl = source === 'left' ? leftScrollRef.current : rightScrollRef.current;
        const targetEl = source === 'left' ? rightScrollRef.current : leftScrollRef.current;
        if (sourceEl && targetEl) {
            targetEl.scrollTop = sourceEl.scrollTop;
        }
        setTimeout(() => { isScrolling.current = false; }, 50);
    }, [scrollSync]);

    const extractTexts = async (file: File): Promise<string[]> => {
        const pdfjsLib = await getPdfJs();
        const ab = await file.arrayBuffer();
        const pdf = await (pdfjsLib as any).getDocument(new Uint8Array(ab)).promise;
        const texts: string[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            texts.push(content.items.filter((x: any) => 'str' in x).map((x: any) => x.str).join(' ').trim());
        }
        return texts;
    };

    const findChanges = (t1: string[], t2: string[]): TextChange[] => {
        const result: TextChange[] = [];
        const max = Math.max(t1.length, t2.length);
        for (let i = 0; i < max; i++) {
            const old = (t1[i] || '').slice(0, 400);
            const neo = (t2[i] || '').slice(0, 400);
            if (old !== neo) {
                result.push({ id: `p${i}`, page: i + 1, oldText: old || '[Empty]', newText: neo || '[Empty]' });
            }
        }
        return result;
    };

    const processFiles = (files: File[]) => {
        if (files.length === 0) return;

        // Smart handling: if 2 files selected at step 0, take both
        if (step === 0 && files.length >= 2) {
            setFile1(files[0]);
            setFile2(files[1]);
            setStep(2);
            return;
        }

        if (step === 0) {
            setFile1(files[0]);
            setStep(1);
        } else if (step === 1) {
            setFile2(files[0]);
            setStep(2);
        }
    };

    // Load PDF1 when it's selected (step 1 or 2)
    useEffect(() => {
        if (step < 1 || !file1) return;
        const loadFile1 = async () => {
            try {
                const pdfjsLib = await getPdfJs();
                const ab1 = await file1.arrayBuffer();
                const pdf1 = await (pdfjsLib as any).getDocument(new Uint8Array(ab1)).promise;
                setNumPages1(pdf1.numPages);
                canvas1Refs.current = Array(pdf1.numPages).fill(null);
            } catch (e) {
                console.error(e);
                toast.show({ title: "Error", message: "Failed to load first PDF", variant: "error", position: "top-right" });
                setStep(0);
            }
        };
        loadFile1();
    }, [file1]);

    // Load PDF2 and compare when both files are ready
    useEffect(() => {
        if (step !== 2 || !file1 || !file2) return;
        const loadFile2AndCompare = async () => {
            setIsLoading(true);
            try {
                const pdfjsLib = await getPdfJs();
                const ab2 = await file2.arrayBuffer();
                const pdf2 = await (pdfjsLib as any).getDocument(new Uint8Array(ab2)).promise;
                setNumPages2(pdf2.numPages);
                canvas2Refs.current = Array(pdf2.numPages).fill(null);

                const [t1, t2] = await Promise.all([extractTexts(file1), extractTexts(file2)]);
                setChanges(findChanges(t1, t2));
            } catch (e) {
                console.error(e);
                toast.show({ title: "Error", message: "Failed to load second PDF", variant: "error", position: "top-right" });
                setFile2(null);
                setStep(1);
            } finally {
                setIsLoading(false);
            }
        };
        loadFile2AndCompare();
    }, [step, file2]);

    // Render PDF1 (when step >= 1)
    useEffect(() => {
        if (step < 1 || !file1 || numPages1 === 0) return;
        const renderFile1 = async () => {
            const pdfjsLib = await getPdfJs();
            const scale = zoom / 100;
            const ab1 = await file1.arrayBuffer();
            const pdf1 = await (pdfjsLib as any).getDocument(new Uint8Array(ab1)).promise;
            for (let i = 0; i < pdf1.numPages; i++) {
                const c = canvas1Refs.current[i];
                if (!c) continue;
                const p = await pdf1.getPage(i + 1);
                const vp = p.getViewport({ scale });
                c.width = vp.width;
                c.height = vp.height;
                c.style.maxWidth = "100%";
                c.style.height = "auto";
                await p.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
            }
        };
        const t = setTimeout(renderFile1, 150);
        return () => clearTimeout(t);
    }, [step, file1, numPages1, zoom]);

    // Render PDF2 (when step === 2)
    useEffect(() => {
        if (step !== 2 || !file2 || numPages2 === 0) return;
        const renderFile2 = async () => {
            const pdfjsLib = await getPdfJs();
            const scale = zoom / 100;
            const ab2 = await file2.arrayBuffer();
            const pdf2 = await (pdfjsLib as any).getDocument(new Uint8Array(ab2)).promise;
            for (let i = 0; i < pdf2.numPages; i++) {
                const c = canvas2Refs.current[i];
                if (!c) continue;
                const p = await pdf2.getPage(i + 1);
                const vp = p.getViewport({ scale });
                c.width = vp.width;
                c.height = vp.height;
                c.style.maxWidth = "100%";
                c.style.height = "auto";
                await p.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
            }
        };
        const t = setTimeout(renderFile2, 150);
        return () => clearTimeout(t);
    }, [step, file2, numPages2, zoom]);

    const downloadReport = () => {
        let r = `COMPARISON REPORT\n${'='.repeat(50)}\n\nFile 1: ${file1?.name}\nFile 2: ${file2?.name}\nChanges: ${changes.length}\n\n`;
        changes.forEach(c => { r += `[Page ${c.page}]\nOLD: ${c.oldText}\nNEW: ${c.newText}\n\n`; });
        saveAs(new Blob([r]), `report-${Date.now()}.txt`);
    };

    const filtered = searchQuery
        ? changes.filter(c => c.oldText.toLowerCase().includes(searchQuery.toLowerCase()) || c.newText.toLowerCase().includes(searchQuery.toLowerCase()))
        : changes;

    const reset = () => {
        setFile1(null);
        setFile2(null);
        setNumPages1(0);
        setNumPages2(0);
        setChanges([]);
        setStep(0);
    };

    // --- RENDER ---

    // Step 0: Initial file selection with nice centered header
    if (step === 0) {
        return (
            <div className="container mx-auto px-4 py-12 max-w-5xl">
                {/* Header Section */}
                <div className="text-center mb-12 space-y-4">
                    <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">
                        Compare PDF
                    </h1>
                    <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
                        Show a side-by-side document comparison and easily spot changes between different file versions.
                    </p>
                </div>

                {/* File Upload */}
                <div className="mx-auto max-w-2xl">
                    <FileUpload
                        onFilesSelected={processFiles}
                        maxFiles={2}
                        accept={{ "application/pdf": [".pdf"] }}
                        description="Select 2 PDF files to compare"
                    />
                </div>
            </div>
        );
    }

    // Step 1 & 2: Show comparison layout (iLovePDF style)
    // Left panel shows first PDF, center shows upload zone OR second PDF
    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 320px', height: 'calc(100vh - 80px)', background: '#f3f4f6' }}>
            {/* LEFT PANEL */}
            <div style={{ display: 'flex', flexDirection: 'column', background: 'white', borderRight: '2px solid #d1d5db' }}>
                <div style={{ height: 48, padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <button onClick={reset} style={{ padding: 6, borderRadius: 4, cursor: 'pointer', border: 'none', background: 'transparent' }}>
                        <X className="w-4 h-4 text-gray-500" />
                    </button>
                    <button
                        onClick={() => setScrollSync(!scrollSync)}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, cursor: 'pointer', border: 'none', fontSize: 13, fontWeight: 500, background: scrollSync ? '#dbeafe' : '#f3f4f6', color: scrollSync ? '#1d4ed8' : '#6b7280' }}
                    >
                        {scrollSync ? <Link2 className="w-4 h-4" /> : <Link2Off className="w-4 h-4" />}
                        Scroll sync
                    </button>
                    <div style={{ width: 32 }} />
                </div>
                <div ref={leftScrollRef} onScroll={() => handleScroll('left')} style={{ flex: 1, overflow: 'auto', padding: 24, background: '#e5e7eb' }}>
                    {isLoading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
                            <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent" />
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                            {Array.from({ length: numPages1 }).map((_, i) => (
                                <div key={i} style={{ boxShadow: '0 10px 25px rgba(0,0,0,0.15)', background: 'white' }}>
                                    <canvas ref={el => { canvas1Refs.current[i] = el; }} style={{ display: 'block' }} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div style={{ height: 40, padding: '0 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f9fafb', borderTop: '1px solid #e5e7eb', fontSize: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <select value={zoom} onChange={e => setZoom(Number(e.target.value))} style={{ padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12 }}>
                            {[25, 30, 40, 50, 60, 80, 100].map(z => <option key={z} value={z}>{z}%</option>)}
                        </select>
                        <button onClick={() => setZoom(Math.max(25, zoom - 10))} style={{ padding: 4, cursor: 'pointer', border: 'none', background: 'transparent' }}><ZoomOut className="w-4 h-4" /></button>
                        <button onClick={() => setZoom(Math.min(100, zoom + 10))} style={{ padding: 4, cursor: 'pointer', border: 'none', background: 'transparent' }}><ZoomIn className="w-4 h-4" /></button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#6b7280', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <FileText className="w-3 h-3" />{file1?.name}
                    </div>
                </div>
            </div>

            {/* CENTER PANEL - Upload zone or Second PDF */}
            <div style={{ display: 'flex', flexDirection: 'column', background: 'white', borderRight: '2px solid #d1d5db' }}>
                <div style={{ height: 48, padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    {file2 && (
                        <button onClick={() => { setFile2(null); setStep(1); setNumPages2(0); }} style={{ padding: 6, borderRadius: 4, cursor: 'pointer', border: 'none', background: 'transparent' }}>
                            <X className="w-4 h-4 text-gray-500" />
                        </button>
                    )}
                </div>

                {!file2 ? (
                    // Upload zone for second file (iLovePDF style)
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#f9fafb' }}>
                        <div style={{
                            width: '100%',
                            maxWidth: 300,
                            border: '2px dashed #d1d5db',
                            borderRadius: 12,
                            padding: 32,
                            textAlign: 'center',
                            background: 'white'
                        }}>
                            <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 16 }}>Drag and drop</p>
                            <p style={{ color: '#9ca3af', fontSize: 13, marginBottom: 16 }}>Or</p>
                            <FileUpload
                                onFilesSelected={processFiles}
                                maxFiles={1}
                                accept={{ "application/pdf": [".pdf"] }}
                                variant="compact"
                                size="sm"
                            />
                        </div>
                    </div>
                ) : (
                    // Second PDF Viewer
                    <>
                        <div ref={rightScrollRef} onScroll={() => handleScroll('right')} style={{ flex: 1, overflow: 'auto', padding: 24, background: '#e5e7eb' }}>
                            {isLoading ? (
                                <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
                                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent" />
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                                    {Array.from({ length: numPages2 }).map((_, i) => (
                                        <div key={i} style={{ boxShadow: '0 10px 25px rgba(0,0,0,0.15)', background: 'white' }}>
                                            <canvas ref={el => { canvas2Refs.current[i] = el; }} style={{ display: 'block' }} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div style={{ height: 40, padding: '0 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f9fafb', borderTop: '1px solid #e5e7eb', fontSize: 12 }}>
                            <span style={{ color: '#6b7280' }}>{zoom}%</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#6b7280', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                <FileText className="w-3 h-3" />{file2?.name}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* SIDEBAR */}
            <div style={{ display: 'flex', flexDirection: 'column', background: 'white' }}>
                <div style={{ padding: 16, borderBottom: '1px solid #e5e7eb' }}>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>Compare PDF</h2>
                </div>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 10, background: '#eff6ff', borderRadius: 8, color: '#1d4ed8' }}>
                        <GitCompare className="w-5 h-5" />
                        <span style={{ fontWeight: 500, fontSize: 14 }}>Semantic Text</span>
                    </div>
                </div>
                <div style={{ padding: '12px 16px', background: '#eff6ff', borderBottom: '1px solid #e5e7eb', color: '#1e40af', fontSize: 13 }}>
                    Compare text changes between two PDFs.
                </div>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>
                    <div style={{ position: 'relative' }}>
                        <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#9ca3af' }} />
                        <input type="text" placeholder="Search text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '8px 12px 8px 36px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, outline: 'none' }} />
                    </div>
                </div>
                <div style={{ padding: '12px 16px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#111827' }}>Change report ({filtered.length})</h3>
                </div>
                <div style={{ flex: 1, overflow: 'auto' }}>
                    {filtered.length === 0 ? (
                        <div style={{ padding: '40px 20px', textAlign: 'center', color: '#6b7280' }}>
                            <GitCompare style={{ width: 48, height: 48, margin: '0 auto 12px', color: '#d1d5db' }} />
                            <p style={{ fontWeight: 500, margin: 0 }}>No differences found</p>
                            <p style={{ fontSize: 13, marginTop: 4 }}>Documents appear identical</p>
                        </div>
                    ) : (
                        filtered.map(c => (
                            <div key={c.id} style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6' }}>
                                <div style={{ fontSize: 11, fontWeight: 500, color: '#6b7280', marginBottom: 8 }}>Page {c.page}</div>
                                <div style={{ marginBottom: 10 }}>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: '#dc2626', marginBottom: 4 }}>Old</div>
                                    <div style={{ fontSize: 12, padding: 8, background: '#fef2f2', borderLeft: '3px solid #ef4444', borderRadius: '0 4px 4px 0', color: '#991b1b', lineHeight: 1.4 }}>
                                        {c.oldText.length > 150 ? c.oldText.slice(0, 150) + '...' : c.oldText}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: '#16a34a', marginBottom: 4 }}>New</div>
                                    <div style={{ fontSize: 12, padding: 8, background: '#f0fdf4', borderLeft: '3px solid #22c55e', borderRadius: '0 4px 4px 0', color: '#166534', lineHeight: 1.4 }}>
                                        {c.newText.length > 150 ? c.newText.slice(0, 150) + '...' : c.newText}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                <div style={{ padding: 16, borderTop: '1px solid #e5e7eb' }}>
                    <Button onClick={downloadReport} disabled={changes.length === 0} className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3">
                        <Download className="w-5 h-5 mr-2" />
                        Download report
                    </Button>
                </div>
            </div>
        </div>
    );
}