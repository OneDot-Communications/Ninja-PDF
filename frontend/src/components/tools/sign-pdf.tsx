"use client";

import { useState, useRef, useEffect } from "react";
import { saveAs } from "file-saver";
import FileUploadHero from "../ui/file-upload-hero";
import { Button } from "../ui/button";
import { PenTool, Trash2, Settings, Check, X, Move, Expand } from "lucide-react";
import { PdfPreview } from "../ui/pdf-preview";
import { pdfApi } from "@/lib/services/pdf-api";
import { toast } from "@/lib/hooks/use-toast";
import { cn, isPasswordError } from "@/lib/utils";
import { SignatureModal } from "./signature-modal";
import { PasswordProtectedModal } from "../ui/password-protected-modal";

export function SignPdfTool() {
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [signatureImage, setSignatureImage] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);

    // Interactive State
    const [position, setPosition] = useState<{ x: number, y: number }>({ x: 40, y: 40 }); // in percentages
    const [size, setSize] = useState<{ width: number, height: number }>({ width: 20, height: 10 }); // in percentages
    const [pageOption, setPageOption] = useState<"first" | "last" | "all">("first");

    // Dragging/Resizing Refs
    const containerRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);
    const isResizing = useRef(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const initialPos = useRef({ x: 0, y: 0 });
    const initialSize = useRef({ width: 0, height: 0 });

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelected = (files: File[]) => {
        if (files.length > 0) {
            setFile(files[0]);
            setIsModalOpen(true);
        }
    };

    const handlePdfError = (error: any) => {
        if (isPasswordError(error)) {
            setShowPasswordModal(true);
        }
    };

    const handleSignatureSave = (image: string | null) => {
        if (image) {
            setSignatureImage(image);
            setPosition({ x: 40, y: 40 });
            setSize({ width: 20, height: 10 });
        }
    };

    // --- Interaction Handlers ---

    const handleMouseDown = (e: React.MouseEvent) => {
        isDragging.current = true;
        dragStart.current = { x: e.clientX, y: e.clientY };
        initialPos.current = { ...position };
        e.preventDefault();
        e.stopPropagation();
    };

    const handleResizeMouseDown = (e: React.MouseEvent) => {
        isResizing.current = true;
        dragStart.current = { x: e.clientX, y: e.clientY };
        initialSize.current = { ...size };
        e.preventDefault();
        e.stopPropagation();
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!containerRef.current) return;
            const containerRect = containerRef.current.getBoundingClientRect();

            if (isDragging.current) {
                const deltaX = e.clientX - dragStart.current.x;
                const deltaY = e.clientY - dragStart.current.y;

                // Convert delta to percentage
                const deltaXPct = (deltaX / containerRect.width) * 100;
                const deltaYPct = (deltaY / containerRect.height) * 100;

                let newX = initialPos.current.x + deltaXPct;
                let newY = initialPos.current.y + deltaYPct;

                // Clamp
                newX = Math.max(0, Math.min(100 - size.width, newX));
                newY = Math.max(0, Math.min(100 - size.height, newY));

                setPosition({ x: newX, y: newY });
            } else if (isResizing.current) {
                const deltaX = e.clientX - dragStart.current.x;
                const deltaY = e.clientY - dragStart.current.y;

                // Convert delta to percentage
                const deltaXPct = (deltaX / containerRect.width) * 100;
                const deltaYPct = (deltaY / containerRect.height) * 100;

                let newWidth = initialSize.current.width + deltaXPct;
                let newHeight = initialSize.current.height + deltaYPct;

                // Clamp interactions
                newWidth = Math.max(5, Math.min(100 - position.x, newWidth));
                newHeight = Math.max(2, Math.min(100 - position.y, newHeight));

                setSize({ width: newWidth, height: newHeight });
            }
        };

        const handleMouseUp = () => {
            isDragging.current = false;
            isResizing.current = false;
        };

        if (signatureImage) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [signatureImage, size, position]);


    const signPdf = async () => {
        if (!file || !signatureImage) return;
        setIsProcessing(true);

        try {
            const result = await pdfApi.sign(file, {
                type: 'visual',
                signatureImage,
                customPosition: position,
                customSize: size,
                pageOption
            });

            saveAs(result.blob, result.fileName || `signed-${file.name}`);

            toast.show({
                title: "Success",
                message: "PDF signed successfully!",
                variant: "success",
                position: "top-right",
            });
        } catch (error) {
            console.error("Error signing PDF:", error);
            toast.show({
                title: "Operation Failed",
                message: "Failed to sign PDF. Please try again.",
                variant: "error",
                position: "top-right",
            });
        } finally {
            setIsProcessing(false);
        }
    };

    if (!file) {
        return (
            <>
                <div className="min-h-[calc(100vh-120px)] flex items-center justify-center">
                    <FileUploadHero
                        title="Sign PDF"
                        description="Upload a PDF to add your signature"
                        onFilesSelected={handleFileSelected}
                        maxFiles={1}
                        accept={{ "application/pdf": [".pdf"] }}
                    />
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                                handleFileSelected(Array.from(e.target.files));
                            }
                        }}
                    />
                </div>
                <PasswordProtectedModal
                    isOpen={showPasswordModal}
                    onClose={() => setShowPasswordModal(false)}
                    toolName="signing"
                />
            </>
        );
    }



    return (
        <>
            <div className="bg-[#f6f7f8] min-h-screen pb-8">
                <SignatureModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSignatureSave}
                />

                <div className="max-w-[1800px] mx-auto px-4 py-4">
                    <div className="flex flex-col lg:flex-row gap-6">
                        {/* Left Column - Preview */}
                        <div className="flex-1 lg:max-w-[calc(100%-448px)]">
                            {/* Top Bar */}
                            <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-[#e2e8f0] shadow-sm p-4 mb-6">
                                <div className="flex items-center justify-between flex-wrap gap-4">
                                    <h2 className="text-[#111418] font-bold text-lg leading-7 truncate max-w-[500px]">
                                        {file.name}
                                    </h2>
                                    <button
                                        onClick={() => setFile(null)}
                                        className="flex items-center gap-2 text-[#617289] hover:text-red-600 transition-colors px-3 py-2 rounded-lg hover:bg-red-50"
                                    >
                                        <X className="w-5 h-5" />
                                        <span className="text-sm font-bold">Change File</span>
                                    </button>
                                </div>
                            </div>

                            {/* Preview Area */}
                            <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden min-h-[600px] flex justify-center bg-muted/20">
                                {/* We no longer put ref={containerRef} here, we pass it down */}
                                <PdfPreview file={file} contentRef={containerRef} onError={handlePdfError}>
                                    {/* Signature Overlay Children */}
                                    {signatureImage && (
                                        <div
                                            className="absolute border-2 border-[#4383BF] bg-white/20 hover:bg-white/40 group cursor-move touch-none"
                                            style={{
                                                left: `${position.x}%`,
                                                top: `${position.y}%`,
                                                width: `${size.width}%`,
                                                height: `${size.height}%`,
                                                zIndex: 20
                                            }}
                                            onMouseDown={handleMouseDown}
                                        >
                                            <img
                                                src={signatureImage}
                                                alt="Signature"
                                                className="w-full h-full object-contain pointer-events-none"
                                            />

                                            {/* Resize Handle */}
                                            <div
                                                className="absolute bottom-0 right-0 w-6 h-6 bg-[#4383BF] rounded-tl-lg cursor-se-resize flex items-center justify-center text-white"
                                                onMouseDown={handleResizeMouseDown}
                                            >
                                                <Expand className="w-3 h-3" />
                                            </div>

                                            {/* Mobile Button / Action to Edit */}
                                            <div className="absolute -top-10 left-0 hidden group-hover:flex gap-1 bg-white p-1 rounded-lg shadow-md border animate-in fade-in zoom-in duration-200">
                                                <button
                                                    onClick={() => setIsModalOpen(true)}
                                                    className="p-1.5 hover:bg-blue-50 text-blue-600 rounded"
                                                    title="Edit"
                                                >
                                                    <Settings className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => setSignatureImage(null)}
                                                    className="p-1.5 hover:bg-red-50 text-red-500 rounded"
                                                    title="Remove"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </PdfPreview>
                            </div>
                        </div>

                        {/* Right Sidebar - Controls */}
                        <div className="lg:w-[424px] lg:fixed lg:right-4 lg:top-24">
                            <div className="bg-white rounded-3xl border border-[#e2e8f0] p-6 shadow-xl max-h-[calc(100vh-120px)] overflow-y-auto">

                                {/* Signature Section */}
                                <div className="mb-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <PenTool className="h-6 w-6 text-[#4383BF]" />
                                        <h2 className="text-[#111418] font-bold text-lg leading-7">Your Signature</h2>
                                    </div>

                                    <div className="bg-[#f9fafb] rounded-xl border border-[#f3f4f6] p-4 flex flex-col items-center gap-4">
                                        {signatureImage ? (
                                            <>
                                                <div className="h-24 w-full flex items-center justify-center bg-white rounded border border-dashed border-gray-200">
                                                    <img src={signatureImage} alt="Current Signature" className="max-h-full max-w-full object-contain" />
                                                </div>
                                                <div className="flex gap-2 w-full">
                                                    <Button
                                                        variant="outline"
                                                        className="flex-1"
                                                        onClick={() => setIsModalOpen(true)}
                                                    >
                                                        Edit Signature
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                                        onClick={() => setSignatureImage(null)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="text-center py-6">
                                                <p className="text-gray-500 mb-4 text-sm">No signature created yet.</p>
                                                <Button
                                                    onClick={() => setIsModalOpen(true)}
                                                    className="bg-[#4383BF] hover:bg-[#3470A0] text-white"
                                                >
                                                    Create Signature
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Options Section */}
                                <div className="mb-6 border-t border-[#f3f4f6] pt-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Settings className="h-5 w-5 text-[#9ca3af]" />
                                        <h3 className="text-[#111418] font-bold text-base">Placement Options</h3>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="bg-blue-50 text-blue-800 p-4 rounded-lg text-sm flex gap-2">
                                            <Move className="w-5 h-5 flex-shrink-0" />
                                            <p>You can drag and resize the signature directly on the preview to adjust its position and size.</p>
                                        </div>

                                        <div>
                                            <label className="text-xs font-semibold text-[#6b7280] mb-2 block">Pages</label>
                                            <div className="flex gap-2 bg-[#f1f5f9] p-1 rounded-lg">
                                                {["first", "last", "all"].map((opt) => (
                                                    <button
                                                        key={opt}
                                                        onClick={() => setPageOption(opt as any)}
                                                        className={cn(
                                                            "flex-1 py-1.5 rounded text-xs font-medium transition-all capitalize",
                                                            pageOption === opt
                                                                ? "bg-white text-[#4383BF] shadow"
                                                                : "text-[#64748b]"
                                                        )}
                                                    >
                                                        {opt}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Sign Button */}
                                <button
                                    onClick={signPdf}
                                    disabled={isProcessing || !signatureImage}
                                    className="w-full bg-[#4383BF] hover:bg-[#3470A0] text-white rounded-xl h-[60px] flex items-center justify-center gap-3 font-bold text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    <PenTool className="h-6 w-6" />
                                    <span>
                                        {isProcessing ? "Signing..." : "SIGN PDF"}
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <PasswordProtectedModal
                isOpen={showPasswordModal}
                onClose={() => setShowPasswordModal(false)}
                toolName="signing"
            />
        </>
    );
}
