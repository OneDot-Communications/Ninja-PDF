import { cn } from "@/lib/utils";
import React, { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { FaGoogleDrive, FaDropbox } from "react-icons/fa";
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

  const handleIntegrationClick = (e: React.MouseEvent, type: string) => {
    e.stopPropagation();
    alert(`${type} integration coming soon!`);
  };

  // Clean layout: No glow, just shadow. Larger icons. Better gap.
  return (
    <div className="w-full p-4 md:p-6 flex justify-center">
      <div
        {...getRootProps()}
        className={cn(
          "group relative flex flex-col items-center justify-center min-h-[200px] w-full transition-all focus:outline-none cursor-pointer",
          isDragActive && "scale-[1.01]"
        )}
      >
        <input {...getInputProps()} />

        {/* Main Interface Wrapper */}
        <div className="flex flex-col items-center justify-center w-full">

          {/* Main Action Button - Centered */}
          <Button
            type="button" // Prevent form submission if any
            className={cn(
              "h-14 px-8 text-lg font-bold rounded-xl shadow-lg transition-all duration-300",
              "bg-[#0057B7] hover:bg-[#004494] text-white border-0 ring-0 outline-none" // Krishna Blue
            )}
          >
            Select PDF files
          </Button>

          {/* Integration Icons - Inline below button */}
          <div className="flex items-center gap-3 mt-4">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                alert("Google Drive integration coming soon!");
              }}
              className="p-2 bg-white rounded-full shadow-md hover:shadow-lg hover:scale-110 transition-all group/icon"
              title="Google Drive"
            >
              <FaGoogleDrive className="w-4 h-4 text-slate-600 group-hover/icon:text-[#0057B7]" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                alert("Dropbox integration coming soon!");
              }}
              className="p-2 bg-white rounded-full shadow-md hover:shadow-lg hover:scale-110 transition-all group/icon"
              title="Dropbox"
            >
              <FaDropbox className="w-4 h-4 text-slate-600 group-hover/icon:text-[#0061FF]" />
            </button>
          </div>

          {/* Bottom Text */}
          <p className="mt-4 text-slate-400 text-sm font-medium">
            or drop PDFs here
          </p>
        </div>

      </div>
    </div>
  );
};
