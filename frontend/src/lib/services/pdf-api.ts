// frontend/app/lib/pdf-api.ts
// Unified PDF service: Backend API primary, client-side fallback

import { api } from "./api";

/**
 * Unified PDF service that tries backend API first, falls back to client-side processing.
 * This ensures production uses backend while providing offline/demo fallback.
 */

type ProcessingResult = {
    blob: Blob;
    fileName?: string;
};

// Lazy load client-side processor only when needed
const getClientProcessor = async () => {
    const { pdfStrategyManager } = await import("./pdf-service");
    return pdfStrategyManager;
};

/**
 * Helper to try backend first, fallback to client-side
 */
const withFallback = async (
    backendCall: () => Promise<Blob>,
    clientFallback: () => Promise<ProcessingResult>,
    fileName: string
): Promise<ProcessingResult> => {
    try {
        // Try backend API first (PRIMARY)
        const blob = await backendCall();
        return { blob, fileName };
    } catch (backendError: any) {
        // If Quota Limit reached, DO NOT fallback to client side (bypass)
        if (backendError.message && backendError.message.includes("QUOTA_EXCEEDED")) {
            throw backendError;
        }

        console.warn(`Backend API failed (${backendError.message}), falling back to client-side.`);

        try {
            // Fallback to client-side processing
            const result = await clientFallback();
            return result;
        } catch (clientError) {
            console.error("Both backend and client-side processing failed:", clientError);
            throw new Error("Processing failed. Please try again later.");
        }
    }
};

/**
 * Helper factory for standard conversions (Backend -> Client Fallback)
 */
const createStandardConverter = (
    apiMethod: (file: File, options?: any) => Promise<any>,
    strategyName: string,
    outputExtOrFn: string | ((name: string) => string),
    clientDefaultOptions: any = {}
) => {
    return async (file: File, options?: any): Promise<ProcessingResult> => {
        const fileName = typeof outputExtOrFn === 'function'
            ? outputExtOrFn(file.name)
            : file.name.replace(/\.[^/.]+$/, "") + outputExtOrFn;

        return withFallback(
            () => apiMethod(file, options),
            async () => {
                const processor = await getClientProcessor();
                return processor.execute(strategyName, [file], { ...clientDefaultOptions, ...options });
            },
            fileName
        );
    };
};

/**
 * Helper factory for conversions with NO client fallback (throws error)
 */
const createNoFallbackConverter = (
    apiMethod: (file: File) => Promise<any>,
    errorMsg: string,
    outputExtOrFn: string | ((name: string) => string)
) => {
    return async (file: File): Promise<ProcessingResult> => {
        const fileName = typeof outputExtOrFn === 'function'
            ? outputExtOrFn(file.name)
            : file.name.replace(/\.[^/.]+$/, "") + outputExtOrFn;

        return withFallback(
            () => apiMethod(file),
            async () => {
                throw new Error(errorMsg);
            },
            fileName
        );
    };
};

