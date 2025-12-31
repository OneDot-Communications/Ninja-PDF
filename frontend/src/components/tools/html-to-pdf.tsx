"use client";

import { useState } from "react";
import FileUploadHero from "../ui/file-upload-hero";
import { Button } from "../ui/button";
import { Download, FileText, Loader2, Plus, X } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface GeneratedPdf {
    id: string;
    name: string;
    pageCount: number;
    size: string;
    dataUrl: string;
    blob: Blob;
}

export function HtmlToPdfTool() {
    const [htmlFile, setHtmlFile] = useState<File | null>(null);
    const [htmlContent, setHtmlContent] = useState("");
    const [isConverting, setIsConverting] = useState(false);
    const [showConversionUI, setShowConversionUI] = useState(false);
    const [generatedPdfs, setGeneratedPdfs] = useState<GeneratedPdf[]>([]);
    const [quality, setQuality] = useState<"high" | "medium" | "low">("high");

    const handleFileSelected = async (files: File[]) => {
        if (files.length > 0) {
            const selectedFile = files[0];
            setHtmlFile(selectedFile);
            const text = await selectedFile.text();
            setHtmlContent(text);
            setShowConversionUI(true);
        }
    };

    const convertHtmlFileToPdf = async () => {
        if (!htmlContent || !htmlFile) return;

        setIsConverting(true);

        try {
            // Create a temporary div to render the HTML
            const tempDiv = document.createElement("div");
            tempDiv.innerHTML = htmlContent;
            tempDiv.style.position = "absolute";
            tempDiv.style.left = "-9999px";
            tempDiv.style.width = "800px";
            tempDiv.style.padding = "40px";
            tempDiv.style.backgroundColor = "#ffffff";
            document.body.appendChild(tempDiv);

            // Set scale based on quality
            const scaleMap = { high: 2, medium: 1.5, low: 1 };
            const scale = scaleMap[quality];

            // Capture the content using html2canvas
            const canvas = await html2canvas(tempDiv, {
                scale: scale,
                useCORS: true,
                logging: false,
                backgroundColor: "#ffffff",
            });

            // Remove the temporary div
            document.body.removeChild(tempDiv);

            // Create PDF
            const imgData = canvas.toDataURL("image/png");
            const pdf = new jsPDF({
                orientation: "portrait",
                unit: "pt",
                format: "a4",
            });

            const imgWidth = 595.28;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            const pageHeight = 841.89;
            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            while (heightLeft > 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            const pdfBlob = pdf.output("blob");
            const pdfDataUrl = URL.createObjectURL(pdfBlob);

            const pdfName = htmlFile.name.replace(".html", "") || "converted";

            const newPdf: GeneratedPdf = {
                id: Date.now().toString(),
                name: `${pdfName}.pdf`,
                pageCount: pdf.getNumberOfPages(),
                size: `${(pdfBlob.size / 1024).toFixed(0)} KB`,
                dataUrl: pdfDataUrl,
                blob: pdfBlob,
            };

            setGeneratedPdfs(prev => [...prev, newPdf]);
        } catch (error) {
            console.error("Error converting to PDF:", error);
            alert("Failed to convert HTML to PDF. Please try again.");
        } finally {
            setIsConverting(false);
        }
    };

    const downloadPdf = (pdf: GeneratedPdf) => {
        const link = document.createElement("a");
        link.href = pdf.dataUrl;
        link.download = pdf.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const removeFile = () => {
        setHtmlFile(null);
        setHtmlContent("");
        setGeneratedPdfs([]);
        setShowConversionUI(false);
    };

    const clearAll = () => {
        generatedPdfs.forEach(pdf => URL.revokeObjectURL(pdf.dataUrl));
        removeFile();
    };

    // Show file upload screen until file is selected
    if (!showConversionUI) {
        return (
            <div className="min-h-[calc(100vh-120px)] flex items-center justify-center relative">
                <FileUploadHero
                    title="HTML to PDF"
                    onFilesSelected={handleFileSelected}
                    maxFiles={1}
                    accept={{ "text/html": [".html"] }}
                />
            </div>
        );
    }

    // Show conversion UI after file upload
    return (
        <div className="flex h-[calc(100vh-120px)] gap-6 p-6">
            {/* Left Side - File View */}
            <div className="flex-1 flex flex-col">
                {/* Tabs */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex bg-white rounded-lg border border-gray-200 shadow-sm">
                        <button className="px-5 py-2.5 text-sm font-medium text-blue-600 bg-white rounded-lg border-r border-gray-200">
                            File View
                        </button>
                        <button className="px-5 py-2.5 text-sm font-medium text-gray-500 rounded-lg">
                            Page View
                        </button>
                    </div>

                    {generatedPdfs.length === 0 && (
                        <Button variant="outline" onClick={clearAll} className="text-gray-600">
                            <FileText className="w-4 h-4 mr-2" />
                            Clear All
                        </Button>
                    )}
                </div>

                <div className="flex-1 bg-gray-50 rounded-lg p-6 overflow-auto">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {/* HTML File Card */}
                        <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow relative group">
                            <button
                                onClick={removeFile}
                                className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-600"
                            >
                                <X className="w-4 h-4" />
                            </button>

                            <div className="absolute -top-2 -left-2 w-7 h-7 bg-gray-800 text-white rounded-full flex items-center justify-center text-xs font-semibold shadow-md">
                                1
                            </div>

                            <div className="aspect-[3/4] bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg mb-3 flex items-center justify-center border border-orange-200">
                                <FileText className="w-16 h-16 text-orange-400" />
                            </div>

                            <h4 className="text-sm font-semibold text-gray-900 truncate mb-1">
                                {htmlFile?.name}
                            </h4>
                            <p className="text-xs text-gray-500">
                                {(htmlFile?.size ? htmlFile.size / 1024 : 0).toFixed(0)} KB
                            </p>
                        </div>

                        {/* Generated PDFs */}
                        {generatedPdfs.map((pdf, index) => (
                            <div
                                key={pdf.id}
                                className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer relative"
                                onClick={() => downloadPdf(pdf)}
                            >
                                <div className="absolute -top-2 -left-2 w-7 h-7 bg-gray-800 text-white rounded-full flex items-center justify-center text-xs font-semibold shadow-md">
                                    {index + 2}
                                </div>

                                <div className="aspect-[3/4] bg-gradient-to-br from-red-50 to-red-100 rounded-lg mb-3 flex items-center justify-center border border-red-200">
                                    <FileText className="w-16 h-16 text-red-400" />
                                </div>

                                <h4 className="text-sm font-semibold text-gray-900 truncate mb-1">
                                    {pdf.name}
                                </h4>
                                <p className="text-xs text-gray-500">
                                    {pdf.pageCount} {pdf.pageCount === 1 ? "Page" : "Pages"} • {pdf.size}
                                </p>
                            </div>
                        ))}

                        {/* Add More Files */}
                        <div className="border-2 border-dashed border-blue-300 rounded-lg bg-white hover:border-blue-400 transition-colors cursor-pointer flex flex-col items-center justify-center aspect-[3/4]">
                            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mb-3">
                                <Plus className="w-6 h-6 text-white" />
                            </div>
                            <p className="text-sm font-semibold text-blue-600">Add more files</p>
                            <p className="text-xs text-gray-400 mt-1">or drag & drop here</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Sidebar - File Summary */}
            <div className="w-80 bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-6">
                <div className="flex items-center gap-2 text-gray-800">
                    <FileText className="w-5 h-5" />
                    <h3 className="text-lg font-bold">File Summary</h3>
                </div>

                {/* File Count */}
                <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-100 rounded-lg">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-red-200">
                        <FileText className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-gray-900">1 HTML File</p>
                        <p className="text-xs text-gray-500">
                            {(htmlFile?.size ? htmlFile.size / 1024 : 0).toFixed(0)} KB
                        </p>
                    </div>
                </div>

                {/* Conversion Stats */}
                {generatedPdfs.length > 0 && (
                    <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Generated PDFs</span>
                            <span className="font-semibold text-gray-900">{generatedPdfs.length}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Total Pages</span>
                            <span className="font-semibold text-gray-900">
                                {generatedPdfs.reduce((sum, pdf) => sum + pdf.pageCount, 0)}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Total Size</span>
                            <span className="font-semibold text-green-600">
                                {generatedPdfs.reduce((sum, pdf) => sum + parseFloat(pdf.size), 0).toFixed(0)} KB
                            </span>
                        </div>
                    </div>
                )}

                <hr className="border-gray-200" />

                {/* Quality Settings */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <label className="text-sm font-semibold text-gray-700">Output Quality</label>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => setQuality("low")}
                            className={`flex-1 py-2.5 px-3 rounded-lg border text-xs font-medium transition-all ${quality === "low"
                                    ? "bg-blue-50 border-blue-500 text-blue-700"
                                    : "border-gray-300 text-gray-600 hover:bg-gray-50"
                                }`}
                        >
                            Smallest
                        </button>
                        <button
                            onClick={() => setQuality("medium")}
                            className={`flex-1 py-2.5 px-3 rounded-lg border text-xs font-medium transition-all ${quality === "medium"
                                    ? "bg-blue-50 border-blue-500 text-blue-700"
                                    : "border-gray-300 text-gray-600 hover:bg-gray-50"
                                }`}
                        >
                            Balanced
                        </button>
                        <button
                            onClick={() => setQuality("high")}
                            className={`flex-1 py-2.5 px-3 rounded-lg border text-xs font-medium transition-all ${quality === "high"
                                    ? "bg-blue-50 border-blue-500 text-blue-700"
                                    : "border-gray-300 text-gray-600 hover:bg-gray-50"
                                }`}
                        >
                            High Quality
                        </button>
                    </div>
                </div>

                {/* Convert Button */}
                <Button
                    onClick={convertHtmlFileToPdf}
                    disabled={isConverting || generatedPdfs.length > 0}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 text-base font-semibold shadow-md"
                >
                    {isConverting ? (
                        <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Converting...
                        </>
                    ) : generatedPdfs.length > 0 ? (
                        <>
                            <Download className="w-5 h-5 mr-2" />
                            Download PDF
                        </>
                    ) : (
                        <>
                            <FileText className="w-5 h-5 mr-2" />
                            CONVERT TO PDF
                        </>
                    )}
                </Button>

                {/* Privacy Note */}
                <p className="text-xs text-gray-400 text-center flex items-center justify-center gap-1.5">
                    <span className="text-gray-500">🔒</span>
                    Securely/Mac loopback file is open/own-based mode, you phantom.
                </p>
            </div>
        </div>
    );
}
