"use client";

import { useState, useRef } from "react";
import { saveAs } from "file-saver";
import FileUploadHero from "../ui/file-upload-hero";
import { Button } from "../ui/button";
import { Lock, ShieldCheck, Eye, EyeOff, FileText, Plus } from "lucide-react";
import { toast } from "@/lib/hooks/use-toast";
import { getPdfJs } from "@/lib/services/pdf-service";
import { PDFDocument } from 'pdf-lib';
import { encryptPDF } from '@pdfsmaller/pdf-encrypt-lite';

interface FileMetadata {
    file: File;
    pageCount: number;
    size: string;
}

export function ProtectPdfTool() {
    const [files, setFiles] = useState<FileMetadata[]>([]);
    const [userPassword, setUserPassword] = useState("");
    const [ownerPassword, setOwnerPassword] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [showUserPassword, setShowUserPassword] = useState(false);
    const [showOwnerPassword, setShowOwnerPassword] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Permissions (inverted to "prevent" logic)
    const [preventPrinting, setPreventPrinting] = useState(false);
    const [preventCopying, setPreventCopying] = useState(true);
    const [preventModifying, setPreventModifying] = useState(true);

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
        return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    };

    const handleFileSelected = async (selectedFiles: File[]) => {
        const newFilesMetadata: FileMetadata[] = [];

        for (const file of selectedFiles) {
            try {
                const pdfjsLib = await getPdfJs();
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await (pdfjsLib as any).getDocument({
                    data: new Uint8Array(arrayBuffer),
                    verbosity: 0
                }).promise;

                newFilesMetadata.push({
                    file,
                    pageCount: pdf.numPages,
                    size: formatFileSize(file.size)
                });
            } catch (error) {
                console.error("Error loading PDF:", error);
                newFilesMetadata.push({
                    file,
                    pageCount: 0,
                    size: formatFileSize(file.size)
                });
            }
        }

        setFiles(prev => [...prev, ...newFilesMetadata]);
    };

    const handleFileClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const protectPdf = async () => {
        if (files.length === 0 || (!userPassword && !ownerPassword)) return;

        setIsProcessing(true);

        try {
            for (let i = 0; i < files.length; i++) {
                const fileMetadata = files[i];

                if (files.length > 1) {
                    toast.show({
                        title: "Encrypting",
                        message: `Encrypting ${i + 1} of ${files.length}: ${fileMetadata.file.name}`,
                        variant: "default",
                        position: "top-right",
                    });
                }

                // Load PDF with pdf-lib
                const arrayBuffer = await fileMetadata.file.arrayBuffer();
                const pdfDoc = await PDFDocument.load(arrayBuffer);

                // Save to bytes first
                const unencryptedBytes = await pdfDoc.save();

                // Apply encryption using pdf-encrypt-lite (RC4-128bit encryption)
                // Note: This library provides basic password encryption without granular permissions
                const encryptedBytes = await encryptPDF(
                    unencryptedBytes,
                    userPassword || '',
                    ownerPassword || userPassword || ''
                );

                // Create blob and download
                const blob = new Blob([encryptedBytes as any], { type: 'application/pdf' });
                const fileName = `protected-${fileMetadata.file.name}`;

                saveAs(blob, fileName);
            }

            toast.show({
                title: "Success",
                message: `${files.length} PDF${files.length > 1 ? 's' : ''} protected successfully!`,
                variant: "success",
                position: "top-right",
            });
        } catch (error: any) {
            console.error("Error protecting PDF:", error);

            let errorMessage = "Failed to protect PDF. Please try again.";
            if (error.message?.includes('encryption')) {
                errorMessage = "PDF encryption failed. The file may be corrupted or already encrypted.";
            } else if (error.message?.includes('corrupted') || error.message?.includes('Invalid PDF structure')) {
                errorMessage = "The PDF file appears to be corrupted. Try using the Repair PDF tool first.";
            }

            toast.show({
                title: "Protection Failed",
                message: errorMessage,
                variant: "error",
                position: "top-right",
            });
        } finally {
            setIsProcessing(false);
        }
    };

    if (files.length === 0) {
        return (
            <div className="min-h-[calc(100vh-120px)] flex items-center justify-center">
                <FileUploadHero
                    title="Protect PDF"
                    onFilesSelected={handleFileSelected}
                    maxFiles={1}
                    accept={{ "application/pdf": [".pdf"] }}
                />
            </div>
        );
    }

    return (
        <div className="bg-[#f6f7f8] min-h-screen pb-32 lg:pb-8 flex flex-row">
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col p-4 lg:p-8 lg:mr-[380px]">
                {/* Header */}
                <div className="flex items-center justify-between mb-6 lg:mb-8">
                    <div>
                        <div className="flex items-center gap-2 text-sm text-[#617289] mb-2">
                            <button className="hover:underline">File View</button>
                            <span>·</span>
                            <button className="text-gray-400">Page View</button>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="text-[#617289] hover:underline text-sm font-medium">Clear All</button>
                    </div>
                </div>

                {/* File Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
                    {files.map((fileMetadata, index) => (
                        <div key={index} className="flex flex-col gap-3">
                            {/* File Card */}
                            <div className="relative bg-white rounded-2xl shadow-sm border border-[#e2e8f0] p-4 lg:p-6 flex flex-col items-center justify-center h-40 lg:h-48">
                                <div className="absolute top-3 left-3 bg-gray-900 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                                    {index + 1}
                                </div>
                                <FileText className="h-12 w-12 lg:h-16 lg:w-16 text-[#4383BF] mb-2 lg:mb-3" />
                                <div className="text-center w-full">
                                    <h3 className="text-xs font-bold text-[#111418] truncate px-2">{fileMetadata.file.name}</h3>
                                    <p className="text-xs text-[#617289] mt-1">
                                        {fileMetadata.pageCount} {fileMetadata.pageCount === 1 ? 'Page' : 'Pages'} · {fileMetadata.size}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Add more files card */}
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={handleFileClick}
                            className="bg-white border-2 border-dashed border-[#e2e8f0] rounded-2xl h-40 lg:h-48 flex flex-col items-center justify-center gap-2 lg:gap-3 hover:border-[#4383BF] hover:bg-[#4383BF]/5 transition-all group"
                        >
                            <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-[#f1f5f9] flex items-center justify-center group-hover:bg-white group-hover:shadow-sm transition-all">
                                <Plus className="h-5 w-5 lg:h-6 lg:w-6 text-[#94a3b8] group-hover:text-[#4383BF]" />
                            </div>
                            <span className="text-[#94a3b8] font-bold text-xs lg:text-sm group-hover:text-[#4383BF]">Add more files</span>
                            <span className="text-[#cbd5e1] text-xs text-center group-hover:text-[#4383BF]/60 hidden lg:block">or drag & drop here</span>
                        </button>
                    </div>
                </div>

                {/* Mobile Password Section */}
                <div className="lg:hidden mt-6 bg-white rounded-2xl border border-[#e2e8f0] p-4">
                    <h3 className="text-[#111418] font-bold text-sm mb-3 flex items-center gap-2">
                        <Lock className="h-4 w-4 text-[#4383BF]" />
                        Set Password
                    </h3>
                    <div className="relative">
                        <input
                            type={showUserPassword ? "text" : "password"}
                            value={userPassword}
                            onChange={(e) => setUserPassword(e.target.value)}
                            className="w-full rounded-lg border border-[#e2e8f0] bg-white px-3 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-[#4383BF]"
                            placeholder="Enter password"
                        />
                        <button
                            type="button"
                            onClick={() => setShowUserPassword(!showUserPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#617289] hover:text-[#111418]"
                        >
                            {showUserPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                    <p className="text-[#617289] text-xs mt-2">Required to open and view the PDF file.</p>
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                            handleFileSelected(Array.from(e.target.files));
                        }
                    }}
                />
            </div>

            {/* Right Sidebar - Encrypt Settings (Desktop only) */}
            <div className="hidden lg:block w-[350px] fixed right-8 top-24 bottom-8 z-10">
                <div className="bg-white rounded-2xl shadow-xl border border-[#e2e8f0] p-6 h-full flex flex-col overflow-y-auto">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-[#111418] font-extrabold text-xl">Encrypt Settings</h2>
                        <button
                            onClick={() => {
                                setUserPassword("");
                                setPreventPrinting(false);
                                setPreventCopying(true);
                                setPreventModifying(true);
                            }}
                            className="text-[#4383BF] text-xs font-bold hover:underline"
                        >
                            Reset
                        </button>
                    </div>

                    {/* Set Password Section */}
                    <div className="mb-auto">
                        <div className="flex items-center gap-2 mb-4">
                            <Lock className="h-4 w-4 text-[#4383BF]" />
                            <h3 className="text-[#111418] font-bold text-sm">Set Password</h3>
                        </div>

                        {/* Password Field */}
                        <div className="mb-4">
                            <label className="block text-[#111418] text-xs font-medium mb-2">Password</label>
                            <div className="relative">
                                <input
                                    type={showUserPassword ? "text" : "password"}
                                    value={userPassword}
                                    onChange={(e) => setUserPassword(e.target.value)}
                                    className="w-full rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-[#4383BF]"
                                    placeholder="Enter password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowUserPassword(!showUserPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#617289] hover:text-[#111418]"
                                >
                                    {showUserPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            <p className="text-[#617289] text-xs mt-1">Required to open and view the PDF file.</p>
                        </div>

                        {/* Info Card */}
                        <div className="bg-[#4383BF]/5 border border-[#4383BF]/30 rounded-lg p-4 mb-4">
                            <div className="flex items-start gap-2">
                                <ShieldCheck className="h-5 w-5 text-[#4383BF] flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-[#111418] font-semibold text-sm mb-1">Basic Encryption</p>
                                    <p className="text-[#4383BF]/80 text-xs leading-relaxed">
                                        This tool uses RC4-128bit encryption to password-protect your PDF.
                                        The password will be required to open the file.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Download Button */}
                    <div className="mt-6">
                        <Button
                            onClick={protectPdf}
                            disabled={isProcessing || !userPassword}
                            className="w-full h-14 text-lg font-bold bg-[#4383BF] hover:bg-[#3470A0] text-white rounded-xl shadow-lg shadow-[#4383BF]/20 transition-all flex items-center justify-center gap-2"
                        >
                            {isProcessing ? "Processing..." : (
                                <>
                                    Download Document
                                    <Lock className="h-5 w-5" />
                                </>
                            )}
                        </Button>
                        <p className="text-[#94a3b8] text-xs text-center mt-4">
                            Your file is encrypted locally in your browser.
                        </p>
                    </div>
                </div>
            </div>

            {/* Mobile Fixed Bottom Button */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-50">
                <Button
                    onClick={protectPdf}
                    disabled={isProcessing || !userPassword}
                    className="w-full h-14 text-lg font-bold bg-[#4383BF] hover:bg-[#3470A0] text-white rounded-xl shadow-lg shadow-[#4383BF]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isProcessing ? "Processing..." : (
                        <>
                            Download Document
                            <Lock className="h-5 w-5" />
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
