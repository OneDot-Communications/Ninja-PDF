'use client';

import React, { useCallback } from 'react';
import { useDropzone, DropzoneOptions } from 'react-dropzone';
import { cn } from '@/lib/utils';
import { UploadCloud, FileType } from 'lucide-react';
import { toast } from 'sonner';

interface DropzoneProps extends DropzoneOptions {
    className?: string;
    onDrop?: (acceptedFiles: File[]) => void;
    showFiles?: boolean; // If true, shows listing of accepted files inside
}

export function Dropzone({ className, onDrop, showFiles = false, ...props }: DropzoneProps) {
    const handleDrop = useCallback((acceptedFiles: File[], fileRejections: any[]) => {
        if (fileRejections.length > 0) {
            fileRejections.forEach((rejection) => {
                rejection.errors.forEach((err: any) => {
                    toast.error(`Error: ${err.message}`);
                });
            });
        }

        if (onDrop) {
            onDrop(acceptedFiles);
        }
    }, [onDrop]);

    const { getRootProps, getInputProps, isDragActive, acceptedFiles } = useDropzone({
        onDrop: handleDrop,
        multiple: false,
        ...props
    });

    return (
        <div
            {...getRootProps()}
            className={cn(
                "border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors",
                isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
                className
            )}
        >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center justify-center gap-4">
                <div className="p-4 rounded-full bg-muted">
                    <UploadCloud className="w-8 h-8 text-muted-foreground" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold">
                        {isDragActive ? "Drop files here" : "Drag & drop files here"}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                        or click to browse files
                    </p>
                </div>
                {showFiles && acceptedFiles.length > 0 && (
                    <div className="mt-4 w-full text-left">
                        <h4 className="text-sm font-medium mb-2">Selected Files:</h4>
                        <ul className="space-y-2">
                            {acceptedFiles.map((file) => (
                                <li key={file.name} className="flex items-center gap-2 text-sm bg-background p-2 rounded border">
                                    <FileType className="w-4 h-4 text-blue-500" />
                                    <span className="truncate">{file.name}</span>
                                    <span className="text-muted-foreground text-xs">({(file.size / 1024).toFixed(1)} KB)</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}
