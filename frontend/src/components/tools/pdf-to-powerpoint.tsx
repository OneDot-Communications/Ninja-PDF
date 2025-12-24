"use client";

import { useState } from "react";
import { FileUpload } from "../ui/file-upload";
import { Button } from "../ui/button";
import { ArrowRight, Presentation, Loader2, RefreshCw } from "lucide-react";
import { pdfApi } from "@/lib/services/pdf-api";
import { saveAs } from "file-saver";

export function PdfToPowerPointTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");

  // No explicit options UI anymore - auto-detect matches original PDF size

  const handleFilesSelected = (newFiles: File[]) => {
    setFiles((prev) => [...prev, ...newFiles]);
    setProgress(0);
  };

  const convert = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setProgress(0);
    setStatus("Starting conversion...");

    try {
      const file = files[0];
      // Backend automatically handles size matching (Original)
      const result = await pdfApi.pdfToPowerpoint(file);

      setStatus("Saving PowerPoint file...");
      saveAs(result.blob, result.fileName);
      setStatus("Completed!");

      // Note: Backend handles quality/aspect ratio, or we could pass it if API supports it.
      // For now we use the unified API which is simpler.
    } catch (error) {
      console.error("Conversion Error:", error);
      alert("Failed to convert PDF to PowerPoint.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (files.length === 0) {
    return (
      <div className="mx-auto max-w-2xl">
        <FileUpload
          onFilesSelected={handleFilesSelected}
          maxFiles={1}
          accept={{ "application/pdf": [".pdf"] }}
          description="Drop PDF file here to convert to PowerPoint"
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
            <Presentation className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{files[0].name}</h2>
            <p className="text-sm text-muted-foreground">
              {(files[0].size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setFiles([])}>
          <RefreshCw className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex flex-col items-center justify-center space-y-6 rounded-xl border bg-muted/20 p-6">
        {isProcessing ? (
          <div className="w-full max-w-md space-y-4 text-center">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
            <p className="text-lg font-medium">{status}</p>
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <div className="p-4 rounded-full bg-primary/10 w-fit mx-auto">
              <Presentation className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Ready to Convert</h3>
            <p className="text-muted-foreground max-w-xs mx-auto">
              We'll convert your PDF to a fully editable PowerPoint presentation.
            </p>
            <Button
              size="lg"
              onClick={convert}
              className="h-14 min-w-[200px] text-lg shadow-lg transition-all hover:scale-105"
            >
              Convert to PowerPoint <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
