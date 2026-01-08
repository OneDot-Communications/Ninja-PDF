"use client";

import { useState, useRef, useEffect } from "react";
import { Header } from "@/components/layout/header";
import FileUploadHero from "@/components/ui/file-upload-hero";
import {
    ShieldCheck,
    User,
    Calendar,
    Settings,
    FileText,
    Trash2,
    CheckSquare,
    Square,
    Clock,
    Tag,
    Info
} from "lucide-react";

interface MetadataOption {
    id: string;
    label: string;
    description: string;
    checked: boolean;
    icon: React.ElementType;
}

interface MetadataField {
    id: string;
    name: string;
    value: string;
    icon: React.ElementType;
}

export default function MetadataCleanerPage() {
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Original metadata fields (extracted from PDF)
    const [metadataFields, setMetadataFields] = useState<MetadataField[]>([]);

    // Options state (UI only - visual representation)
    const [options, setOptions] = useState<MetadataOption[]>([
        {
            id: "author",
            label: "Remove author information",
            description: "Clears author name and contact details",
            checked: true,
            icon: User
        },
        {
            id: "dates",
            label: "Remove creation & modification dates",
            description: "Removes timestamps from the document",
            checked: true,
            icon: Calendar
        },
        {
            id: "software",
            label: "Remove software & device data",
            description: "Clears creator application and device info",
            checked: true,
            icon: Settings
        },
        {
            id: "custom",
            label: "Remove custom metadata fields",
            description: "Removes any additional metadata properties",
            checked: true,
            icon: FileText
        }
    ]);

    const handleFileSelected = async (files: File[]) => {
        const file = files.find(f => f.type === 'application/pdf');
        if (file) {
            setPdfFile(file);
            setIsAnalyzing(true);

            try {
                // Extract metadata from PDF
                const { getPdfJs } = await import('@/lib/services/pdf-service');
                const pdfjsLib = await getPdfJs();
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await (pdfjsLib as any).getDocument({
                    data: new Uint8Array(arrayBuffer),
                    verbosity: 0
                }).promise;

                const metadata = await pdf.getMetadata();
                const fields: MetadataField[] = [];

                // Author
                if (metadata.info?.Author) {
                    fields.push({
                        id: 'author',
                        name: 'Author',
                        value: metadata.info.Author,
                        icon: User
                    });
                }

                // Title
                if (metadata.info?.Title) {
                    fields.push({
                        id: 'title',
                        name: 'Title',
                        value: metadata.info.Title,
                        icon: FileText
                    });
                }

                // Subject
                if (metadata.info?.Subject) {
                    fields.push({
                        id: 'subject',
                        name: 'Subject',
                        value: metadata.info.Subject,
                        icon: Tag
                    });
                }

                // Keywords
                if (metadata.info?.Keywords) {
                    fields.push({
                        id: 'keywords',
                        name: 'Keywords',
                        value: metadata.info.Keywords,
                        icon: Tag
                    });
                }

                // Creator (Software)
                if (metadata.info?.Creator) {
                    fields.push({
                        id: 'creator',
                        name: 'Creator',
                        value: metadata.info.Creator,
                        icon: Settings
                    });
                }

                // Producer
                if (metadata.info?.Producer) {
                    fields.push({
                        id: 'producer',
                        name: 'Producer',
                        value: metadata.info.Producer,
                        icon: Settings
                    });
                }

                // Creation Date
                if (metadata.info?.CreationDate) {
                    try {
                        const dateStr = metadata.info.CreationDate;
                        // PDF date format: D:YYYYMMDDHHmmSS
                        let formattedDate = dateStr;
                        if (dateStr.startsWith('D:')) {
                            const parsed = dateStr.slice(2);
                            const year = parsed.slice(0, 4);
                            const month = parsed.slice(4, 6);
                            const day = parsed.slice(6, 8);
                            formattedDate = `${year}-${month}-${day}`;
                        }
                        fields.push({
                            id: 'creationDate',
                            name: 'Creation Date',
                            value: formattedDate,
                            icon: Calendar
                        });
                    } catch {
                        fields.push({
                            id: 'creationDate',
                            name: 'Creation Date',
                            value: metadata.info.CreationDate,
                            icon: Calendar
                        });
                    }
                }

                // Modification Date
                if (metadata.info?.ModDate) {
                    try {
                        const dateStr = metadata.info.ModDate;
                        let formattedDate = dateStr;
                        if (dateStr.startsWith('D:')) {
                            const parsed = dateStr.slice(2);
                            const year = parsed.slice(0, 4);
                            const month = parsed.slice(4, 6);
                            const day = parsed.slice(6, 8);
                            formattedDate = `${year}-${month}-${day}`;
                        }
                        fields.push({
                            id: 'modDate',
                            name: 'Modified Date',
                            value: formattedDate,
                            icon: Clock
                        });
                    } catch {
                        fields.push({
                            id: 'modDate',
                            name: 'Modified Date',
                            value: metadata.info.ModDate,
                            icon: Clock
                        });
                    }
                }

                // If no metadata found, show a placeholder
                if (fields.length === 0) {
                    fields.push({
                        id: 'none',
                        name: 'No Metadata',
                        value: 'This PDF has no embedded metadata',
                        icon: Info
                    });
                }

                setMetadataFields(fields);
            } catch (error) {
                console.error("Error extracting metadata:", error);
                setMetadataFields([{
                    id: 'error',
                    name: 'Error',
                    value: 'Could not extract metadata',
                    icon: Info
                }]);
            } finally {
                setIsAnalyzing(false);
            }
        }
    };

    const toggleOption = (id: string) => {
        setOptions(prev =>
            prev.map(opt => opt.id === id ? { ...opt, checked: !opt.checked } : opt)
        );
    };

    const reset = () => {
        setPdfFile(null);
        setMetadataFields([]);
        setOptions(prev => prev.map(opt => ({ ...opt, checked: true })));
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    // Upload View (Before file selection)
    if (!pdfFile) {
        return (
            <div className="flex min-h-screen flex-col bg-slate-50">
                <Header />
                <main className="flex-1 flex flex-col relative">
                    <div className="min-h-[calc(100vh-120px)] flex items-center justify-center">
                        <FileUploadHero
                            title="Metadata Cleaner"
                            description="Secure your documents by removing hidden metadata"
                            onFilesSelected={handleFileSelected}
                            maxFiles={1}
                            accept={{ "application/pdf": [".pdf"] }}
                        />
                    </div>
                </main>
            </div>
        );
    }

    // Main Tool View (After file selection)
    return (
        <div className="flex min-h-screen flex-col bg-slate-50">
            <Header />
            <main className="flex-1 relative">
                <div className="bg-[#f6f7f8] min-h-[calc(100vh-80px)]">
                    <div className="max-w-[1800px] mx-auto px-4 py-4 md:py-8">
                        <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
                            {/* Left Column - File Info & Options */}
                            <div className="flex-1 max-w-full lg:max-w-[1200px]">
                                {/* Control Bar */}
                                <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-[#e2e8f0] shadow-sm mb-4 p-4">
                                    <div className="flex items-center justify-between flex-wrap gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-[#4383BF]/10 flex items-center justify-center">
                                                    <ShieldCheck className="w-5 h-5 text-[#4383BF]" />
                                                </div>
                                                <div>
                                                    <span className="text-[#111418] font-bold text-lg block leading-tight">
                                                        {pdfFile.name}
                                                    </span>
                                                    <span className="text-[#617289] text-sm">
                                                        {(pdfFile.size / 1024).toFixed(1)} KB
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={reset}
                                                className="rounded-lg flex items-center gap-2 px-3 py-2 hover:bg-[#f0f2f4] transition-colors"
                                            >
                                                <Trash2 className="h-5 w-5 text-[#617289]" />
                                                <span className="text-[#617289] font-bold text-sm">Start Over</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Original Metadata Panel */}
                                <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-6">
                                    <h3 className="text-[#111418] font-bold text-lg mb-4 flex items-center gap-2">
                                        <FileText className="h-5 w-5" />
                                        Original Metadata
                                    </h3>

                                    {isAnalyzing ? (
                                        <div className="flex items-center justify-center py-8">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4383BF]"></div>
                                            <span className="ml-3 text-[#617289]">Analyzing...</span>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-[#e2e8f0]">
                                            {metadataFields.map((field) => (
                                                <div key={field.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                                                    <div className="flex items-center gap-2">
                                                        <field.icon className="h-4 w-4 text-[#617289]" />
                                                        <span className="text-[#617289] font-medium text-sm">
                                                            {field.name}
                                                        </span>
                                                    </div>
                                                    <span className="text-[#111418] font-bold text-sm text-right max-w-[60%] truncate" title={field.value}>
                                                        {field.value}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right Sidebar - Cleaning Options */}
                            <div className="hidden lg:block lg:w-[380px] lg:fixed lg:right-4 lg:top-24 lg:h-[calc(100vh-120px)] lg:z-10">
                                <div className="bg-white rounded-3xl border border-[#e2e8f0] p-6 h-full flex flex-col shadow-xl">
                                    <div className="mb-6">
                                        <h2 className="text-[#111418] font-bold text-lg flex items-center gap-2">
                                            <Settings className="h-5 w-5" />
                                            Cleaning Options
                                        </h2>
                                    </div>

                                    <div className="flex-1 space-y-3 overflow-y-auto">
                                        {options.map((option) => (
                                            <div
                                                key={option.id}
                                                className="p-4 rounded-xl border border-[#e2e8f0] cursor-pointer transition-all hover:bg-[#f8fafc]"
                                                onClick={() => toggleOption(option.id)}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className={`mt-0.5 rounded w-5 h-5 flex items-center justify-center border-2 transition-colors ${option.checked
                                                        ? 'bg-[#4383BF] border-[#4383BF]'
                                                        : 'bg-white border-[#cbd5e1]'
                                                        }`}>
                                                        {option.checked && (
                                                            <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                                                                <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <option.icon className="h-4 w-4 text-[#617289]" />
                                                            <span className="text-[#111418] font-bold text-sm">
                                                                {option.label}
                                                            </span>
                                                        </div>
                                                        <p className="text-[#617289] text-xs mt-1">
                                                            {option.description}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mt-6 space-y-3">
                                        <button
                                            className="w-full h-[52px] bg-[#4383BF] hover:bg-[#3A74A8] text-white rounded-xl flex items-center justify-center gap-2 font-bold text-base shadow-lg transition-colors"
                                        >
                                            <ShieldCheck className="h-5 w-5" />
                                            Clean Metadata
                                        </button>

                                        {/* Helper Text */}
                                        <p className="text-[#617289] text-xs text-center">
                                            Your file is processed securely. Metadata removal does not change visible content.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Mobile Action Button */}
                            <div className="lg:hidden fixed bottom-4 left-4 right-4 z-40">
                                <button
                                    className="w-full h-14 bg-[#4383BF] hover:bg-[#3A74A8] text-white rounded-xl flex items-center justify-center gap-2 font-bold text-base shadow-lg transition-colors"
                                >
                                    <ShieldCheck className="h-5 w-5" />
                                    Clean Metadata
                                </button>
                                <p className="text-[#617289] text-xs text-center mt-2 bg-white/90 p-2 rounded-lg">
                                    Your file is processed securely. Metadata removal does not change visible content.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main >
        </div >
    );
}
