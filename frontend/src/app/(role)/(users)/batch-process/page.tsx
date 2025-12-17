"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/services/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, FolderUp, Play, Pause, Download, Trash2, CheckCircle, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useDropzone } from "react-dropzone";

interface BatchJob {
    id: string;
    operation: string;
    status: string;
    total_files: number;
    completed_files: number;
    failed_files: number;
    progress: number;
    created_at: string;
    completed_at: string | null;
}

const OPERATIONS = [
    { value: "compress", label: "Compress PDFs", description: "Reduce file size" },
    { value: "ocr", label: "OCR PDFs", description: "Extract text from scanned documents" },
    { value: "merge", label: "Merge PDFs", description: "Combine into one document" },
    { value: "convert_to_word", label: "Convert to Word", description: "PDF to DOCX" },
    { value: "watermark", label: "Add Watermark", description: "Apply watermark to all pages" },
];

export default function BatchProcessingPage() {
    const [batches, setBatches] = useState<BatchJob[]>([]);
    const [loading, setLoading] = useState(true);
    const [files, setFiles] = useState<File[]>([]);
    const [operation, setOperation] = useState("compress");
    const [isProcessing, setIsProcessing] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    useEffect(() => {
        loadBatches();
        const interval = setInterval(loadBatches, 5000); // Poll for updates
        return () => clearInterval(interval);
    }, []);

    const loadBatches = async () => {
        try {
            const response = await api.get("/jobs/batch/list/");
            const data = response?.results || response || [];
            setBatches(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Failed to load batches");
        } finally {
            setLoading(false);
        }
    };

    const onDrop = useCallback((acceptedFiles: File[]) => {
        // Filter to only PDF files
        const pdfFiles = acceptedFiles.filter(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
        if (pdfFiles.length !== acceptedFiles.length) {
            toast.warning("Only PDF files are supported");
        }
        setFiles(prev => [...prev, ...pdfFiles].slice(0, 50)); // Max 50 files
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'application/pdf': ['.pdf'] },
        maxFiles: 50,
    });

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const startBatchJob = async () => {
        if (files.length === 0) {
            toast.error("Please add files first");
            return;
        }

        setIsProcessing(true);
        setUploadProgress(0);

        try {
            const formData = new FormData();
            formData.append("operation", operation);
            files.forEach(file => formData.append("files", file));

            const response = await api.post("/jobs/batch/", formData);


            toast.success(`Batch job created: ${response.batch_id}`);
            setFiles([]);
            setUploadProgress(0);
            loadBatches();
        } catch (error: any) {
            if (error?.response?.status === 403) {
                toast.error("Batch processing is a premium feature. Please upgrade.");
            } else {
                toast.error("Failed to start batch job");
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const cancelBatch = async (batchId: string) => {
        try {
            await api.post(`/jobs/batch/${batchId}/cancel/`);
            toast.success("Batch cancelled");
            loadBatches();
        } catch (error) {
            toast.error("Failed to cancel batch");
        }
    };

    const downloadBatch = async (batchId: string) => {
        try {
            const response = await api.get(`/jobs/batch/${batchId}/download/`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(response);
            const a = document.createElement('a');
            a.href = url;
            a.download = `batch_${batchId}_output.zip`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            toast.error("Failed to download");
        }
    };

    const StatusBadge = ({ status }: { status: string }) => {
        const styles: { [key: string]: string } = {
            PENDING: "bg-gray-100 text-gray-700",
            PROCESSING: "bg-blue-100 text-blue-700",
            COMPLETED: "bg-green-100 text-green-700",
            PARTIALLY_COMPLETED: "bg-yellow-100 text-yellow-700",
            FAILED: "bg-red-100 text-red-700",
            CANCELLED: "bg-gray-100 text-gray-700"
        };
        return <Badge className={styles[status] || styles.PENDING}>{status}</Badge>;
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Batch Processing</h1>
                <p className="text-muted-foreground">Process multiple PDF files at once (Premium Feature)</p>
            </div>

            {/* Upload Section */}
            <Card>
                <CardHeader>
                    <CardTitle>Create New Batch Job</CardTitle>
                    <CardDescription>Upload up to 50 PDF files to process in one batch</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Operation Select */}
                    <div className="max-w-md">
                        <label className="text-sm font-medium">Operation</label>
                        <Select value={operation} onValueChange={setOperation}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {OPERATIONS.map(op => (
                                    <SelectItem key={op.value} value={op.value}>
                                        <div>
                                            <div className="font-medium">{op.label}</div>
                                            <div className="text-xs text-muted-foreground">{op.description}</div>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Dropzone */}
                    <div
                        {...getRootProps()}
                        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                            ${isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"}`}
                    >
                        <input {...getInputProps()} />
                        <FolderUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        {isDragActive ? (
                            <p className="text-primary font-medium">Drop files here...</p>
                        ) : (
                            <div>
                                <p className="font-medium">Drag & drop PDF files here</p>
                                <p className="text-sm text-muted-foreground">or click to browse (max 50 files)</p>
                            </div>
                        )}
                    </div>

                    {/* File List */}
                    {files.length > 0 && (
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium">{files.length} file(s) selected</span>
                                <Button variant="ghost" size="sm" onClick={() => setFiles([])}>
                                    Clear All
                                </Button>
                            </div>
                            <div className="max-h-40 overflow-y-auto space-y-1">
                                {files.map((file, index) => (
                                    <div key={index} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                                        <span className="truncate flex-1">{file.name}</span>
                                        <span className="text-muted-foreground mx-2">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFile(index)}>
                                            <XCircle className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Progress */}
                    {isProcessing && (
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Uploading...</span>
                                <span>{uploadProgress.toFixed(0)}%</span>
                            </div>
                            <Progress value={uploadProgress} />
                        </div>
                    )}

                    {/* Submit Button */}
                    <Button
                        onClick={startBatchJob}
                        disabled={files.length === 0 || isProcessing}
                        className="w-full"
                    >
                        {isProcessing ? (
                            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</>
                        ) : (
                            <><Play className="h-4 w-4 mr-2" /> Start Batch Job</>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {/* Batch Jobs List */}
            <Card>
                <CardHeader>
                    <CardTitle>Your Batch Jobs</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                    ) : batches.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Clock className="h-12 w-12 mx-auto mb-4" />
                            <p>No batch jobs yet</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {batches.map(batch => (
                                <div key={batch.id} className="border rounded-lg p-4 space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium capitalize">{batch.operation.replace('_', ' ')}</span>
                                                <StatusBadge status={batch.status} />
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {batch.completed_files}/{batch.total_files} files •
                                                {batch.failed_files > 0 && ` ${batch.failed_files} failed •`}
                                                {" "}{new Date(batch.created_at).toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            {batch.status === 'PROCESSING' && (
                                                <Button variant="outline" size="sm" onClick={() => cancelBatch(batch.id)}>
                                                    <Pause className="h-4 w-4 mr-1" /> Cancel
                                                </Button>
                                            )}
                                            {(batch.status === 'COMPLETED' || batch.status === 'PARTIALLY_COMPLETED') && (
                                                <Button variant="outline" size="sm" onClick={() => downloadBatch(batch.id)}>
                                                    <Download className="h-4 w-4 mr-1" /> Download
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                    {batch.status === 'PROCESSING' && (
                                        <div className="space-y-1">
                                            <Progress value={batch.progress} />
                                            <p className="text-xs text-muted-foreground text-right">{batch.progress}%</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
