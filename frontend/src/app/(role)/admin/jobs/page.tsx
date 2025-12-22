"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCcw, FileText, Play } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";

export default function AdminJobsPage() {
    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentAdmin, setCurrentAdmin] = useState<any>(null);
    const [processing, setProcessing] = useState<number | null>(null);

    // Logs Dialog
    const [logsOpen, setLogsOpen] = useState(false);
    const [selectedJob, setSelectedJob] = useState<any>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [jobsData, me] = await Promise.all([
                api.request("GET", "/api/jobs/admin/"), // Admin View
                api.getUserDetails('me')
            ]);

            const results = jobsData.results || jobsData;
            setJobs(Array.isArray(results) ? results : []);
            setCurrentAdmin(me);
        } catch (error) {
            toast.error("Failed to load jobs");
        } finally {
            setLoading(false);
        }
    };

    const can = (permission: string) => {
        if (!currentAdmin) return false;
        if (currentAdmin.role === 'SUPER_ADMIN') return true;
        return currentAdmin.entitlements?.[permission]?.allowed === true;
    };

    const handleRetry = async (job: any) => {
        setProcessing(job.id);
        try {
            await api.retryJob(job.id);
            toast.success("Job retry initiated");
            loadData();
        } catch (error) {
            toast.error("Failed to retry job");
        } finally {
            setProcessing(null);
        }
    };

    const handleViewLogs = async (job: any) => {
        setSelectedJob(job);
        setLogsOpen(true);
        setLoadingLogs(true);
        try {
            const data = await api.getJobLogs(job.id);
            setLogs(data.logs || []);
        } catch (error) {
            toast.error("Failed to fetch logs");
            setLogs(["Error fetching logs"]);
        } finally {
            setLoadingLogs(false);
        }
    };

    if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="container mx-auto py-10 space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Job Processing History</h1>
                <p className="text-slate-500">Monitor and manage background processing jobs.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Recent Jobs</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>User</TableHead>
                                <TableHead>Tool</TableHead>
                                <TableHead>Input File</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {jobs.map((job) => (
                                <TableRow key={job.id}>
                                    <TableCell className="font-mono text-xs text-slate-500">{job.id.slice(0, 8)}...</TableCell>
                                    <TableCell>{job.user_email || 'Unknown'}</TableCell>
                                    <TableCell><Badge variant="outline">{job.tool_code}</Badge></TableCell>
                                    <TableCell className="max-w-[200px] truncate" title={job.input_file_name}>{job.input_file_name}</TableCell>
                                    <TableCell>
                                        <Badge className={
                                            job.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                                job.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                                                    'bg-yellow-100 text-yellow-700'
                                        }>
                                            {job.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-slate-500 text-sm">
                                        {new Date(job.created_at).toLocaleDateString()} {new Date(job.created_at).toLocaleTimeString()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            {can('VIEW_JOB_LOGS') && (
                                                <Button variant="ghost" size="icon" onClick={() => handleViewLogs(job)}>
                                                    <FileText className="w-4 h-4" />
                                                </Button>
                                            )}
                                            {can('RETRY_JOB') && job.status === 'FAILED' && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleRetry(job)}
                                                    disabled={processing === job.id}
                                                >
                                                    {processing === job.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={logsOpen} onOpenChange={setLogsOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Job Logs: {selectedJob?.id}</DialogTitle>
                    </DialogHeader>
                    <div className="bg-slate-950 text-slate-50 p-4 rounded-md font-mono text-sm max-h-[60vh] overflow-y-auto">
                        {loadingLogs ? (
                            <div className="flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>
                        ) : (
                            logs.length > 0 ? logs.map((log, i) => (
                                <div key={i} className="mb-1">{log}</div>
                            )) : <div className="text-slate-500">No logs available.</div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