export const pdfApi = {
    // ─────────────────────────────────────────────────────────────────────────────
    // PDF COMPRESSION
    // ─────────────────────────────────────────────────────────────────────────────
    compress: async (file: File, level: "recommended" | "extreme"): Promise<ProcessingResult> => {
        return withFallback(
            async () => {
                const formData = new FormData();
                formData.append("file", file);
                formData.append("level", level);

                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pdf/compress`, {
                    method: "POST",
                    body: formData,
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Compress failed: ${errorText}`);
                }

                const blob = await response.blob();
                return blob;
            },
            async () => {
                const processor = await getClientProcessor();
                return processor.execute("compress", [file], { level });
            },
            `compressed-${file.name}`
        );
    },

    // ─────────────────────────────────────────────────────────────────────────────
    // PDF TO OTHER FORMATS
    // ─────────────────────────────────────────────────────────────────────────────
    pdfToWord: async (file: File, options?: { useOcr?: boolean; language?: string }): Promise<ProcessingResult> => {
        // Backend only - no client fallback to avoid PDF.js version mismatch
        try {
            const blob = await api.pdfToWord(file, options?.useOcr, options?.language);
            return {
                blob,
                fileName: file.name.replace(/\.[^/.]+$/, "") + ".docx"
            };
        } catch (error: any) {
            console.error("PDF to Word conversion failed:", error);
            throw new Error(error.message || "Failed to convert PDF to Word");
        }
    },
    pdfToExcel: async (file: File, options?: { mergeSheets?: boolean; outputFormat?: 'xlsx' | 'csv' }): Promise<ProcessingResult> => {
        const processor = await getClientProcessor();
        return processor.execute("pdf-to-excel", [file], options);
    },
    pdfToPowerpoint: async (file: File, options?: any): Promise<ProcessingResult> => {
        const processor = await getClientProcessor();
        return processor.execute("pdf-to-powerpoint", [file], options);
    },

    pdfToJpg: async (file: File, options?: any): Promise<ProcessingResult> => {
        return withFallback(
            () => api.pdfToJpg(file),
            async () => {
                const processor = await getClientProcessor();
                return processor.execute("convert-from-pdf", [file], { format: "jpeg", dpi: 150, ...options });
            },
            file.name.replace(".pdf", ".jpg")
        );
    },

    pdfToPdfa: createStandardConverter(api.pdfToPdfa, "pdf-to-pdfa", "-pdfa.pdf"),
    pdfToHtml: createNoFallbackConverter(api.pdfToHtml, "HTML conversion not available offline", ".html"),

    // ─────────────────────────────────────────────────────────────────────────────
    // OTHER FORMATS TO PDF
    // ─────────────────────────────────────────────────────────────────────────────
    wordToPdf: async (file: File, options?: any): Promise<ProcessingResult> => {
        const processor = await getClientProcessor();
        return processor.execute("word-to-pdf", [file], options);
    },
    excelToPdf: createNoFallbackConverter(
        api.excelToPdf,
        "Excel to PDF conversion requires server processing. Please check your connection and try again.",
        (name) => name.replace(/\.(xlsx?|xls)$/i, ".pdf")
    ),
    powerpointToPdf: createNoFallbackConverter(
        api.powerpointToPdf,
        "PowerPoint to PDF conversion requires server processing. Please check your connection and try again.",
        (name) => name.replace(/\.(pptx?|ppt)$/i, ".pdf")
    ),
    jpgToPdf: createStandardConverter(
        api.jpgToPdf,
        "convert-to-pdf",
        (name) => name.replace(/\.(jpe?g|png|gif|bmp)$/i, ".pdf")
    ),

    htmlToPdf: createNoFallbackConverter(
        api.htmlToPdf,
        "HTML to PDF conversion not available offline",
        (name) => name.replace(/\.html?$/i, ".pdf")
    ),
    markdownToPdf: createNoFallbackConverter(
        api.markdownToPdf,
        "Markdown to PDF conversion not available offline",
        (name) => name.replace(/\.md$/i, ".pdf")
    ),

    // ─────────────────────────────────────────────────────────────────────────────
    // PDF SECURITY
    // ─────────────────────────────────────────────────────────────────────────────
    protect: async (file: File, password: string, permissions: {
        allowPrinting?: boolean;
        allowCopying?: boolean;
        allowModifying?: boolean;
        allowAnnotating?: boolean;
        allowFillingForms?: boolean;
        allowAccessibility?: boolean;
        allowAssembly?: boolean;
    } = {}): Promise<ProcessingResult> => {
        // Backend expects snake_case with 'allow_' prefix
        const backendPermissions = {
            allow_printing: permissions.allowPrinting ?? false,
            allow_copy: permissions.allowCopying ?? false,
            allow_modify: permissions.allowModifying ?? false,
            allow_annotating: permissions.allowAnnotating ?? false,
            allow_filling_forms: permissions.allowFillingForms ?? false,
            allow_accessibility: permissions.allowAccessibility ?? false,
            allow_assembly: permissions.allowAssembly ?? false,
        };

        // Client (pdf-lib) expects specific keys without 'allow' prefix
        // pdf-service.ts handles the mapping if we pass a structure it expects, 
        // but let's pass the mapped object to be safe based on our findings.
        // Actually pdf-service.ts uses: options.permissions?.printing
        const clientPermissions = {
            printing: permissions.allowPrinting,
            copying: permissions.allowCopying,
            modifying: permissions.allowModifying,
            annotating: permissions.allowAnnotating,
            fillingForms: permissions.allowFillingForms,
            contentAccessibility: permissions.allowAccessibility,
            documentAssembly: permissions.allowAssembly,
        };

        return withFallback(
            () => api.protectPdf(file, password, backendPermissions),
            async () => {
                const processor = await getClientProcessor();
                return processor.execute("protect", [file], { password, permissions: clientPermissions });
            },
            `protected-${file.name}`
        );
    },

    unlock: async (file: File, password: string): Promise<ProcessingResult> => {
        return withFallback(
            () => api.unlockPdf(file, password),
            async () => {
                const processor = await getClientProcessor();
                return processor.execute("unlock", [file], { password });
            },
            `unlocked-${file.name}`
        );
    },

    flatten: async (file: File): Promise<ProcessingResult> => {
        return withFallback(
            () => api.flattenPdf(file),
            async () => {
                const processor = await getClientProcessor();
                return processor.execute("merge", [file], { flatten: true });
            },
            `flattened-${file.name}`
        );
    },

    // ─────────────────────────────────────────────────────────────────────────────
    // PDF MANIPULATION (client-side only for now - backend can be added later)
    // ─────────────────────────────────────────────────────────────────────────────
    merge: async (files: File[], options?: any): Promise<ProcessingResult> => {
        // Call Spring Boot backend API for PDF merging
        const formData = new FormData();
        files.forEach(file => {
            formData.append('files', file);
        });
        if (options?.outputFileName) {
            formData.append('outputFileName', options.outputFileName);
        }

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pdf/merge`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Merge failed: ${errorText}`);
        }

        const blob = await response.blob();
        const contentDisposition = response.headers.get('Content-Disposition');
        let fileName = 'merged.pdf';
        if (contentDisposition) {
            const match = contentDisposition.match(/filename="([^"]+)"/);
            if (match) {
                fileName = match[1];
            }
        }

        return { blob, fileName };
    },

    split: async (file: File, options: any): Promise<ProcessingResult> => {
        // Call Spring Boot backend API for PDF splitting
        const formData = new FormData();
        formData.append('file', file);
        if (options?.selectedPages && options.selectedPages.length > 0) {
            // Convert page numbers to array of integers
            options.selectedPages.forEach((page: number) => {
                formData.append('pages', page.toString());
            });
        }
        if (options?.outputFileName) {
            formData.append('outputFileName', options.outputFileName);
        }

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pdf/split`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Split failed: ${errorText}`);
        }

        const blob = await response.blob();
        const contentDisposition = response.headers.get('Content-Disposition');
        let fileName = 'split.pdf';
        if (contentDisposition) {
            const match = contentDisposition.match(/filename="([^"]+)"/);
            if (match) {
                fileName = match[1];
            }
        }

        return { blob, fileName };
    },

    getPagePreviews: async (file: File): Promise<{ previews: Array<{ pageNumber: number; image: string; width: number; height: number }>; totalPages: number }> => {
        // Call Spring Boot backend API for page previews
        const formData = new FormData();
        formData.append('file', file);
        // Get all pages for split functionality
        formData.append('maxPages', '100'); // Get up to 100 pages

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pdf/page-previews`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`Failed to get page previews: ${response.statusText}`);
        }

        const data = await response.json();

        // Transform the response to match expected format
        const previews = data.previews.map((imageData: string, index: number) => ({
            pageNumber: index + 1,
            image: imageData,
            width: 200, // Default width, could be calculated from image
            height: 280, // Default height, could be calculated from image
        }));

        return {
            previews,
            totalPages: data.totalPages
        };
    },

    rotate: async (file: File, options: any): Promise<ProcessingResult> => {
        // Always use client-side processing for rotate to properly handle
        // page objects with rotation angles
        const processor = await getClientProcessor();
        return processor.execute("rotate", [file], options);
    },

    watermark: async (file: File, options: any): Promise<ProcessingResult> => {
        const processor = await getClientProcessor();
        return processor.execute("watermark", [file], options);
    },

    sign: async (file: File, options: any): Promise<ProcessingResult> => {
        const processor = await getClientProcessor();
        return processor.execute("sign", [file], options);
    },

    redact: async (file: File, options: any): Promise<ProcessingResult> => {
        const processor = await getClientProcessor();
        return processor.execute("redact", [file], options);
    },

    repair: async (file: File, options?: any): Promise<ProcessingResult> => {
        const processor = await getClientProcessor();
        return processor.execute("repair", [file], options || {});
    },

    crop: async (file: File, options: any): Promise<ProcessingResult> => {
        const processor = await getClientProcessor();
        return processor.execute("crop", [file], options);
    },

    ocr: async (files: File[], options?: any): Promise<ProcessingResult> => {
        const processor = await getClientProcessor();
        return processor.execute("ocr", files, options || {});
    },

    organize: async (files: File[], options: any): Promise<ProcessingResult> => {
        // Always use client-side processing for organize to properly handle
        // page objects with originalIndex, rotation, and blank pages
        const processor = await getClientProcessor();
        return processor.execute("organize", files, options);
    },

    addPageNumbers: async (file: File, options: any): Promise<ProcessingResult> => {
        const processor = await getClientProcessor();
        return processor.execute("page-numbers", [file], options);
    },

    cleanMetadata: async (file: File, options?: any): Promise<ProcessingResult> => {
        const processor = await getClientProcessor();
        return processor.execute("clean-metadata", [file], options || {});
    },

    edit: async (file: File, options: any): Promise<ProcessingResult> => {
        const processor = await getClientProcessor();
        return processor.execute("edit", [file], options);
    },
};
