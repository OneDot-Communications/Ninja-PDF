"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { saveAs } from "file-saver";
import { FileUpload } from "../ui/file-upload";
import { Button } from "../ui/button";
import { 
    FileText, 
    ChevronLeft, 
    ChevronRight, 
    ZoomIn,
    ZoomOut,
    Maximize,
    Grid3x3,
    Settings,
    Undo,
    Redo,
    Download,
    X,
    Move,
    Square as SquareIcon,
    Monitor,
    Smartphone,
    Tablet,
    Sliders,
    HelpCircle,
    Sun,
    Moon,
    Layers,
    History,
    Scan,
    Command,
    ShieldCheck,
    Shield,
    ShieldOff,
    Eye,
    EyeOff,
    Eraser,
    RefreshCw,
    Trash2,
    Copy,
    CheckSquare,
    Square,
    LayoutGrid,
    List,
    User,
    Calendar,
    Clock,
    MapPin,
    Tag,
    Hash,
    File,
    Info,
    AlertTriangle,
    CheckCircle
} from "lucide-react";
import { pdfStrategyManager, getPdfJs } from "../../lib/pdf-service";
import { toast } from "../../lib/use-toast";
import { cn } from "../../lib/utils";

// Metadata field interface
interface MetadataField {
    id: string;
    name: string;
    value: string;
    type: "text" | "date";
    removable: boolean;
}

// History state for undo/redo
interface HistoryState {
    metadataFields: MetadataField[];
}

