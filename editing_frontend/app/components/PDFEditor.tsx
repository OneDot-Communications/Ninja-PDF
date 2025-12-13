
'use client';

import { usePDFLoader } from '@/app/hooks/usePDFLoader';
import PDFUploader from './PDFUploader';
import PDFCanvas from './PDFCanvas';

export default function PDFEditor() {
    const {
        loadFile,
        textItems,
        pageDimensions,
        backgroundImageUrl,
        isLoading,
        error,
    } = usePDFLoader();

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-6xl mx-auto">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        PDF Text Editor
                    </h1>
                    <p className="text-gray-600">
                        Upload a PDF, then click and drag text to reposition, double-click to edit
                    </p>
                </header>

                <div className="mb-6">
                    <PDFUploader onFileSelect={loadFile} isLoading={isLoading} />
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-red-800 font-medium">Error: {error}</p>
                    </div>
                )}

                {isLoading && (
                    <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                            <p className="text-gray-600">Processing PDF...</p>
                        </div>
                    </div>
                )}

                {!isLoading && pageDimensions && backgroundImageUrl && (
                    <div className="flex justify-center">
                        <PDFCanvas
                            textItems={textItems}
                            pageDimensions={pageDimensions}
                            backgroundImageUrl={backgroundImageUrl}
                        />
                    </div>
                )}

                {!isLoading && !pageDimensions && !error && (
                    <div className="text-center py-12 text-gray-500">
                        <svg
                            className="w-16 h-16 mx-auto mb-4 text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                            />
                        </svg>
                        <p>No PDF loaded yet</p>
                    </div>
                )}
            </div>
        </div>
    );
}
