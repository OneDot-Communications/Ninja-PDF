"use client";

import { useEffect, useState } from "react";
import { api } from "@/app/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Loader2, Plus, Workflow } from "lucide-react";

export default function WorkflowsPage() {
    const [workflows, setWorkflows] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getWorkflows()
            .then(data => setWorkflows(data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Workflows</h1>
                    <p className="text-muted-foreground mt-1">Automate your document processing tasks.</p>
                </div>
                <Button className="gap-2">
                    <Plus className="w-4 h-4" /> New Workflow
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {workflows.map((wf) => (
                    <Card key={wf.id} className="cursor-pointer hover:border-primary">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Workflow className="w-5 h-5 text-purple-500" />
                                {wf.name}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground line-clamp-2">{wf.description || "No description"}</p>
                            <div className="mt-4 flex gap-2">
                                <Button size="sm" variant="outline" className="w-full">Edit</Button>
                                <Button size="sm" className="w-full">Run</Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {workflows.length === 0 && (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-20">
                        <Workflow className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                        <h3 className="text-lg font-medium">No workflows yet</h3>
                        <p className="text-muted-foreground mb-4">Create a workflow to automate repetitive tasks like "Merge & Compress".</p>
                        <Button>Create Workflow</Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
