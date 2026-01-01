"use client";

import { useState } from "react";
import { saveAs } from "file-saver";
import FileUploadHero from "../ui/file-upload-hero";
import { Button } from "../ui/button";
import { Unlock, Lock, CheckCircle } from "lucide-react";
import { pdfApi } from "@/lib/services/pdf-api";
import { isPdfEncrypted } from "@/lib/services/pdf-service";
import { toast } from "@/lib/hooks/use-toast";

export function UnlockPdfTool() {
    const [file, setFile] = useState<File | null>(null);
    const [password, setPassword] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [isEncrypted, setIsEncrypted] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleFileSelected = async (files: File[]) => {
        if (files.length > 0) {
            const selectedFile = files[0];
            setFile(selectedFile);
            setPassword("");

            const encrypted = await isPdfEncrypted(selectedFile);
            setIsEncrypted(encrypted);
        }
    };

    const unlockPdf = async () => {
        if (!file) return;
        setIsProcessing(true);

        try {
            // Backend-first with client-side fallback
            const result = await pdfApi.unlock(file, isEncrypted ? password : "");

            saveAs(result.blob, result.fileName);

            toast.show({
                title: "Success",
                message: "PDF unlocked successfully!",
                variant: "success",
                position: "top-right",
            });
        } catch (error) {
            console.error("Error unlocking PDF:", error);
            toast.show({
                title: "Unlock Failed",
                message: "Failed to unlock PDF. Incorrect password?",
                variant: "error",
                position: "top-right",
            });
        } finally {
            setIsProcessing(false);
        }
    };

    if (!file) {
        return (
            <div className="min-h-[calc(100vh-120px)] flex items-center justify-center">
                <FileUploadHero
                    title="Unlock PDF"
                    onFilesSelected={handleFileSelected}
                    maxFiles={1}
                    accept={{ "application/pdf": [".pdf"] }}
                />
            </div>
        );
    }

    return (
        <div className="min-h-[calc(100vh-120px)] flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
            <div className="w-full max-w-md">
                {/* Centered Card */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
                    {/* Lock Icon */}
                    <div className="flex justify-center mb-6">
                        <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
                            <Lock className="h-8 w-8 text-blue-600" />
                        </div>
                    </div>

                    {/* Title */}
                    <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">Unlock PDF</h2>
                    <p className="text-sm text-gray-600 text-center mb-6">
                        Knock knock. Who's there? Open file.
                    </p>

                    {/* File Display */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-red-100 rounded flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-500 mb-1">Target File</p>
                                <p className="text-sm font-semibold text-gray-900 truncate">{file.name}</p>
                            </div>
                            <button
                                onClick={() => { setFile(null); setPassword(""); }}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Password Field */}
                    {isEncrypted && (
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && unlockPdf()}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Enter password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {!isEncrypted && (
                        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-start gap-2">
                                <Unlock className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-green-900 font-semibold text-sm mb-1">No Password Required</p>
                                    <p className="text-green-700 text-xs leading-relaxed">
                                        This file doesn't have an open password. Click below to remove any editing restrictions.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Unlock Button */}
                    <Button
                        onClick={unlockPdf}
                        disabled={isProcessing || (isEncrypted && !password)}
                        className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-base flex items-center justify-center gap-2"
                    >
                        {isProcessing ? (
                            "Processing..."
                        ) : (
                            <>
                                <Unlock className="h-5 w-5" />
                                Unlock PDF
                            </>
                        )}
                    </Button>

                    {/* Forgot Password Link */}
                    {isEncrypted && (
                        <div className="text-center mt-4">
                            <button className="text-sm text-blue-600 hover:text-blue-700 hover:underline">
                                I forgot the password
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
