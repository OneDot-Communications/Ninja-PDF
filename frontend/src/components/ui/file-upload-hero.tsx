import React, { useState, useRef, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";
import Image from "next/image";

export const FileUploadHero = ({
  title = "Upload Files",
  description = "Drag & drop your PDF's here",
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
      <div className="w-full text-center px-4">
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



          {/* Normal content (button centered; icons positioned to the right) */}
          <div className="relative w-full flex justify-center items-center">
            <Button
              type="button"
              onClick={open}
              className={`h-16 md:h-20 lg:h-24 px-10 md:px-12 lg:px-16 text-xl md:text-2xl lg:text-3xl font-semibold rounded-xl transition-all shadow-[0_12px_30px_rgba(19,109,236,0.16)] bg-[#4383BF] hover:bg-[#3470A0] text-white flex items-center justify-center mx-auto`}
            >
              <span className="flex items-center gap-2 md:gap-3">
                <UploadCloud className="w-5 h-5 md:w-6 md:h-6" />
                Select PDF Files
              </span>
            </Button>

            {/* Icons positioned to the right of center so they don't shift the button */}
            <div className="absolute left-1/2 translate-x-[110px] md:translate-x-[160px] lg:translate-x-[210px] top-1/2 -translate-y-1/2 flex flex-col items-start gap-2 md:gap-3">
              <div className="flex gap-2 md:gap-3">
                <button
                  type="button"
                  aria-label="Upload from Google Drive"
                  className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-white border border-slate-200 shadow flex items-center justify-center"
                  onClick={(e) => { e.stopPropagation(); alert('Upload from Google Drive coming soon'); }}
                  title="Google Drive"
                >
                  <img src="/merge/drive.png" alt="Google Drive" className="w-4 h-4 md:w-5 md:h-5 object-contain" />
                </button>
                <button
                  type="button"
                  aria-label="Upload from Dropbox"
                  className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-white border border-slate-200 shadow flex items-center justify-center"
                  onClick={(e) => { e.stopPropagation(); alert('Upload from Dropbox coming soon'); }}
                  title="Dropbox"
                >
                  <img src="/merge/dropbox.png" alt="Dropbox" className="w-4 h-4 md:w-5 md:h-5 object-contain" />
                </button>
              </div>
              <div className="mt-1">
                <button
                  type="button"
                  aria-label="Upload from URL"
                  className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-white border border-slate-200 shadow flex items-center justify-center"
                  onClick={(e) => { e.stopPropagation(); alert('Upload from URL coming soon'); }}
                  title="From link"
                >
                  <img src="/merge/link.png" alt="From link" className="w-4 h-4 md:w-5 md:h-5 object-contain" />
                </button>
              </div>
            </div>
          </div>

          {/* Prominent subtitle and helper text - styled to #585858 */}
          <p className="mt-6 md:mt-8 text-xl md:text-2xl lg:text-3xl font-extrabold text-[#585858]">{description}</p>
          <div className="text-sm md:text-base text-slate-400 mt-2">or click to pick from your ancient file explorer — we’ll pretend we didn’t notice.</div>

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
