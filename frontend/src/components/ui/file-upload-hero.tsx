import React, { useState, useRef, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";
import Image from "next/image";

export const FileUploadHero = ({
  title = "Upload Files",
  description = "Drag & drop PDF files here",
  onFilesSelected,
  accept = { "application/pdf": [".pdf"] },
  maxFiles = 20,
}: {
  title?: string;
  description?: string;
  onFilesSelected?: (files: File[]) => void;
  accept?: Record<string, string[]>;
  maxFiles?: number;
}) => {
  const { getRootProps, getInputProps, open, isDragActive } = useDropzone({
    multiple: maxFiles > 1,
    maxFiles,
    accept,
    onDrop: (files) => onFilesSelected && onFilesSelected(files as File[]),
    noClick: true,
  });

  // Track drag state across the whole page (not just dropzone) so overlay appears when dragging from desktop/folder
  const [pageDragActive, setPageDragActive] = useState(false);
  const dragCounter = useRef<number>(0);

  useEffect(() => {
    const onWindowDragEnter = (e: any) => {
      e.preventDefault();
      dragCounter.current++;
      try {
        const types = e?.dataTransfer?.types;
        if (types && Array.from(types).includes('Files')) {
          setPageDragActive(true);
        }
      } catch (_err) { }
    };

    const onWindowDragLeave = (e: any) => {
      e.preventDefault();
      dragCounter.current--;
      if (dragCounter.current <= 0) {
        setPageDragActive(false);
        dragCounter.current = 0;
      }
    };

    const onWindowDrop = (e: any) => {
      setPageDragActive(false);
      dragCounter.current = 0;
    };

    const onWindowDragOver = (e: any) => {
      e.preventDefault();
    };

    window.addEventListener('dragenter', onWindowDragEnter);
    window.addEventListener('dragleave', onWindowDragLeave);
    window.addEventListener('drop', onWindowDrop);
    window.addEventListener('dragover', onWindowDragOver);

    return () => {
      window.removeEventListener('dragenter', onWindowDragEnter);
      window.removeEventListener('dragleave', onWindowDragLeave);
      window.removeEventListener('drop', onWindowDrop);
      window.removeEventListener('dragover', onWindowDragOver);
    };
  }, []);

  return (
    <div className="w-full min-h-screen flex flex-col items-center pt-4 md:pt-8">
      <div className="w-full max-w-3xl text-center px-4">
        {/* Large bold title at top - centered */}
        <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 mb-4 md:mb-6">{title}</h1>

        {/* Root: expands to full page when dragging */}
        <div
          {...getRootProps()}
          className={cn(
            "relative bg-transparent flex flex-col items-center",
            (isDragActive || pageDragActive) && "fixed inset-0 z-40 flex items-center justify-center"
          )}
        >
          <input {...getInputProps()} />

          {/* Overlay shown when dragging over page or anywhere on the window */}
          {(isDragActive || pageDragActive) && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#dff0ff]">
              <div className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-[#585858] mb-4">Throw the headache here</div>
              <div className="text-base md:text-lg lg:text-xl font-semibold text-[#585858]">Drop files to upload</div>
            </div>
          )}



          {/* Normal content (button + icons + subtitle) */}
          <div className="relative inline-flex items-center">
            <Button
              type="button"
              onClick={open}
              className={`h-14 md:h-16 lg:h-18 px-8 md:px-10 lg:px-12 text-xl md:text-2xl font-semibold rounded-xl transition-all shadow-[0_12px_30px_rgba(19,109,236,0.16)] bg-[#136dec] hover:bg-[#0e56c6] text-white flex items-center justify-center`}
            >
              <span className="flex items-center gap-2 md:gap-3">
                <UploadCloud className="w-5 h-5 md:w-6 md:h-6" />
                Select PDF Files
              </span>
            </Button>

            {/* Vertical icons to the right of the button, centered */}
            <div className="absolute right-[-56px] md:right-[-64px] top-1/2 -translate-y-1/2 flex flex-col gap-2 md:gap-3">
              <button
                type="button"
                className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white border border-slate-200 shadow flex items-center justify-center"
                onClick={(e) => { e.stopPropagation(); alert('Upload from Google Drive coming soon'); }}
                title="Google Drive"
              >
                <img src="/merge/drive.png" alt="Google Drive" className="w-4 h-4 md:w-5 md:h-5 object-contain" />
              </button>
              <button
                type="button"
                className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white border border-slate-200 shadow flex items-center justify-center"
                onClick={(e) => { e.stopPropagation(); alert('Upload from Dropbox coming soon'); }}
                title="Dropbox"
              >
                <img src="/merge/dropbox.png" alt="Dropbox" className="w-4 h-4 md:w-5 md:h-5 object-contain" />
              </button>
              <button
                type="button"
                className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white border border-slate-200 shadow flex items-center justify-center"
                onClick={(e) => { e.stopPropagation(); alert('Upload from URL coming soon'); }}
                title="From link"
              >
                <img src="/merge/link.png" alt="From link" className="w-4 h-4 md:w-5 md:h-5 object-contain" />
              </button>
            </div>
          </div>

          {/* Prominent subtitle and helper text - styled to #585858 */}
          <p className="mt-6 md:mt-8 text-xl md:text-2xl lg:text-3xl font-extrabold text-[#585858]">{description}</p>
          <div className="text-sm md:text-base text-slate-400 mt-2">or click to select from your local drive</div>

          {/* Drag state hint (subtle) */}
          <div className="mt-6 text-slate-600 h-6">
            {isDragActive ? <span className="font-medium text-slate-700">Release to drop files</span> : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUploadHero;
