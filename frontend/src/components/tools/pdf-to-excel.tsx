"use client";

import { useState } from "react";
import FileUploadHero from "../ui/file-upload-hero";
import { Button } from "../ui/button";
import { 
    FileSpreadsheet, 
    Loader2, 
    ZoomIn, 
    ZoomOut,
    Download,
    FileText,
    TableProperties,
    Table
} from "lucide-react";
import { Label } from "../ui/label";
import { saveAs } from "file-saver";
import { pdfApi } from "@/lib/services/pdf-api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function PdfToExcelTool() {
    const [files, setFiles] = useState<File[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [previews, setPreviews] = useState<Array<{ pageNumber: number; image: string; width: number; height: number }>>([]);
    const [pageCount, setPageCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [zoom, setZoom] = useState(100);
    
    // Options
    const [outputFormat, setOutputFormat] = useState<'xlsx' | 'csv'>('xlsx');
    const [sheetOrganization, setSheetOrganization] = useState<'merge' | 'separate'>('merge');

    const handleFilesSelected = async (newFiles: File[]) => {
        setFiles(newFiles);
        setCurrentPage(1);
        if (newFiles.length > 0) {
            loadPreview(newFiles[0]);
        }
    };

    const loadPreview = async (file: File) => {
        try {
            const result = await pdfApi.getPagePreviews(file);
            if (result.previews && result.previews.length > 0) {
                setPreviews(result.previews);
                setPageCount(result.totalPages);
            }
        } catch (error) {
            console.error("Failed to load preview", error);
            toast.error("Failed to load PDF preview");
        }
    };

    const convert = async () => {
        if (files.length === 0) return;
        setIsProcessing(true);
        
        try {
            const result = await pdfApi.pdfToExcel(files[0], {
                mergeSheets: sheetOrganization === 'merge',
                outputFormat: outputFormat
            });

            saveAs(result.blob, result.fileName);
            toast.success("File converted successfully!");

        } catch (error) {
            console.error("Conversion Error:", error);
            toast.error("Failed to convert PDF to Excel.");
        } finally {
            setIsProcessing(false);
        }
    };

    const getCurrentPreview = () => {
        return previews.find(p => p.pageNumber === currentPage);
    };

    if (files.length === 0) {
        return (
            <div className="min-h-[calc(100vh-120px)] flex items-center justify-center">
                <FileUploadHero
                    title="PDF to Excel"
                    description="Convert PDF tables to editable Excel spreadsheets"
                    onFilesSelected={handleFilesSelected}
                    maxFiles={1}
                    accept={{ "application/pdf": [".pdf"] }}
                />
            </div>
        );
    }

    return (
        <div className="flex h-[calc(100vh-100px)] bg-[#f6f7f8]">
            {/* Left Sidebar - Thumbnails */}
            <div className="w-24 bg-white border-r border-gray-200 flex flex-col items-center py-4 gap-4 overflow-y-auto">
                {previews.map((preview, i) => (
                    <div 
                        key={i}
                        className={cn(
                            "w-14 h-20 rounded-lg border flex items-center justify-center cursor-pointer transition-all overflow-hidden relative",
                            currentPage === preview.pageNumber 
                                ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200" 
                                : "border-gray-200 bg-white hover:bg-gray-50"
                        )}
                        onClick={() => setCurrentPage(preview.pageNumber)}
                    >
                        {preview.image ? (
                            <img 
                                src={preview.image.startsWith('data:') ? preview.image : `data:image/png;base64,${preview.image}`}
                                alt={`Page ${preview.pageNumber}`}
                                className="w-full h-full object-contain"
                            />
                        ) : (
                            <FileText className={cn("h-6 w-6", currentPage === preview.pageNumber ? "text-blue-500" : "text-gray-400")} />
                        )}
                        <span className="absolute bottom-0 left-0 right-0 text-center text-[10px] font-medium bg-white/80 text-gray-700">
                            {preview.pageNumber}
                        </span>
                    </div>
                ))}
            </div>

            {/* Main Content - Preview */}
            <div className="flex-1 flex flex-col relative">
                {/* Top Toolbar */}
                <div className="h-14 bg-white/90 backdrop-blur-sm border-b border-gray-200 flex items-center justify-between px-6 absolute top-4 left-1/2 -translate-x-1/2 rounded-lg shadow-sm z-10 w-auto gap-4">
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-bold text-slate-700">Page {currentPage} of {pageCount || 1}</span>
                        <div className="h-4 w-px bg-gray-300" />
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom(z => Math.max(50, z - 10))}>
                                <ZoomOut className="h-4 w-4 text-slate-500" />
                            </Button>
                            <span className="text-sm font-medium text-slate-600 w-12 text-center">{zoom}%</span>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom(z => Math.min(200, z + 10))}>
                                <ZoomIn className="h-4 w-4 text-slate-500" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Preview Area */}
                <div className="flex-1 overflow-auto p-8 flex justify-center bg-[#f1f5f9]">
                    <div 
                        className="bg-white shadow-lg rounded-sm relative transition-transform duration-200 origin-top"
                        style={{ 
                            width: `${800 * (zoom / 100)}px`, 
                            height: `${1131 * (zoom / 100)}px`,
                            minHeight: '1131px'
                        }}
                    >
                        {getCurrentPreview() ? (
                            <img 
                                src={getCurrentPreview()!.image.startsWith('data:') 
                                    ? getCurrentPreview()!.image 
                                    : `data:image/png;base64,${getCurrentPreview()!.image}`
                                } 
                                alt={`Page {currentPage}`}
                                className="w-full h-full object-contain"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <Loader2 className="h-8 w-8 animate-spin" />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Right Sidebar - Settings */}
            <div className="w-[320px] bg-white border-l border-gray-200 flex flex-col">
                <div className="p-6 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-slate-900">Export Settings</h2>
                    <p className="text-sm text-slate-500 mt-1">Configure how you want your data served.</p>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* Output Format */}
                    <div className="space-y-3">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Output Format</Label>
                        <div className="bg-slate-50 p-1 rounded-xl flex">
                            <button
                                onClick={() => setOutputFormat('xlsx')}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all",
                                    outputFormat === 'xlsx' 
                                        ? "bg-white text-blue-600 shadow-sm" 
                                        : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                <TableProperties className="h-5 w-5" />
                                .XLSX (Excel)
                            </button>
                            <button
                                onClick={() => setOutputFormat('csv')}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all",
                                    outputFormat === 'csv' 
                                        ? "bg-white text-blue-600 shadow-sm" 
                                        : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                <FileSpreadsheet className="h-5 w-5" />
                                .CSV
                            </button>
                        </div>
                    </div>

                    {/* Sheet Organization */}
                    <div className="space-y-3">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sheet Organization</Label>
                        <div className="space-y-3">
                            <div 
                                onClick={() => setSheetOrganization('merge')}
                                className={cn(
                                    "relative p-4 rounded-xl border-2 cursor-pointer transition-all",
                                    sheetOrganization === 'merge'
                                        ? "border-blue-500 bg-blue-50/30"
                                        : "border-slate-200 hover:border-slate-300"
                                )}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={cn(
                                        "mt-1 w-5 h-5 rounded-full border flex items-center justify-center",
                                        sheetOrganization === 'merge' ? "border-blue-500" : "border-slate-300"
                                    )}>
                                        {sheetOrganization === 'merge' && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
                                    </div>
                                    <div>
                                        <div className="font-bold text-sm text-slate-900">Merge tables into one sheet</div>
                                        <div className="text-xs text-slate-500 mt-1 leading-relaxed">
                                            Combine extracted data from all pages into a single continuous worksheet.
                                        </div>
                                    </div>
                                </div>
                                {sheetOrganization === 'merge' && (
                                    <div className="absolute top-2 right-2 bg-blue-100 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded">
                                        RECOMMENDED
                                    </div>
                                )}
                            </div>

                            <div 
                                onClick={() => setSheetOrganization('separate')}
                                className={cn(
                                    "p-4 rounded-xl border-2 cursor-pointer transition-all",
                                    sheetOrganization === 'separate'
                                        ? "border-blue-500 bg-blue-50/30"
                                        : "border-slate-200 hover:border-slate-300"
                                )}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={cn(
                                        "mt-1 w-5 h-5 rounded-full border flex items-center justify-center",
                                        sheetOrganization === 'separate' ? "border-blue-500" : "border-slate-300"
                                    )}>
                                        {sheetOrganization === 'separate' && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
                                    </div>
                                    <div>
                                        <div className="font-bold text-sm text-slate-900">Create separate sheets</div>
                                        <div className="text-xs text-slate-500 mt-1 leading-relaxed">
                                            Keep page structure intact. One tab per PDF page.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Preview Data */}
                    <div className="space-y-3">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Preview Data</Label>
                        <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
                            <div className="flex items-center gap-2 text-slate-500 mb-3">
                                <Table className="h-4 w-4" />
                                <span className="text-xs">Extracting all tables from PDF</span>
                            </div>
                            <div className="space-y-2 opacity-60">
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className="h-2 bg-slate-300 rounded flex-1" />
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className="h-2 bg-slate-200 rounded flex-1" />
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className="h-2 bg-slate-200 rounded flex-1" />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-gray-100 bg-white">
                    <Button 
                        className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 rounded-xl"
                        onClick={convert}
                        disabled={isProcessing}
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Converting...
                            </>
                        ) : (
                            <>
                                Download Excel File
                                <Download className="ml-2 h-5 w-5" />
                            </>
                        )}
                    </Button>
                    <p className="text-center text-xs text-slate-400 mt-3">
                        Crunching the numbers, hang tight...
                    </p>
                </div>
            </div>
        </div>
    );
}