export function MetadataCleanerTool() {
    // File and PDF state
    const [file, setFile] = useState<File | null>(null);
    const [pdfProxy, setPdfProxy] = useState<any>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [numPages, setNumPages] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [zoom, setZoom] = useState(100);
    
    // Canvas refs
    const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    
    // Metadata state
    const [metadataFields, setMetadataFields] = useState<MetadataField[]>([]);
    const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [metadataAnalysis, setMetadataAnalysis] = useState<any>(null);
    
    // UI state
    const [showToolbar, setShowToolbar] = useState(true);
    const [showProperties, setShowProperties] = useState(true);
    const [darkMode, setDarkMode] = useState(false);
    const [deviceView, setDeviceView] = useState<"desktop" | "tablet" | "mobile">("desktop");
    const [showGrid, setShowGrid] = useState(false);
    const [showPageNumbers, setShowPageNumbers] = useState(true);
    const [viewMode, setViewMode] = useState<"metadata" | "preview">("metadata");
    
    // History state for undo/redo
    const [history, setHistory] = useState<HistoryState[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    const handleFileSelected = async (files: File[]) => {
        if (files.length > 0) {
            const selectedFile = files[0];
            setFile(selectedFile);
            setCurrentPage(1);
            
            try {
                const pdfjsLib = await getPdfJs();
                const arrayBuffer = await selectedFile.arrayBuffer();
                const pdf = await (pdfjsLib as any).getDocument({
                    data: new Uint8Array(arrayBuffer),
                    verbosity: 0
                }).promise;
                setPdfProxy(pdf);
                setNumPages(pdf.numPages);
                
                // Initialize canvas refs
                canvasRefs.current = Array(pdf.numPages).fill(null);
                
                // Analyze metadata
                await analyzeMetadata(pdf);
            } catch (error: any) {
                console.error("Error loading PDF:", error);
                setFile(null);
                setPdfProxy(null);
                
                let errorMessage = "Failed to load PDF. Please try again.";
                if (error.message?.includes('Invalid PDF structure') || error.name === 'InvalidPDFException') {
                    errorMessage = "The PDF file appears to be corrupted. Try using the Repair PDF tool first.";
                } else if (error.message?.includes('password') || error.name === 'PasswordException') {
                    errorMessage = "The PDF is password-protected. Please remove the password first.";
                } else if (error.message?.includes('encrypted')) {
                    errorMessage = "The PDF is encrypted and cannot be processed.";
                }

                toast.show({
                    title: "Load Failed",
                    message: errorMessage,
                    variant: "error",
                    position: "top-right",
                });
            }
        }
    };

    // Helper: determine risk class for a field value
    const getRiskClass = (value: string) => {
        const v = (value || '').toLowerCase();
        return (v.includes('ssn') || v.includes('social security') || v.includes('tax id') || v.includes('address') || v.includes('phone') || v.includes('email'))
            ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800';
    };

    const isHighRisk = (value: string) => {
        const v = (value || '').toLowerCase();
        return (v.includes('ssn') || v.includes('social security') || v.includes('tax id') || v.includes('address') || v.includes('phone') || v.includes('email'));
    };

    // Analyze PDF metadata
    const analyzeMetadata = async (pdf: any) => {
        setIsAnalyzing(true);
        
        try {
            // Get metadata from PDF
            const metadata = await pdf.getMetadata();
            
            // Convert metadata to fields
            const fields: MetadataField[] = [];
            
            // Author
            if (metadata.info.Author) {
                fields.push({
                    id: 'author',
                    name: 'Author',
                    value: metadata.info.Author,
                    type: 'text',
                    removable: true
                });
            }
            
            // Title
            if (metadata.info.Title) {
                fields.push({
                    id: 'title',
                    name: 'Title',
                    value: metadata.info.Title,
                    type: 'text',
                    removable: true
                });
            }
            
            // Subject
            if (metadata.info.Subject) {
                fields.push({
                    id: 'subject',
                    name: 'Subject',
                    value: metadata.info.Subject,
                    type: 'text',
                    removable: true
                });
            }
            
            // Keywords
            if (metadata.info.Keywords) {
                fields.push({
                    id: 'keywords',
                    name: 'Keywords',
                    value: metadata.info.Keywords,
                    type: 'text',
                    removable: true
                });
            }
            
            // Creator
            if (metadata.info.Creator) {
                fields.push({
                    id: 'creator',
                    name: 'Creator',
                    value: metadata.info.Creator,
                    type: 'text',
                    removable: true
                });
            }
            
            // Producer
            if (metadata.info.Producer) {
                fields.push({
                    id: 'producer',
                    name: 'Producer',
                    value: metadata.info.Producer,
                    type: 'text',
                    removable: true
                });
            }
            
            // Creation Date
            if (metadata.info.CreationDate) {
                fields.push({
                    id: 'creationDate',
                    name: 'Creation Date',
                    value: new Date(metadata.info.CreationDate).toLocaleString(),
                    type: 'date',
                    removable: true
                });
            }
            
            // Modification Date
            if (metadata.info.ModDate) {
                fields.push({
                    id: 'modificationDate',
                    name: 'Modification Date',
                    value: new Date(metadata.info.ModDate).toLocaleString(),
                    type: 'date',
                    removable: true
                });
            }
            
            // Add non-removable fields
            fields.push({
                id: 'pageCount',
                name: 'Page Count',
                value: pdf.numPages.toString(),
                type: 'text',
                removable: false
            });
            
            fields.push({
                id: 'fileSize',
                name: 'File Size',
                value: formatFileSize(file?.size || 0),
                type: 'text',
                removable: false
            });
            
            setMetadataFields(fields);
            setMetadataAnalysis({
                riskLevel: calculateRiskLevel(fields),
                fieldsCount: fields.filter(f => f.removable).length,
                hasPersonalInfo: hasPersonalInfo(fields)
            });
            
            // Initialize history
            setHistory([{
                metadataFields: fields
            }]);
            setHistoryIndex(0);
        } catch (error) {
            console.error("Error analyzing metadata:", error);
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Format file size
    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Calculate risk level based on metadata
    const calculateRiskLevel = (fields: MetadataField[]): "low" | "medium" | "high" => {
        let score = 0;
        
        // Check for personal identifiers
        const personalKeywords = ['ssn', 'social security', 'tax id', 'personal', 'confidential'];
        const allValues = fields.map(f => f.value.toLowerCase()).join(' ');
        
        for (const keyword of personalKeywords) {
            if (allValues.includes(keyword)) {
                score += 30;
            }
        }
        
        // Check for email addresses
        const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
        if (emailRegex.test(allValues)) {
            score += 20;
        }
        
        // Check for phone numbers
        const phoneRegex = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g;
        if (phoneRegex.test(allValues)) {
            score += 15;
        }
        
        // Check for addresses
        const addressKeywords = ['address', 'street', 'city', 'state', 'zip'];
        for (const keyword of addressKeywords) {
            if (allValues.includes(keyword)) {
                score += 10;
            }
        }
        
        if (score >= 30) return "high";
        if (score >= 15) return "medium";
        return "low";
    };

    // Check if metadata contains personal information
    const hasPersonalInfo = (fields: MetadataField[]): boolean => {
        const allValues = fields.map(f => f.value.toLowerCase()).join(' ');
        
        // Check for common personal identifiers
        const personalKeywords = [
            'john', 'jane', 'mr', 'mrs', 'dr', 'prof', 'ssn', 'social security',
            'tax id', 'personal', 'confidential', 'private', 'address', 'street',
            'phone', 'email', 'birth', 'age', 'gender', 'nationality'
        ];
        
        for (const keyword of personalKeywords) {
            if (allValues.includes(keyword)) {
                return true;
            }
        }
        
        return false;
    };

    useEffect(() => {
        if (!file || !pdfProxy) return;

        const renderAllPages = async () => {
            // Apply zoom
            const scale = zoom / 100;
            
            // Render each page
            for (let i = 0; i < pdfProxy.numPages; i++) {
                const page = await pdfProxy.getPage(i + 1);
                const viewport = page.getViewport({ scale });
                
                // Get or create canvas
                let canvas = canvasRefs.current[i];
                
                if (!canvas) continue;
                
                const context = canvas.getContext("2d")!;
                
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                
                await page.render({
                    canvasContext: context,
                    viewport: viewport,
                    canvas: canvas,
                }).promise;
            }
        };
        
        renderAllPages();
    }, [file, pdfProxy, zoom]);

    // Save current state to history
    const saveToHistory = useCallback(() => {
        const newState = {
            metadataFields: [...metadataFields]
        };
        
        // Remove any states after the current index
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(newState);
        
        // Limit history to 20 states
        if (newHistory.length > 20) {
            newHistory.shift();
        }
        
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    }, [metadataFields, history, historyIndex]);

    // Undo
    const undo = useCallback(() => {
        if (historyIndex > 0) {
            const prevState = history[historyIndex - 1];
            setMetadataFields(prevState.metadataFields);
            setHistoryIndex(historyIndex - 1);
        }
    }, [historyIndex, history]);

    // Redo
    const redo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            const nextState = history[historyIndex + 1];
            setMetadataFields(nextState.metadataFields);
            setHistoryIndex(historyIndex + 1);
        }
    }, [historyIndex, history]);

    // Fit to page
    const fitToPage = () => {
        setZoom(100);
    };

    // Update field value
    const updateFieldValue = (id: string, value: string) => {
        saveToHistory();
        setMetadataFields(prev => prev.map(field => 
            field.id === id ? { ...field, value } : field
        ));
    };

    // Remove field
    const removeField = (id: string) => {
        saveToHistory();
        setMetadataFields(prev => prev.filter(field => field.id !== id));
        if (selectedFieldId === id) setSelectedFieldId(null);
    };

    // Clean all metadata
    const cleanAllMetadata = () => {
        saveToHistory();
        setMetadataFields(prev => prev.map(field => 
            field.removable ? { ...field, value: '' } : field
        ));
    };

    // Clean PDF metadata
    const cleanPdfMetadata = async () => {
        if (!file) return;
        setIsProcessing(true);

        try {
            const result = await pdfStrategyManager.execute('clean-metadata', [file], {
                metadataFields
            });

            saveAs(result.blob, result.fileName || `cleaned-${file.name}`);
            
            toast.show({
                title: "Success",
                message: "PDF metadata cleaned successfully!",
                variant: "success",
                position: "top-right",
            });
        } catch (error: any) {
            console.error("Error cleaning metadata:", error);

            let errorMessage = "Failed to clean PDF metadata. Please try again.";
            if (error.message?.includes('corrupted') || error.message?.includes('Invalid PDF structure')) {
                errorMessage = "The PDF file appears to be corrupted. Try using the Repair PDF tool first.";
            } else if (error.message?.includes('encrypted') || error.message?.includes('password')) {
                errorMessage = "The PDF is encrypted. Please use the Unlock PDF tool first.";
            }

            toast.show({
                title: "Operation Failed",
                message: errorMessage,
                variant: "error",
                position: "top-right",
            });
        } finally {
            setIsProcessing(false);
        }
    };

    // If no file, show file upload
    if (!file) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] bg-linear-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
                <div className="max-w-md w-full p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl">
                    <div className="flex items-center justify-center mb-6">
                        <div className="p-4 bg-blue-100 dark:bg-blue-900 rounded-full">
                            <ShieldCheck className="h-12 w-12 text-blue-600 dark:text-blue-400" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-center mb-2 text-gray-900 dark:text-white">Clean PDF Metadata</h1>
                    <p className="text-center text-gray-600 dark:text-gray-400 mb-6">Upload a PDF to clean metadata</p>
                    <FileUpload
                        onFilesSelected={handleFileSelected}
                        maxFiles={1}
                        accept={{ "application/pdf": [".pdf"] }}
                        description="Drop a PDF file here or click to browse"
                    />
                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Remove sensitive information from PDF metadata
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={cn(
            "flex flex-col h-[calc(100vh-64px)]",
            darkMode ? "dark" : ""
        )}>
            {/* Floating Toolbar */}
            <div className={cn(
                "fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-2 transition-all duration-300",
                showToolbar ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"
            )}>
                <div className="flex items-center gap-1">
                    {/* Navigation */}
                    <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1 mr-2">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8" 
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} 
                            disabled={currentPage === 1}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-medium px-2 min-w-20 text-center text-gray-700 dark:text-gray-300">
                            {currentPage} / {numPages}
                        </span>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8" 
                            onClick={() => setCurrentPage(Math.min(numPages, currentPage + 1))} 
                            disabled={currentPage === numPages}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                    
                    {/* View Mode */}
                    <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1 mr-2">
                        <Button 
                            variant={viewMode === 'metadata' ? 'secondary' : 'ghost'} 
                            size="icon" 
                            className="h-8 w-8" 
                            onClick={() => setViewMode('metadata')}
                            title="Metadata View"
                        >
                            <List className="h-4 w-4" />
                        </Button>
                        <Button 
                            variant={viewMode === 'preview' ? 'secondary' : 'ghost'} 
                            size="icon" 
                            className="h-8 w-8" 
                            onClick={() => setViewMode('preview')}
                            title="Preview View"
                        >
                            <Eye className="h-4 w-4" />
                        </Button>
                    </div>
                    
                    {/* Zoom Controls */}
                    <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8" 
                            onClick={() => setZoom(Math.max(25, zoom - 25))}
                        >
                            <ZoomOut className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-medium px-2 min-w-[60px] text-center text-gray-700 dark:text-gray-300">{zoom}%</span>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8" 
                            onClick={() => setZoom(Math.min(200, zoom + 25))}
                        >
                            <ZoomIn className="h-4 w-4" />
                        </Button>
                        <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8" 
                            onClick={fitToPage} 
                            title="Fit to Page"
                        >
                            <Maximize className="h-4 w-4" />
                        </Button>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-1 ml-2">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8" 
                            onClick={undo} 
                            disabled={historyIndex <= 0}
                            title="Undo"
                        >
                            <Undo className="h-4 w-4" />
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8" 
                            onClick={redo} 
                            disabled={historyIndex >= history.length - 1}
                            title="Redo"
                        >
                            <Redo className="h-4 w-4" />
                        </Button>
                        <Button 
                            onClick={cleanPdfMetadata} 
                            disabled={isProcessing} 
                            className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {isProcessing ? "Processing..." : <><Download className="h-4 w-4 mr-1" /> Clean & Save</>}
                        </Button>
                    </div>
                </div>
            </div>
            
            {/* Properties Panel */}
            <div className={cn(
                "fixed right-4 top-20 z-40 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 w-80 transition-all duration-300",
                showProperties ? "opacity-100 translate-x-0" : "opacity-0 translate-x-2 pointer-events-none"
            )}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Metadata Properties</h3>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6" 
                        onClick={() => setShowProperties(false)}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
                
                {/* Metadata Analysis */}
                {metadataAnalysis && (
                    <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Risk Level</span>
                            <div className={cn(
                                "px-2 py-1 rounded text-xs font-medium",
                                metadataAnalysis.riskLevel === 'low' ? "bg-green-100 text-green-800" :
                                metadataAnalysis.riskLevel === 'medium' ? "bg-yellow-100 text-yellow-800" :
                                "bg-red-100 text-red-800"
                            )}>
                                {metadataAnalysis.riskLevel === 'low' ? "Low Risk" :
                                 metadataAnalysis.riskLevel === 'medium' ? "Medium Risk" :
                                 "High Risk"}
                            </div>
                        </div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Personal Info</span>
                            <div className={cn(
                                "px-2 py-1 rounded text-xs font-medium",
                                metadataAnalysis.hasPersonalInfo ? "bg-red-100 text-red-800" :
                                "bg-green-100 text-green-800"
                            )}>
                                {metadataAnalysis.hasPersonalInfo ? "Detected" : "Not Detected"}
                            </div>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                            {metadataAnalysis.fieldsCount} fields can be removed
                        </div>
                    </div>
                )}
                
                {/* Metadata Fields */}
                <div className="space-y-3 max-h-64 overflow-auto">
                    {metadataFields.map((field) => (
                        <div key={field.id} className="border-b border-gray-200 dark:border-gray-700 pb-3">
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    {field.type === 'text' && <FileText className="h-4 w-4 text-gray-500" />}
                                    {field.type === 'date' && <Calendar className="h-4 w-4 text-gray-500" />}
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{field.name}</span>
                                </div>
                                {field.removable && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => removeField(field.id)}
                                        title="Remove Field"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                {field.removable ? (
                                    <input
                                        type="text"
                                        value={field.value}
                                        onChange={(e) => updateFieldValue(field.id, e.target.value)}
                                        className="flex-1 h-8 rounded border border-gray-300 dark:border-gray-500 px-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                                        placeholder={field.type === 'text' ? "Enter text" : "Date will be formatted automatically"}
                                    />
                                ) : (
                                    <div className="flex-1 h-8 rounded border border-gray-300 dark:border-gray-500 px-3 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-sm flex items-center">
                                        {field.value}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                
                {/* Clean All Button */}
                <div className="pt-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={cleanAllMetadata}
                        className="w-full"
                    >
                        <Eraser className="h-4 w-4 mr-2" />
                        Clear All Removable Fields
                    </Button>
                </div>
            </div>
            
            {/* Main Canvas Area */}
            <div 
                ref={scrollContainerRef}
                className="flex-1 bg-gray-50 dark:bg-gray-900 overflow-auto p-8 relative"
            >
                <div className="flex flex-col items-center">
                    {viewMode === 'metadata' && (
                        <div className="w-full max-w-2xl space-y-4">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-2xl font-bold">{file.name}</h2>
                                    <p className="text-muted-foreground">
                                        {isAnalyzing ? "Analyzing metadata..." : "Metadata ready for cleaning"}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" onClick={() => setFile(null)}>
                                        Change File
                                    </Button>
                                </div>
                            </div>
                            
                            <div className="rounded-xl border bg-card p-6 space-y-4">
                                <div className="flex items-start gap-4">
                                    <div className="rounded-full bg-primary/10 p-3">
                                        <ShieldCheck className="h-6 w-6 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold">Privacy Protection</h3>
                                        <p className="mt-2 text-sm text-muted-foreground">
                                            Remove potentially sensitive information from your PDF metadata before sharing.
                                        </p>
                                        <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground space-y-1">
                                            <li>Author Name</li>
                                            <li>Title & Subject</li>
                                            <li>Keywords</li>
                                            <li>Creator & Producer Application</li>
                                            <li>Creation & Modification Dates</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                            
                            {isAnalyzing ? (
                                <div className="flex items-center justify-center h-40">
                                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent mr-3"></div>
                                    <span className="text-lg font-medium">Analyzing metadata...</span>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium">Removable Fields</span>
                                        <span className="text-sm text-muted-foreground">
                                            {metadataFields.filter(f => f.removable).length} fields
                                        </span>
                                    </div>
                                    
                                    <div className="border rounded-lg p-3">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b">
                                                    <th className="text-left p-2">Field</th>
                                                    <th className="text-left p-2">Value</th>
                                                    <th className="text-left p-2">Risk</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {metadataFields.filter(f => f.removable).map((field) => (
                                                    <tr key={field.id} className="border-b">
                                                        <td className="p-2">{field.name}</td>
                                                        <td className="p-2 max-w-xs truncate">{field.value}</td>
                                                        <td className="p-2">
                                                            <div className={cn(
                                                                "px-2 py-1 rounded text-xs font-medium inline-block",
                                                                field.value.toLowerCase().includes('ssn') || 
                                                                field.value.toLowerCase().includes('social security') || 
                                                                field.value.toLowerCase().includes('tax id') ||
                                                                field.value.toLowerCase().includes('address') ||
                                                                field.value.toLowerCase().includes('phone') ||
                                                                field.value.toLowerCase().includes('email') ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
                                                            )}>
                                                                {field.value.toLowerCase().includes('ssn') || 
                                                                field.value.toLowerCase().includes('social security') || 
                                                                field.value.toLowerCase().includes('tax id') ||
                                                                field.value.toLowerCase().includes('address') ||
                                                                field.value.toLowerCase().includes('phone') ||
                                                                field.value.toLowerCase().includes('email') ? "High" : "Low"}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    {/* Preview removed temporarily for syntax checks; will restore later */}
                </div>
            </div>
            
            {/* Settings Panel */}
            <div className="fixed bottom-4 left-4 z-40">
                <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setShowToolbar(!showToolbar)}
                        title={showToolbar ? "Hide Toolbar" : "Show Toolbar"}
                    >
                        <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setShowProperties(!showProperties)}
                        title={showProperties ? "Hide Properties" : "Show Properties"}
                    >
                        <Sliders className="h-4 w-4" />
                    </Button>
                    <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setDarkMode(!darkMode)}
                        title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                    >
                        {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                            if (deviceView === 'desktop') setDeviceView('tablet');
                            else if (deviceView === 'tablet') setDeviceView('mobile');
                            else setDeviceView('desktop');
                        }}
                        title={`View Mode: ${deviceView}`}
                    >
                        {deviceView === 'desktop' && <Monitor className="h-4 w-4" />}
                        {deviceView === 'tablet' && <Tablet className="h-4 w-4" />}
                        {deviceView === 'mobile' && <Smartphone className="h-4 w-4" />}
                    </Button>
                </div>
            </div>
            
            {/* Help Button */}
            <div className="fixed bottom-4 right-4 z-40">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-full bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700"
                    onClick={() => {
                        toast.show({
                            title: "Clean Metadata Help",
                            message: "Remove sensitive information from PDF metadata. The tool analyzes potential privacy risks and helps you clean specific fields.",
                            variant: "success",
                            position: "top-right",
                        });
                    }}
                    title="Help"
                >
                    <HelpCircle className="h-5 w-5" />
                </Button>
            </div>
        </div>
    );
}