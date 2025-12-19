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
    <div className="w-full p-8 md:p-10 flex justify-center">
      <div
        {...getRootProps()}
        className={cn(
          "group relative flex flex-col items-center justify-center min-h-[280px] w-full max-w-5xl mx-auto transition-all focus:outline-none cursor-pointer",
          isDragActive && "scale-[1.01]"
        )}
      >
        <input {...getInputProps()} />

        {/* Main Interface Wrapper - Relative for absolute positioning of icons */}
        <div className="relative flex flex-col items-center justify-center">

          {/* Main Action Button - Centered */}
          <Button
            type="button" // Prevent form submission if any
            className={cn(
              "h-24 px-12 text-3xl font-bold rounded-xl shadow-xl transition-all duration-300 relative z-10",
              "bg-[#0057B7] hover:bg-[#004494] text-white border-0 ring-0 outline-none" // Krishna Blue
            )}
          >
            Select PDF files
          </Button>

          {/* Integration Icons - Absolute Positioned to the right of the button */}
          <div className="absolute left-[100%] top-1/2 -translate-y-1/2 -mt-8 ml-6 flex flex-col gap-2 z-20">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                alert("Google Drive integration coming soon!");
              }}
              className="p-2 bg-white rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all group/icon"
              title="Google Drive"
            >
              <FaGoogleDrive className="w-5 h-5 text-slate-600 group-hover/icon:text-[#0057B7]" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                alert("Dropbox integration coming soon!");
              }}
              className="p-2 bg-white rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all group/icon"
              title="Dropbox"
            >
              <FaDropbox className="w-5 h-5 text-slate-600 group-hover/icon:text-[#0061FF]" />
            </button>
          </div>

          {/* Bottom Text */}
          <p className="mt-8 text-slate-400 text-lg font-medium">
            or drop PDFs here
          </p>
        </div>

      </div>
    </div>
  );
};
