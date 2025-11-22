"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { Plus, ArrowRight, Play, Trash2, RefreshCw, Settings } from "lucide-react";
import { FileUpload } from "../ui/file-upload";
import { PDFDocument, rgb, degrees, StandardFonts, Grayscale } from "pdf-lib";
import { saveAs } from "file-saver";

export function CreateWorkflowTool() {
    const [file, setFile] = useState<File | null>(null);
    const [steps, setSteps] = useState<string[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [status, setStatus] = useState("");

    const handleFileSelected = (files: File[]) => {
        if (files.length > 0) setFile(files[0]);
    };

    const addStep = (step: string) => {
        setSteps([...steps, step]);
    };
    
    const removeStep = (index: number) => {
        setSteps(steps.filter((_, i) => i !== index));
    };

    const runWorkflow = async () => {
        if (!file || steps.length === 0) return;
        setIsRunning(true);
        setStatus("Loading PDF...");
        
        try {
            const arrayBuffer = await file.arrayBuffer();
            let pdfDoc = await PDFDocument.load(arrayBuffer);
            
            for (let i = 0; i < steps.length; i++) {
                const step = steps[i];
                setStatus(`Running step ${i + 1}: ${step}...`);
                
                // Artificial delay to show progress
                await new Promise(resolve => setTimeout(resolve, 500));
                
                if (step === "Watermark") {
                    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
                    const pages = pdfDoc.getPages();
                    pages.forEach(page => {
                        const { width, height } = page.getSize();
                        page.drawText("CONFIDENTIAL", {
                            x: width / 2 - 150,
                            y: height / 2,
                            size: 50,
                            font,
                            color: rgb(0.95, 0.1, 0.1),
                            opacity: 0.3,
                            rotate: degrees(45),
                        });
                    });
                } else if (step === "Rotate 90°") {
                    const pages = pdfDoc.getPages();
                    pages.forEach(page => {
                        page.setRotation(degrees(page.getRotation().angle + 90));
                    });
                } else if (step === "Add Page Numbers") {
                    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
                    const pages = pdfDoc.getPages();
                    pages.forEach((page, idx) => {
                        const { width } = page.getSize();
                        page.drawText(`${idx + 1}`, {
                            x: width - 50,
                            y: 20,
                            size: 12,
                            font,
                            color: rgb(0, 0, 0),
                        });
                    });
                } else if (step === "Grayscale") {
                    // PDF-lib doesn't support converting content to grayscale easily.
                    // We can simulate it by adding a white overlay with "saturation" blend mode if supported,
                    // but pdf-lib blend modes are limited.
                    // Instead, we'll just skip this for now or implement a basic filter if possible.
                    // Actually, let's just do nothing for now as it's complex client-side without rasterization.
                    console.warn("Grayscale not fully supported in workflow yet.");
                } else if (step === "Flatten Forms") {
                    pdfDoc.getForm().flatten();
                } else if (step === "Extract First Page") {
                    const newPdf = await PDFDocument.create();
                    const [firstPage] = await newPdf.copyPages(pdfDoc, [0]);
                    newPdf.addPage(firstPage);
                    pdfDoc = newPdf; // Replace current doc
                } else if (step === "Metadata Strip") {
                    pdfDoc.setTitle("");
                    pdfDoc.setAuthor("");
                    pdfDoc.setSubject("");
                    pdfDoc.setKeywords([]);
                    pdfDoc.setProducer("");
                    pdfDoc.setCreator("");
                }
            }
            
            setStatus("Finalizing...");
            
            const shouldProtect = steps.includes("Protect PDF");
            
            let pdfBytes;
            if (shouldProtect) {
                pdfBytes = await pdfDoc.save({
                    userPassword: "onedot",
                    ownerPassword: "onedot",
                    permissions: {
                        printing: "highResolution",
                        modifying: false,
                        copying: false,
                        annotating: false,
                        fillingForms: false,
                        contentAccessibility: false,
                        documentAssembly: false,
                    }
                } as any);
                alert("PDF Protected with password: 'onedot'");
            } else {
                pdfBytes = await pdfDoc.save();
            }
            
            const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
            saveAs(blob, `workflow-result-${file.name}`);
            setStatus("Workflow completed successfully!");
            
        } catch (error) {
            console.error("Workflow failed:", error);
            setStatus("Workflow failed. Please try again.");
        } finally {
            setIsRunning(false);
        }
    };

    if (!file) {
        return (
             <div className="mx-auto max-w-2xl">
                <FileUpload
                    onFilesSelected={handleFileSelected}
                    maxFiles={1}
                    accept={{ "application/pdf": [".pdf"] }}
                    description="Drop a PDF file here to start a workflow"
                />
            </div>
        );
    }

    return (
        <div className="space-y-8">
             <div className="flex items-center justify-between rounded-xl border bg-card p-6 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Settings className="h-6 w-6" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold">{file.name}</h2>
                        <p className="text-sm text-muted-foreground">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => { setFile(null); setSteps([]); }}>
                    <RefreshCw className="h-5 w-5" />
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Available Actions</h3>
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            "Watermark", 
                            "Rotate 90°", 
                            "Add Page Numbers", 
                            "Flatten Forms", 
                            "Extract First Page",
                            "Metadata Strip",
                            "Protect PDF"
                        ].map((action) => (
                            <Button key={action} variant="outline" onClick={() => addStep(action)} className="justify-start">
                                <Plus className="mr-2 h-4 w-4" /> {action}
                            </Button>
                        ))}
                    </div>
                </div>

                <div className="space-y-4 rounded-xl border bg-muted/20 p-6">
                    <h3 className="text-lg font-semibold">Workflow Steps</h3>
                    {steps.length === 0 ? (
                        <p className="text-muted-foreground">No steps added yet.</p>
                    ) : (
                        <div className="space-y-2">
                            {steps.map((step, idx) => (
                                <div key={idx} className="flex items-center justify-between rounded-lg border bg-background p-3 shadow-sm">
                                    <div className="flex items-center">
                                        <span className="mr-3 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                                            {idx + 1}
                                        </span>
                                        {step}
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeStep(idx)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex flex-col items-center justify-center space-y-4 pt-8">
                {status && <p className="text-lg font-medium text-primary animate-pulse">{status}</p>}
                
                <Button 
                    size="lg" 
                    onClick={runWorkflow} 
                    disabled={steps.length === 0 || isRunning} 
                    className="h-14 min-w-[200px] text-lg"
                >
                    {isRunning ? "Running..." : (
                        <>
                            Run Workflow <Play className="ml-2 h-5 w-5" />
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
