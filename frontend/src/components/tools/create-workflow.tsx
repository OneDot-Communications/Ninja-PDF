"use client";

import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Plus, ArrowRight, Play, Trash2, RefreshCw, Settings, Save, ChevronDown } from "lucide-react";
import { FileUpload } from "../ui/file-upload";
import { PDFDocument, rgb, degrees, StandardFonts, Grayscale } from "pdf-lib";
import { saveAs } from "file-saver";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { api } from "@/app/lib/api";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";

export function CreateWorkflowTool() {
    const [file, setFile] = useState<File | null>(null);
    const [steps, setSteps] = useState<string[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [status, setStatus] = useState("");

    // Save state
    const [isSaveOpen, setIsSaveOpen] = useState(false);
    const [wfName, setWfName] = useState("");
    const [wfDesc, setWfDesc] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // Run Prompt state
    const [isRunPromptOpen, setIsRunPromptOpen] = useState(false);
    const [runPromptName, setRunPromptName] = useState("");

    // Password Prompt State
    const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
    const [passwordInput, setPasswordInput] = useState("");
    const [passwordResolver, setPasswordResolver] = useState<((value: string | null) => void) | null>(null);

    const router = useRouter();
    const searchParams = useSearchParams();
    const loadId = searchParams.get('load');



    useEffect(() => {
        if (loadId) {
            // Fetch workflow details
            api.getWorkflows().then(wfs => {
                // Determine which workflow to load. Optimally we should have getWorkflow(id) but iterating is fine for small lists
                const match = wfs.find((w: any) => w.id === loadId || w.id === Number(loadId));
                if (match && match.definition?.steps) {
                    setSteps(match.definition.steps);
                    setWfName(match.name);
                    setWfDesc(match.description);
                    toast.success(`Loaded workflow: ${match.name}`);
                }
            });
        }
    }, [loadId]);

    const handleFileSelected = (files: File[]) => {
        if (files.length > 0) setFile(files[0]);
    };

    const addStep = (action: string) => {
        const multiUseTools = ["Rotate 90°", "Remove Last Page", "Reverse Order"];
        if (steps.includes(action) && !multiUseTools.includes(action)) {
            toast.error(`${action} can only be added once.`);
            return;
        }
        setSteps([...steps, action]);
    };

    const removeStep = (index: number) => {
        setSteps(steps.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        if (!wfName) {
            toast.error("Please enter a workflow name");
            return;
        }

        try {
            setIsSaving(true);
            await api.createWorkflow({
                name: wfName,
                description: wfDesc,
                definition: { steps: steps } // Save steps in definition since model uses definition field
            });
            toast.success("Workflow saved successfully!");
            setIsSaveOpen(false);
            router.push('/profile/workflows');
        } catch (error) {
            console.error(error);
            toast.error("Failed to save workflow");
        } finally {
            setIsSaving(false);
        }
    };

    const handlePasswordSubmit = () => {
        if (passwordResolver) {
            passwordResolver(passwordInput);
        }
    };

    const executeWorkflow = async (nameOverride: string | null) => {
        setIsRunPromptOpen(false);
        if (!file || steps.length === 0) return;

        setIsRunning(true);
        setStatus("Saving & Processing...");

        // Auto-save: Ensure every run is persisted
        try {
            // If nameOverride provided (Save & Run), use it. 
            // If null (Run as Draft), use timestamp.
            // If wfName already set (Running existing), use it.
            const finalName = nameOverride || wfName || `Draft Run ${new Date().toLocaleString()}`;
            const finalDesc = wfDesc || (nameOverride ? "Saved from run prompt" : "Auto-saved draft");

            if (loadId) {
                // Update existing
                const updateData: any = {
                    definition: { steps: steps }
                };
                if (nameOverride) updateData.name = finalName;

                await api.updateWorkflow(Number(loadId), updateData);
                if (nameOverride) setWfName(finalName);
            } else {
                // Create new
                const p = await api.createWorkflow({
                    name: finalName,
                    description: finalDesc,
                    definition: { steps: steps }
                });
                // If we just created it, we should probably switch to "edit mode" for this new ID to prevent further duplicates
                // But for now, just auto-saving is enough. 
                // Ideally: router.replace(`/create-workflow?load=${p.id}`) but that might reload page.
                if (nameOverride) setWfName(finalName);
            }

        } catch (err) {
            console.error("Auto-save failed:", err);
        }

        // Log Run for existing workflow (if we loaded it)
        if (loadId) {
            try {
                await api.logRun(Number(loadId));
            } catch (e) {
                console.error("Failed to log run timestamp", e);
            }
        }

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
                } else if (step === "Remove Last Page") {
                    const pageCount = pdfDoc.getPageCount();
                    if (pageCount > 1) {
                        pdfDoc.removePage(pageCount - 1);
                    }
                } else if (step === "Reverse Order") {
                    const pageCount = pdfDoc.getPageCount();
                    const existingPages = pdfDoc.getPages();
                    // Setup new doc
                    const newPdf = await PDFDocument.create();
                    // Copy pages in reverse
                    const pageIndices = Array.from({ length: pageCount }, (_, i) => pageCount - 1 - i);
                    const copiedPages = await newPdf.copyPages(pdfDoc, pageIndices);
                    copiedPages.forEach(p => newPdf.addPage(p));
                    pdfDoc = newPdf;
                } else if (step === "Compress PDF") {
                    // Hybrid Action: Send to backend, wait, reload
                    setStatus("Compressing (Backend)...");
                    const pdfBytes = await pdfDoc.save();
                    const blob = new Blob([pdfBytes], { type: "application/pdf" });
                    const tempFile = new File([blob], "temp_for_compress.pdf", { type: "application/pdf" });

                    try {
                        const compressedBlob = await api.compressPdf(tempFile);
                        const compressedBuf = await compressedBlob.arrayBuffer();
                        pdfDoc = await PDFDocument.load(compressedBuf);
                    } catch (e) {
                        console.error("Compression failed", e);
                        toast.error("Compression step failed, continuing with original...");
                    }
                }
            }

            setStatus("Finalizing...");

            const shouldProtect = steps.includes("Protect PDF");

            let pdfBytes;
            if (shouldProtect) {
                // Open custom dialog and wait for user input
                setIsPasswordDialogOpen(true);
                const password = await new Promise<string | null>((resolve) => {
                    setPasswordResolver(() => resolve);
                });

                // Close dialog and clean up
                setIsPasswordDialogOpen(false);
                setPasswordInput("");
                setPasswordResolver(null);

                if (!password) {
                    toast.error("Password is required to protect the PDF.");
                    setIsRunning(false); // Stop execution
                    return;
                }

                pdfBytes = await pdfDoc.save({
                    userPassword: password,
                    ownerPassword: password,
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
                toast.success(`PDF Protected with password: '${password}'`);
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

    const runWorkflow = () => {
        if (!file || steps.length === 0) return;

        // If already named, just run
        if (wfName) {
            executeWorkflow(null);
            return;
        }

        // If unnamed, prompt user
        setIsRunPromptOpen(true);
    };

    if (!file) {
        return (
            <div className="mx-auto max-w-2xl">
                <div className="text-center mb-10 space-y-4">
                    <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
                        {loadId ? "Run Workflow" : "Create Workflow"}
                    </h1>
                    <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                        {loadId
                            ? (wfName ? `Execute your saved workflow: ${wfName}` : "Execute your saved automation workflow.")
                            : "Create custom workflows with your favorite tools, automate tasks, and reuse them anytime."}
                    </p>
                </div>
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
            <div className="text-center mb-10 space-y-4">
                <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
                    {loadId ? "Run Workflow" : "Create Workflow"}
                </h1>
                <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                    {loadId
                        ? "Execute your saved automation workflow. Upload a file to begin."
                        : "Create custom workflows with your favorite tools, automate tasks, and reuse them anytime."}
                </p>
            </div>

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
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => { setFile(null); setSteps([]); }}>
                        <RefreshCw className="h-5 w-5" />
                    </Button>
                </div>
            </div>

            {!loadId && (
                <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                        <Label className="text-lg font-semibold">Select a tool:</Label>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="w-full justify-between h-12 text-base">
                                    Available tools...
                                    <ChevronDown className="h-4 w-4 opacity-50" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] max-h-[400px] overflow-y-auto">
                                <DropdownMenuLabel>Organize PDF</DropdownMenuLabel>
                                {[
                                    "Split PDF",
                                    "Merge PDF",
                                    "Organize PDF pages",
                                    "Extract First Page",
                                    "Remove Last Page",
                                    "Reverse Order",
                                    "Rotate 90°"
                                ].map((action) => (
                                    <DropdownMenuItem key={action} onSelect={() => addStep(action)}>
                                        <Plus className="mr-2 h-4 w-4" /> {action}
                                    </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator />

                                <DropdownMenuLabel>Optimize PDF</DropdownMenuLabel>
                                {[
                                    "Compress PDF",
                                    "OCR PDF"
                                ].map((action) => (
                                    <DropdownMenuItem key={action} onSelect={() => addStep(action)}>
                                        <Plus className="mr-2 h-4 w-4" /> {action}
                                    </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator />

                                <DropdownMenuLabel>Convert PDF</DropdownMenuLabel>
                                {[
                                    "PDF to Word",
                                    "PDF to Excel",
                                    "PDF to PowerPoint",
                                    "Word to PDF",
                                    "Excel to PDF",
                                    "Powerpoint to PDF",
                                    "PDF to PDF/A",
                                    "PDF to JPG",
                                    "Image to PDF"
                                ].map((action) => (
                                    <DropdownMenuItem key={action} onSelect={() => addStep(action)}>
                                        <Plus className="mr-2 h-4 w-4" /> {action}
                                    </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator />

                                <DropdownMenuLabel>Edit PDF</DropdownMenuLabel>
                                {[
                                    "Edit PDF",
                                    "Watermark",
                                    "Add Page Numbers",
                                    "Flatten Forms",
                                    "Metadata Strip"
                                ].map((action) => (
                                    <DropdownMenuItem key={action} onSelect={() => addStep(action)}>
                                        <Plus className="mr-2 h-4 w-4" /> {action}
                                    </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator />

                                <DropdownMenuLabel>Security</DropdownMenuLabel>
                                {[
                                    "Protect PDF",
                                    "Unlock PDF"
                                ].map((action) => (
                                    <DropdownMenuItem key={action} onSelect={() => addStep(action)}>
                                        <Plus className="mr-2 h-4 w-4" /> {action}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <p className="text-sm text-muted-foreground">Select tools from the dropdown to add them to your workflow chain.</p>
                    </div>

                    <div className="space-y-4 rounded-xl border bg-muted/20 p-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold">Workflow Steps</h3>
                            <Dialog open={isSaveOpen} onOpenChange={setIsSaveOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="sm" disabled={steps.length === 0}>
                                        <Save className="w-4 h-4 mr-2" /> Save Draft
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Save Workflow</DialogTitle>
                                        <DialogDescription>
                                            Save this chain of tools to your library to reuse later.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="name">Name</Label>
                                            <Input
                                                id="name"
                                                placeholder="e.g. My Weekly Refactor"
                                                value={wfName}
                                                onChange={(e) => setWfName(e.target.value)}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="desc">Description</Label>
                                            <Textarea
                                                id="desc"
                                                placeholder="What does this workflow do?"
                                                value={wfDesc}
                                                onChange={(e) => setWfDesc(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button onClick={handleSave} disabled={isSaving}>
                                            {isSaving ? "Saving..." : "Save Workflow"}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>

                        <Dialog open={isRunPromptOpen} onOpenChange={setIsRunPromptOpen}>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Name Your Workflow</DialogTitle>
                                    <DialogDescription>
                                        Give this workflow a name to save it for later use, or run it as a one-time draft.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="run-name">Workflow Name</Label>
                                        <Input
                                            id="run-name"
                                            placeholder="e.g. Monthly Report Processing"
                                            value={runPromptName}
                                            onChange={(e) => setRunPromptName(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <DialogFooter className="gap-2 sm:gap-0">
                                    <Button variant="outline" onClick={() => executeWorkflow(null)}>
                                        Run as Draft
                                    </Button>
                                    <Button onClick={() => executeWorkflow(runPromptName)}>
                                        Save & Run
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        <Dialog open={isPasswordDialogOpen} onOpenChange={(open) => {
                            if (!open && passwordResolver) passwordResolver(null);
                        }}>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Protect PDF</DialogTitle>
                                    <DialogDescription>
                                        Enter a password to encrypt this PDF document.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="pdf-password">Password</Label>
                                        <Input
                                            id="pdf-password"
                                            type="password"
                                            placeholder="Enter password"
                                            value={passwordInput}
                                            onChange={(e) => setPasswordInput(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handlePasswordSubmit();
                                            }}
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => {
                                        if (passwordResolver) passwordResolver(null);
                                    }}>
                                        Cancel
                                    </Button>
                                    <Button onClick={handlePasswordSubmit}>
                                        Protect PDF
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

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
            )}

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
