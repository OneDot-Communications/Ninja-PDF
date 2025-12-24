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
    Check,
    Search,
    Link2,
    Link2Off,
    UploadCloud
} from "lucide-react";
import { getPdfJs } from "@/lib/services/pdf-service";
import { toast } from "@/lib/hooks/use-toast";
import { cn } from "@/lib/utils";

interface TextChange {
    id: string;
    page: number;
    oldText: string;
    newText: string;
}

export function ComparePdfTool({ onModeChange }: { onModeChange?: (mode: 'default' | 'editor') => void }) {
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

    // Mode synchronization
    useEffect(() => {
        if (step === 2) {
            onModeChange?.('editor');
        } else {
            onModeChange?.('default');
        }
    }, [step, onModeChange]);

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

    // Load and Analyze Effect
    useEffect(() => {
        if (step !== 2 || !file1 || !file2) return;
        const load = async () => {
            setIsLoading(true);
            try {
                const pdfjsLib = await getPdfJs();

                const ab1 = await file1.arrayBuffer();
                const pdf1 = await (pdfjsLib as any).getDocument(new Uint8Array(ab1)).promise;
                setNumPages1(pdf1.numPages);
                canvas1Refs.current = Array(pdf1.numPages).fill(null);

                const ab2 = await file2.arrayBuffer();
                const pdf2 = await (pdfjsLib as any).getDocument(new Uint8Array(ab2)).promise;
                setNumPages2(pdf2.numPages);
                canvas2Refs.current = Array(pdf2.numPages).fill(null);

                const [t1, t2] = await Promise.all([extractTexts(file1), extractTexts(file2)]);
                setChanges(findChanges(t1, t2));
            } catch (e) {
                console.error(e);
                toast.show({ title: "Error", message: "Failed to load PDFs", variant: "error", position: "top-right" });
                setStep(0); // Reset on error
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [step, file1, file2]);

    // Render Effect
    useEffect(() => {
        if (step !== 2 || !file1 || !file2 || numPages1 === 0 || numPages2 === 0) return;
        const render = async () => {
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
                // Add maxWidth/height auto to prevent overflow
                c.style.maxWidth = "100%";
                c.style.height = "auto";
                await p.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
            }

            const ab2 = await file2.arrayBuffer();
            const pdf2 = await (pdfjsLib as any).getDocument(new Uint8Array(ab2)).promise;
            for (let i = 0; i < pdf2.numPages; i++) {
                const c = canvas2Refs.current[i];
                if (!c) continue;
                const p = await pdf2.getPage(i + 1);
                const vp = p.getViewport({ scale });
                c.width = vp.width;
                c.height = vp.height;
                // Add maxWidth/height auto to prevent overflow
                c.style.maxWidth = "100%";
                c.style.height = "auto";
                await p.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
            }
        };
        const t = setTimeout(render, 150);
        return () => clearTimeout(t);
    }, [step, file1, file2, numPages1, numPages2, zoom]);

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

    // Native File Handling
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleNativeFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            processFiles(Array.from(e.target.files));
        }
        // Reset value to allow selecting same file again if needed
        if (e.target) e.target.value = '';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const pdfs = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
            if (pdfs.length > 0) {
                processFiles(pdfs);
            } else {
                toast.show({ title: "Invalid File", message: "Please upload PDF files only.", variant: "error", position: "top-right" });
            }
        }
    };

    const triggerFileSelect = () => {
        fileInputRef.current?.click();
    };

    // --- RENDER ---

    // --- RENDER ---

    // Step 0 & 1: File Selection
    if (step === 0 || step === 1) {
        return (
            <div className="w-full">
                {step === 0 ? (
                    // STEP 0: First File
                    <div
                        className={cn(
                            "group relative flex flex-col items-center justify-center min-h-[250px] w-full rounded-xl border-2 border-dashed border-slate-200 bg-white/50 hover:bg-white/80 transition-all cursor-pointer",
                            isDragging && "border-blue-500 bg-blue-50 scale-[1.01]"
                        )}
                    // Visual drag feedback only - actual drop handled by input
                    >
                        {/* ABSOLUTE OVERLAY INPUT - THE "MAGIC" FIX */}
                        <input
                            type="file"
                            accept=".pdf,application/pdf"
                            multiple={true}
                            onChange={handleNativeFileSelect}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50"
                            onDragEnter={() => setIsDragging(true)}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={() => setIsDragging(false)}
                            title=""
                        />

                        <div className="flex flex-col items-center justify-center p-6 text-center pointer-events-none">
                            <div className="mb-4 p-4 bg-blue-50 text-blue-600 rounded-full group-hover:scale-110 transition-transform duration-300 shadow-sm">
                                <GitCompare className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">Select PDF files to compare</h3>
                            <p className="text-slate-500 mb-6 max-w-sm">Drag and drop your files here, or click to browse</p>
                            <Button size="lg" className="h-12 px-8 bg-[#0057B7] hover:bg-[#004494] text-white shadow-lg rounded-full font-bold">
                                Select PDF files
                            </Button>
                        </div>
                    </div>
                ) : (
                    // STEP 1: Second File
                    <div
                        className={cn(
                            "group relative flex flex-col items-center justify-center min-h-[250px] w-full rounded-xl border-2 border-dashed border-slate-200 bg-white/50 hover:bg-white/80 transition-all cursor-pointer",
                            isDragging && "border-blue-500 bg-blue-50 scale-[1.01]"
                        )}
                    >
                        {/* ABSOLUTE OVERLAY INPUT */}
                        <input
                            type="file"
                            accept=".pdf,application/pdf"
                            multiple={false}
                            onChange={handleNativeFileSelect}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50"
                            onDragEnter={() => setIsDragging(true)}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={() => setIsDragging(false)}
                            title=""
                        />

                        <div className="flex flex-col items-center justify-center p-6 text-center pointer-events-none">
                            <div className="mb-4 p-4 bg-purple-50 text-purple-600 rounded-full group-hover:scale-110 transition-transform duration-300 shadow-sm">
                                <UploadCloud className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">Select the second PDF</h3>
                            <p className="text-slate-500 mb-6 max-w-sm">Upload the modified version to compare</p>
                            <Button size="lg" className="h-12 px-8 bg-[#0057B7] hover:bg-[#004494] text-white shadow-lg rounded-full font-bold">
                                Select Second File
                            </Button>
                        </div>
                    </div>
                )}

                {/* File Status Cards */}
                {(file1 || file2) && (
                    <div className="mt-8 grid grid-cols-2 gap-6">
                        {/* File 1 Status */}
                        <div className="p-4 rounded-xl border border-green-200 bg-green-50 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                                <FileText className="w-24 h-24 text-green-600" />
                            </div>
                            <div className="flex items-center gap-3 relative z-10">
                                <div className="p-2 bg-white rounded-lg shadow-sm">
                                    <FileText className="w-6 h-6 text-green-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-0.5">Original File</p>
                                    <p className="text-sm font-medium text-slate-900 truncate">{file1 ? file1.name : "Waiting..."}</p>
                                </div>
                                {file1 && <Check className="w-5 h-5 text-green-600" />}
                            </div>
                        </div>

                        {/* File 2 Status */}
                        <div className={cn(
                            "p-4 rounded-xl border shadow-sm relative overflow-hidden transition-all",
                            file2 ? "border-purple-200 bg-purple-50" : "border-slate-200 bg-slate-50 border-dashed"
                        )}>
                            <div className="absolute top-0 right-0 p-2 opacity-10">
                                <GitCompare className="w-24 h-24 text-purple-600" />
                            </div>
                            <div className="flex items-center gap-3 relative z-10">
                                <div className={cn("p-2 rounded-lg shadow-sm", file2 ? "bg-white" : "bg-slate-200")}>
                                    <GitCompare className={cn("w-6 h-6", file2 ? "text-purple-600" : "text-slate-400")} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={cn("text-xs font-semibold uppercase tracking-wider mb-0.5", file2 ? "text-purple-600" : "text-slate-500")}>Modified File</p>
                                    <p className="text-sm font-medium text-slate-900 truncate">{file2 ? file2.name : "Waiting for selection..."}</p>
                                </div>
                                {file2 && <Check className="w-5 h-5 text-purple-600" />}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Step 2: Comparison UI
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

            {/* RIGHT PANEL */}
            <div style={{ display: 'flex', flexDirection: 'column', background: 'white', borderRight: '2px solid #d1d5db' }}>
                <div style={{ height: 48, padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <button onClick={reset} style={{ padding: 6, borderRadius: 4, cursor: 'pointer', border: 'none', background: 'transparent' }}>
                        <X className="w-4 h-4 text-gray-500" />
                    </button>
                </div>
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