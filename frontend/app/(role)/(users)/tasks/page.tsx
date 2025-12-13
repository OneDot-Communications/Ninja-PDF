"use client";

import { useEffect, useState } from "react";
import { api } from "@/app/lib/api";
import { Card, CardContent } from "@/app/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { Badge } from "@/app/components/ui/badge";
import { Loader2, Download, RotateCw } from "lucide-react";
import { Button } from "@/app/components/ui/button";

export default function LastTasksPage() {
    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getTasks()
            .then(data => setTasks(data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Last Tasks</h1>
            <p className="text-muted-foreground">History of your document processing activities.</p>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Task / File</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {tasks.map((task) => (
                                <TableRow key={task.id}>
                                    <TableCell className="font-medium">
                                        {task.tool_name || "Custom Workflow"}
                                        {task.input_file && <div className="text-xs text-muted-foreground truncate max-w-[200px]">{task.input_file.split('/').pop()}</div>}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={task.status === 'COMPLETED' ? 'default' : task.status === 'FAILED' ? 'destructive' : 'secondary'}>
                                            {task.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{new Date(task.created_at).toLocaleDateString()}</TableCell>
                                    <TableCell className="text-right flex justify-end gap-2">
                                        {task.output_file && (
                                            <Button variant="ghost" size="icon" title="Download">
                                                <Download className="w-4 h-4" />
                                            </Button>
                                        )}
                                        <Button variant="ghost" size="icon" title="Retry">
                                            <RotateCw className="w-4 h-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {tasks.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                                        No recent tasks found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
