"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, File as FileIcon, X } from "lucide-react";
import { FaGoogleDrive, FaDropbox } from "react-icons/fa";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./button";

interface FileUploaderProps {
    onFilesSelected: (files: File[]) => void;
    accept?: Record<string, string[]>;
    maxFiles?: number;
    description?: string;
    label?: string; // Allow custom label
}

export function FileUploader({
    onFilesSelected,
    accept = { "application/pdf": [".pdf"] },
    maxFiles = 1,
    description = "or drop PDFs here",
    label = "Select PDF files",
}: FileUploaderProps) {
    const onDrop = useCallback(
        (acceptedFiles: File[]) => {
            if (acceptedFiles.length > 0) {
                onFilesSelected(acceptedFiles);
            }
        },
        [onFilesSelected]
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept,
        maxFiles,
    });

    const handleIntegrationClick = (e: React.MouseEvent, type: string) => {
        e.stopPropagation();
        alert(`${type} integration coming soon!`);
    };

    return (
        <div
            {...getRootProps()}
            className={cn(
                "group relative flex flex-col items-center justify-center min-h-[320px] w-full max-w-5xl mx-auto transition-all focus:outline-none cursor-pointer",
                isDragActive && "scale-[1.02]"
            )}
        >
            <input {...getInputProps()} />

            <div className="flex items-center gap-6">
                {/* Main Action Button - Massive Size */}
                <div className="relative group/btn">
                    <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-red-600 to-red-500 opacity-70 blur transition duration-200 group-hover/btn:opacity-100" />
                    <Button
                        size="lg"
                        className="relative h-24 px-16 text-3xl font-bold rounded-2xl bg-[#E42527] hover:bg-[#d01e20] text-white shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border-none"
                    >
                        {label}
                    </Button>
                </div>

                {/* Side Integration Buttons */}
                <div className="flex flex-col gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-full bg-[#E42527] hover:bg-[#d01e20] text-white shadow-lg transition-transform hover:scale-110"
                        onClick={(e) => handleIntegrationClick(e, 'Google Drive')}
                        title="Select from Google Drive"
                    >
                        <FaGoogleDrive className="h-5 w-5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-full bg-[#E42527] hover:bg-[#d01e20] text-white shadow-lg transition-transform hover:scale-110"
                        onClick={(e) => handleIntegrationClick(e, 'Dropbox')}
                        title="Select from Dropbox"
                    >
                        <FaDropbox className="h-5 w-5" />
                    </Button>
                </div>
            </div>

            <p className="mt-8 text-xl text-slate-400 font-medium tracking-wide">
                {description}
            </p>
        </div>
    );
}
