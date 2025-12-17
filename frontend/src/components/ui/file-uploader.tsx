"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, File as FileIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./button";

interface FileUploaderProps {
    onFilesSelected: (files: File[]) => void;
    accept?: Record<string, string[]>;
    maxFiles?: number;
    description?: string;
}

export function FileUploader({
    onFilesSelected,
    accept = { "application/pdf": [".pdf"] },
    maxFiles = 1,
    description = "or drop files here",
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

    return (
        <div
            {...getRootProps()}
            className={cn(
                "group relative flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border bg-muted/30 p-12 text-center transition-all hover:bg-muted/50",
                isDragActive && "border-primary bg-primary/5"
            )}
        >
            <input {...getInputProps()} />
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 transition-transform group-hover:scale-110">
                <Upload className="h-10 w-10 text-primary" />
            </div>
            <h3 className="mb-2 text-2xl font-bold">Select PDF files</h3>
            <p className="mb-6 text-muted-foreground">{description}</p>
            <Button size="lg" className="rounded-full px-8">
                Select PDF files
            </Button>
        </div>
    );
}
