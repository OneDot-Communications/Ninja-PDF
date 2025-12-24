"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Workflow, FileText, ArrowRight, Edit, Trash2, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";

export default function WorkflowsPage() {
    const [workflows, setWorkflows] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    // Edit State
    const [editingWf, setEditingWf] = useState<any | null>(null);
    const [editSteps, setEditSteps] = useState<string[]>([]);
    const [isEditOpen, setIsEditOpen] = useState(false);

    // Delete State
    const [deletingWf, setDeletingWf] = useState<any | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleAddStep = (action: string) => {
        const multiUseTools = ["Rotate 90°", "Remove Last Page", "Reverse Order"];
        if (editSteps.includes(action) && !multiUseTools.includes(action)) {
            toast.error(`${action} can only be added once.`);
            return;
        }
        setEditSteps([...editSteps, action]);
    };

    // Actions List
    const availableActions = [
        "Watermark",
        "Rotate 90°",
        "Add Page Numbers",
        "Flatten Forms",
        "Extract First Page",
        "Remove Last Page",
        "Reverse Order",
        "Compress PDF",
        "Metadata Strip",
        "Protect PDF"
    ];


    const fetchWorkflows = async () => {
        try {
            setLoading(true);
            const data = await api.getWorkflows();
            setWorkflows(data);
        } catch (error) {
            // Silently fail if 404/server error, empty state handles it
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWorkflows();
    }, []);

    const handleCreateWorkflow = () => {
        router.push('/create-workflow');
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Workflows</h2>
                    <p className="text-muted-foreground">Automate your PDF processing.</p>
                </div>
                <Button onClick={handleCreateWorkflow}>
                    <Plus className="w-4 h-4 mr-2" /> New Workflow
                </Button>
            </div>

            {loading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map(i => (
                        <Card key={i} className="border-slate-200">
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start">
                                    <Skeleton className="h-10 w-10 rounded-lg" />
                                    <Skeleton className="h-5 w-16" />
                                </div>
                                <Skeleton className="h-6 w-40 mt-4" />
                                <Skeleton className="h-4 w-full mt-2" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-3 w-28" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : workflows.length === 0 ? (
                <Card className="text-center py-12 border-dashed bg-slate-50/50">
                    <CardContent>
                        <Workflow className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                        <h3 className="text-lg font-medium text-slate-900">No active workflows</h3>
                        <p className="text-slate-500 mb-6 max-w-sm mx-auto">Create robust automated chains like "Merge → Compress → Watermark" in seconds.</p>
                        <Button onClick={handleCreateWorkflow} variant="outline" className="border-primary text-primary hover:bg-primary/5">
                            Build Your First Workflow
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {workflows.map(wf => {
                        const steps = wf.definition?.steps || [];
                        return (
                            <Card
                                key={wf.id}
                                className="cursor-pointer hover:border-slate-300 transition-all group relative"
                                onClick={() => router.push(`/create-workflow?load=${wf.id}`)}
                            >
                                <CardHeader className="pb-3">
                                    <div className="flex justify-between items-start">
                                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600 group-hover:bg-blue-100 transition-colors">
                                            <Workflow className="w-5 h-5" />
                                        </div>
                                        <Badge variant="secondary">{steps.length} Steps</Badge>
                                    </div>
                                    <CardTitle className="mt-4">{wf.name}</CardTitle>
                                    <CardDescription className="line-clamp-2">{wf.description || "No description"}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="mb-4 flex items-center gap-2 overflow-hidden text-slate-400">
                                        {steps.length > 0 ? (
                                            <div className="flex items-center gap-1 text-xs">
                                                {steps.slice(0, 3).map((step: string, idx: number) => (
                                                    <div key={idx} className="flex items-center">
                                                        <span className="bg-slate-100 px-2 py-1 rounded border truncate max-w-[80px]" title={step}>
                                                            {step}
                                                        </span>
                                                        {idx < steps.length - 1 && <ArrowRight className="w-3 h-3 mx-1" />}
                                                    </div>
                                                ))}
                                                {steps.length > 3 && <span className="text-xs">+{steps.length - 3} more</span>}
                                            </div>
                                        ) : (
                                            <span className="text-xs italic">No steps defined</span>
                                        )}
                                    </div>
                                    <div className="text-xs text-slate-400 flex items-center gap-1">
                                        Last run: {wf.last_run_at ? new Date(wf.last_run_at).toLocaleDateString() : 'Never'}
                                    </div>
                                </CardContent>

                                <div className="absolute bottom-3 right-3 flex items-center gap-2 transition-opacity">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-7 w-7 shadow-sm bg-slate-50 hover:bg-red-50 hover:text-red-600 border-slate-200"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setDeletingWf(wf);
                                            setIsDeleteOpen(true);
                                        }}
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-xs shadow-sm bg-slate-50 hover:bg-white border-slate-200 text-slate-700"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingWf(wf);
                                            setEditSteps(wf.definition?.steps || []);
                                            setIsEditOpen(true);
                                        }}
                                    >
                                        <Edit className="w-3 h-3 mr-1" /> Edit Preview
                                    </Button>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Workflow Preview</DialogTitle>
                        <DialogDescription>
                            Review and edit the steps in this workflow.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4 space-y-4">
                        <div className="pl-4 border-l-2 border-slate-200 space-y-4">
                            {editSteps.length === 0 ? (
                                <p className="text-sm text-muted-foreground italic">No steps available.</p>
                            ) : (
                                editSteps.map((step, idx) => (
                                    <div key={idx} className="relative flex items-center gap-3">
                                        <div className="absolute -left-[21px] flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 border border-slate-200 text-xs font-medium text-slate-600">
                                            {idx + 1}
                                        </div>
                                        <div className="flex-1 flex items-center justify-between rounded-md border bg-white p-2 text-sm shadow-sm group">
                                            <span className="font-medium">{step}</span>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                                onClick={() => {
                                                    const newSteps = [...editSteps];
                                                    newSteps.splice(idx, 1);
                                                    setEditSteps(newSteps);
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Add New Step Section */}
                        <div className="mt-4 pt-4 border-t border-slate-100">
                            <div className="space-y-4 pt-4 border-t">
                                <Label>Add Step</Label>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" className="w-full justify-between">
                                            Add Action...
                                            <ChevronDown className="h-4 w-4 opacity-50" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] max-h-[300px] overflow-y-auto">
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
                                            <DropdownMenuItem key={action} onSelect={() => setEditSteps([...editSteps, action])}>
                                                <Plus className="mr-2 h-4 w-4" /> {action}
                                            </DropdownMenuItem>
                                        ))}
                                        <DropdownMenuSeparator />

                                        <DropdownMenuLabel>Optimize PDF</DropdownMenuLabel>
                                        {[
                                            "Compress PDF",
                                            "OCR PDF"
                                        ].map((action) => (
                                            <DropdownMenuItem key={action} onSelect={() => setEditSteps([...editSteps, action])}>
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
                                            <DropdownMenuItem key={action} onSelect={() => setEditSteps([...editSteps, action])}>
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
                                            <DropdownMenuItem key={action} onSelect={() => setEditSteps([...editSteps, action])}>
                                                <Plus className="mr-2 h-4 w-4" /> {action}
                                            </DropdownMenuItem>
                                        ))}
                                        <DropdownMenuSeparator />

                                        <DropdownMenuLabel>Security</DropdownMenuLabel>
                                        {[
                                            "Protect PDF",
                                            "Unlock PDF"
                                        ].map((action) => (
                                            <DropdownMenuItem key={action} onSelect={() => setEditSteps([...editSteps, action])}>
                                                <Plus className="mr-2 h-4 w-4" /> {action}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                        <Button onClick={async () => {
                            if (!editingWf) return;
                            try {
                                await api.updateWorkflow(editingWf.id, {
                                    definition: { ...editingWf.definition, steps: editSteps }
                                });
                                toast.success("Workflow updated successfully");
                                setWorkflows(workflows.map(w => w.id === editingWf.id ? { ...w, definition: { ...w.definition, steps: editSteps } } : w));
                                setIsEditOpen(false);
                            } catch (e) {
                                toast.error("Failed to update workflow");
                            }
                        }} className="bg-red-600 hover:bg-red-700 text-white">
                            Update Workflow
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Delete Workflow?</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete <strong>{deletingWf?.name}</strong>? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
                        <Button
                            variant="destructive"
                            disabled={isDeleting}
                            onClick={async () => {
                                if (!deletingWf || isDeleting) return;
                                try {
                                    setIsDeleting(true);
                                    await api.deleteWorkflow(deletingWf.id);
                                    toast.success("Workflow deleted");
                                    setWorkflows(workflows.filter(w => w.id !== deletingWf.id));
                                    setIsDeleteOpen(false);
                                } catch (err) {
                                    console.error(err);
                                    toast.error("Failed to delete workflow");
                                } finally {
                                    setIsDeleting(false);
                                }
                            }}
                        >
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div >
    );
}
