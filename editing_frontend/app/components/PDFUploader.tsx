
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
        <div className="flex flex-col items-center gap-4">
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
                className="px-6 py-3 bg-black text-white rounded-xl font-medium 
                    hover:bg-gray-800 
                    disabled:bg-gray-400 disabled:cursor-not-allowed 
                    transition-all duration-200 shadow-lg
                    flex items-center gap-2"
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                {isLoading ? 'Loading...' : 'Choose PDF File'}
            </button>
            <p className="text-sm text-gray-500">
                or drag and drop your file here
            </p>
        </div>
    );
}
