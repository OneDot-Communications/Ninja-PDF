"use client";

import { useState, useEffect } from "react";
import { api } from "@/app/lib/api";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Plus, Workflow, FileText, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function WorkflowsPage() {
    const [workflows, setWorkflows] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

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
                    {workflows.map(wf => (
                        <Card key={wf.id} className="cursor-pointer hover:border-slate-300 transition-all group">
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start">
                                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600 group-hover:bg-blue-100 transition-colors">
                                        <Workflow className="w-5 h-5" />
                                    </div>
                                    <Badge variant="secondary">{wf.steps?.length || 0} Steps</Badge>
                                </div>
                                <CardTitle className="mt-4">{wf.name}</CardTitle>
                                <CardDescription className="line-clamp-2">{wf.description || "No description"}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-xs text-slate-400 flex items-center gap-1">
                                    Last run: {wf.last_run_at ? new Date(wf.last_run_at).toLocaleDateString() : 'Never'}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
