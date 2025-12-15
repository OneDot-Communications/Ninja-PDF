// Sample Frontend Integration (Next.js/TypeScript)
// File: lib/pdf-editor-api.ts

export interface TextObject {
  type: 'text';
  content: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  rotation: number;
}

export interface LayoutModel {
  pageWidth: number;
  pageHeight: number;
  objects: TextObject[];
}

export class PdfEditorAPI {
  private baseUrl: string;

  constructor(baseUrl = 'http://localhost:8080') {
    this.baseUrl = baseUrl;
  }

  /**
   * Edit a PDF with the given layout
   */
  async editPdf(pdfFile: File, layout: LayoutModel): Promise<Blob> {
    const formData = new FormData();
    formData.append('pdf', pdfFile);
    formData.append('layout', JSON.stringify(layout));

    const response = await fetch(`${this.baseUrl}/api/pdf/edit`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to edit PDF');
    }

    return response.blob();
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/pdf/health`);
    return response.text();
  }

  /**
   * Download edited PDF
   */
  downloadPdf(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

// Usage Example in a React Component:

/*
import { useState } from 'react';
import { PdfEditorAPI, LayoutModel } from '@/lib/pdf-editor-api';

export default function PdfEditor() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const api = new PdfEditorAPI();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPdfFile(e.target.files[0]);
    }
  };

  const handleSave = async () => {
    if (!pdfFile) return;

    setIsProcessing(true);
    try {
      // Example layout - in real app, this comes from your editor
      const layout: LayoutModel = {
        pageWidth: 595,
        pageHeight: 842,
        objects: [
          {
            type: 'text',
            content: 'Hello World',
            x: 100,
            y: 100,
            fontSize: 24,
            fontFamily: 'Helvetica',
            color: '#000000',
            rotation: 0,
          },
        ],
      };

      const editedPdf = await api.editPdf(pdfFile, layout);
      api.downloadPdf(editedPdf, 'edited-document.pdf');
      
      alert('PDF saved successfully!');
    } catch (error) {
      console.error('Error saving PDF:', error);
      alert('Failed to save PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">PDF Editor</h1>
      
      <input
        type="file"
        accept=".pdf"
        onChange={handleFileChange}
        className="mb-4"
      />

      <button
        onClick={handleSave}
        disabled={!pdfFile || isProcessing}
        className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {isProcessing ? 'Processing...' : 'Save PDF'}
      </button>
    </div>
  );
}
*/
