
'use client';

import { useRef } from 'react';

interface PDFUploaderProps {
    onFileSelect: (file: File) => void;
    isLoading: boolean;
}

export default function PDFUploader({ onFileSelect, isLoading }: PDFUploaderProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type === 'application/pdf') {
            onFileSelect(file);
        }
    };

    const handleClick = () => {
        inputRef.current?.click();
    };

    return (
        <div className="flex items-center gap-4">
            <input
                ref={inputRef}
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="hidden"
            />
            <button
                onClick={handleClick}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
            >
                {isLoading ? 'Loading...' : 'Upload PDF'}
            </button>
            <span className="text-sm text-gray-600">
                Upload a PDF to start editing
            </span>
        </div>
    );
}
