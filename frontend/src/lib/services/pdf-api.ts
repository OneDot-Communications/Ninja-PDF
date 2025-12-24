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

        console.warn("Backend API failed, falling back to client-side:", backendError);

        try {
            // Fallback to client-side processing
            const result = await clientFallback();
            return result;
        } catch (clientError: any) {
            // Suppress logging for password errors (expected during unlock attempts)
            if (clientError?.message !== 'Password incorrect') {
                console.error("Both backend and client-side processing failed:", clientError);
            }
            throw clientError;
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
        // Logic to determine filename...
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
            () => api.compressPdf(file, level),
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
    pdfToWord: createStandardConverter(api.pdfToWord, "pdf-to-word", ".docx"),
    pdfToExcel: async (file: File, options?: any) => {
        // FORCE BACKEND ONLY - for image embedding
        const response = await api.pdfToExcel(file);
        return {
            blob: response,
            fileName: file.name.replace(/\.[^/.]+$/, "") + ".xlsx"
        };
    },
    pdfToPowerpoint: async (file: File, options?: any) => {
        // FORCE BACKEND ONLY - Debugging
        const response = await api.pdfToPowerpoint(file, options);
        return {
            blob: response,
            fileName: file.name.replace(/\.[^/.]+$/, "") + ".pptx"
        };
    },

    pdfToJpg: async (file: File, options?: any): Promise<ProcessingResult> => {
        return withFallback(
            () => api.pdfToJpg(file),
            async () => {
                const processor = await getClientProcessor();
                return processor.execute("convert-from-pdf", [file], { format: "jpeg", dpi: 150, ...options });
            },
            file.name.replace(".pdf", "_images.zip")  // Backend returns ZIP with all pages
        );
    },

    pdfToPdfa: createStandardConverter(api.pdfToPdfa, "pdf-to-pdfa", "-pdfa.pdf"),
    pdfToHtml: createNoFallbackConverter(api.pdfToHtml, "HTML conversion not available offline", ".html"),

    // ─────────────────────────────────────────────────────────────────────────────
    // OTHER FORMATS TO PDF
    // ─────────────────────────────────────────────────────────────────────────────
    wordToPdf: async (file: File) => {
        // FORCE BACKEND ONLY
        const response = await api.wordToPdf(file);
        return {
            blob: response,
            fileName: file.name.replace(/\.(docx?|doc)$/i, ".pdf")
        };
    },
    excelToPdf: async (file: File) => {
        // FORCE BACKEND ONLY
        const response = await api.excelToPdf(file);
        return {
            blob: response,
            fileName: file.name.replace(/\.(xlsx?|xls)$/i, ".pdf")
        };
    },
    powerpointToPdf: async (file: File) => {
        // FORCE BACKEND ONLY
        const response = await api.powerpointToPdf(file);
        return {
            blob: response,
            fileName: file.name.replace(/\.(pptx?|ppt)$/i, ".pdf")
        };
    },
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
    protect: async (file: File, password: string | { userPassword?: string, ownerPassword?: string }, permissions: {
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
        const clientPermissions = {
            printing: permissions.allowPrinting,
            copying: permissions.allowCopying,
            modifying: permissions.allowModifying,
            annotating: permissions.allowAnnotating,
            fillingForms: permissions.allowFillingForms,
            contentAccessibility: permissions.allowAccessibility,
            documentAssembly: permissions.allowAssembly,
        };

        // Resolve passwords
        let userPassword = '';
        let ownerPassword = '';

        if (typeof password === 'string') {
            userPassword = password;
            ownerPassword = password;
        } else {
            userPassword = password.userPassword || '';
            ownerPassword = password.ownerPassword || userPassword || '';
        }

        const clientOptions = {
            userPassword,
            ownerPassword,
            permissions: clientPermissions
        };

        return withFallback(
            () => api.protectPdf(file, ownerPassword, backendPermissions),
            async () => {
                const processor = await getClientProcessor();
                return processor.execute("protect", [file], clientOptions);
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
        return withFallback(
            () => api.mergePdfs(files),
            async () => {
                const processor = await getClientProcessor();
                return processor.execute("merge", files, options || {});
            },
            "merged_document.pdf"
        );
    },

    split: async (file: File, options: any): Promise<ProcessingResult> => {
        const isSeparate = options.splitMode === 'separate';
        const extension = isSeparate ? '.zip' : '.pdf';
        const baseName = file.name.replace(/\.[^/.]+$/, "");
        const fileName = `split-${baseName}${extension}`;

        return withFallback(
            () => api.splitPdf(file, options.selectedPages || [], options.splitMode || 'merge'),
            async () => {
                const processor = await getClientProcessor();
                return processor.execute("split", [file], options);
            },
            fileName
        );
    },

    rotate: async (file: File, options: any): Promise<ProcessingResult> => {
        return withFallback(
            () => api.organizePdf(file, options.pages || []),
            async () => {
                const processor = await getClientProcessor();
                return processor.execute("rotate", [file], options);
            },
            `rotate-${file.name}`
        );
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

    organize: async (file: File, options: any): Promise<ProcessingResult> => {
        return withFallback(
            () => api.organizePdf(file, options.pages || []),
            async () => {
                const processor = await getClientProcessor();
                return processor.execute("organize", [file], options);
            },
            `organized-${file.name}`
        );
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
