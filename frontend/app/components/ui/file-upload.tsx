import { cn } from "../../../lib/utils";
import React, { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { Button } from "./button";

export const FileUpload = ({
  onFilesSelected,
  accept = {},
  maxFiles = 1,
  description = "Drag or drop your files here or click to upload",
  variant = 'default',
  size = 'default'
}: {
  onFilesSelected?: (files: File[]) => void;
  accept?: Record<string, string[]>;
  maxFiles?: number;
  description?: string;
  variant?: 'default' | 'compact';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (newFiles: File[]) => {
    onFilesSelected && onFilesSelected(newFiles);
  };

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    multiple: maxFiles > 1,
    maxFiles,
    accept,
    onDrop: handleFileChange,
    onDragEnter: () => setIsDragOver(true),
    onDragLeave: () => setIsDragOver(false),
    onDropAccepted: () => setIsDragOver(false),
    onDropRejected: () => setIsDragOver(false),
    noClick: variant === 'compact' // Manual 'open' trigger for compact button to avoid double triggering if wrapping weirdly, though usually fine. Actually let's just let dropzone handle it.
  });

  if (variant === 'compact') {
    return (
      <div {...getRootProps()} className="inline-block">
        <input {...getInputProps()} />
        <Button variant="outline" size={size} onClick={open} className="gap-2">
          <UploadCloud className="w-4 h-4" />
          Add PDF
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full bg-background rounded-xl border border-slate-200 shadow-sm">
      <div className="p-4 md:p-6">
        <div className="hidden md:flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
              <UploadCloud className="w-6 h-6 text-[#714B67]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Upload files</h3>
              <p className="text-sm text-slate-500 mt-1">
                Select and upload the files of your choice
              </p>
            </div>
          </div>
        </div>

        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-lg p-6 md:p-8 flex flex-col items-center justify-center text-center transition-colors duration-200 cursor-pointer",
            isDragActive || isDragOver
              ? "border-[#714B67] bg-[#714B67]/5"
              : "border-slate-200 hover:border-[#714B67]/50 hover:bg-slate-50"
          )}
        >
          <input {...getInputProps()} />
          <UploadCloud className={cn(
            "hidden md:block w-10 h-10 mb-4 transition-colors",
            isDragActive ? "text-[#714B67]" : "text-slate-400"
          )} />
          <p className="hidden md:block font-semibold text-slate-900">{isDragActive ? "Drop files here" : "Choose a file or drag & drop"}</p>
          <p className="hidden md:block text-xs text-slate-500 mt-1 mb-4">
            {description}
          </p>
          <Button variant={isDragActive ? "default" : "outline"} size="lg" className="w-full md:w-auto pointer-events-none md:pointer-events-auto">
            <UploadCloud className="w-4 h-4 mr-2 md:hidden" />
            {isDragActive ? "Drop to Upload" : "Browse Files"}
          </Button>
        </div>
      </div>
    </div>
  );
};

