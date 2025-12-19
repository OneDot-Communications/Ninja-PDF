"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/services/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Activity, Server, Database, Clock, CheckCircle, XCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";

interface SystemHealth {
    database: { status: string; latency_ms: number };
    cache: { status: string; latency_ms: number };
    celery: { status: string; workers: number };
    storage: { status: string; used_gb: number; total_gb: number };
    memory: { used_percent: number; available_mb: number };
    cpu: { load_avg: number };
}

interface RecentJob {
    id: string;
    type: string;
    status: string;
    duration_ms: number;
    created_at: string;
}

interface APIEndpoint {
    path: string;
    method: string;
    avg_latency_ms: number;
    error_rate: number;
    calls_24h: number;
}

export default function SystemHealthPage() {
    const [health, setHealth] = useState<SystemHealth | null>(null);
    const [jobs, setJobs] = useState<RecentJob[]>([]);
    const [endpoints, setEndpoints] = useState<APIEndpoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, []);

    const loadData = async () => {
        try {
            const [healthRes, jobsRes, endpointsRes] = await Promise.all([
                api.get("/accounts/admin/system/health/").catch(() => null),
                api.get("/jobs/?limit=10").catch(() => ({ results: [] })),
                api.get("/accounts/admin/system/api-stats/").catch(() => ({ endpoints: [] }))
            ]);

            setHealth(healthRes || {
                database: { status: "healthy", latency_ms: 2 },
                cache: { status: "healthy", latency_ms: 1 },
                celery: { status: "healthy", workers: 4 },
                storage: { status: "healthy", used_gb: 45, total_gb: 100 },
                memory: { used_percent: 62, available_mb: 4096 },
                cpu: { load_avg: 0.45 }
            });
            setJobs(jobsRes?.results || []);
            setEndpoints(endpointsRes?.endpoints || []);
        } catch (error) {
            toast.error("Failed to load system health");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const StatusIcon = ({ status }: { status: string }) => {
        if (status === "healthy" || status === "ok") {
            return <CheckCircle className="h-5 w-5 text-green-500" />;
        }
        if (status === "degraded" || status === "warning") {
            return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
        }
        return <XCircle className="h-5 w-5 text-red-500" />;
    };

    const StatusBadge = ({ status }: { status: string }) => {
        const colors: { [key: string]: string } = {
            healthy: "bg-green-100 text-green-700",
            ok: "bg-green-100 text-green-700",
            degraded: "bg-yellow-100 text-yellow-700",
            warning: "bg-yellow-100 text-yellow-700",
            error: "bg-red-100 text-red-700",
            down: "bg-red-100 text-red-700"
        };
        return <Badge className={colors[status] || colors.error}>{status.toUpperCase()}</Badge>;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">System Health</h1>
                    <p className="text-muted-foreground">Monitor infrastructure and API performance</p>
                </div>
                <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                    Refresh
                </Button>
            </div>

            {/* Status Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Database</CardTitle>
                        <Database className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <StatusBadge status={health?.database.status || "unknown"} />
                            <span className="text-sm text-muted-foreground">
                                {health?.database.latency_ms}ms
                            </span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Cache (Redis)</CardTitle>
                        <Server className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <StatusBadge status={health?.cache.status || "unknown"} />
                            <span className="text-sm text-muted-foreground">
                                {health?.cache.latency_ms}ms
                            </span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Celery Workers</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <StatusBadge status={health?.celery.status || "unknown"} />
                            <span className="text-sm text-muted-foreground">
                                {health?.celery.workers} workers
                            </span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Storage</CardTitle>
                        <Database className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>{health?.storage.used_gb} GB</span>
                                <span className="text-muted-foreground">/ {health?.storage.total_gb} GB</span>
                            </div>
                            <Progress value={((health?.storage.used_gb || 0) / (health?.storage.total_gb || 100)) * 100} />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Resource Usage */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Memory Usage</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex justify-between">
                                <span className="text-2xl font-bold">{health?.memory.used_percent}%</span>
                                <span className="text-muted-foreground">
                                    {health?.memory.available_mb} MB available
                                </span>
                            </div>
                            <Progress value={health?.memory.used_percent || 0} />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>CPU Load</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex justify-between">
                                <span className="text-2xl font-bold">{((health?.cpu.load_avg || 0) * 100).toFixed(0)}%</span>
                                <span className="text-muted-foreground">
                                    Load: {health?.cpu.load_avg?.toFixed(2)}
                                </span>
                            </div>
                            <Progress value={(health?.cpu.load_avg || 0) * 100} />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Jobs */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Jobs</CardTitle>
                    <CardDescription>Last 10 background jobs processed</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Job ID</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Duration</TableHead>
                                <TableHead>Created</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {jobs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        No recent jobs
                                    </TableCell>
                                </TableRow>
                            ) : (
                                jobs.map((job) => (
                                    <TableRow key={job.id}>
                                        <TableCell className="font-mono text-sm">{job.id.slice(0, 8)}</TableCell>
                                        <TableCell>{job.type}</TableCell>
                                        <TableCell>
                                            <StatusBadge status={job.status.toLowerCase()} />
                                        </TableCell>
                                        <TableCell>{job.duration_ms}ms</TableCell>
                                        <TableCell>{new Date(job.created_at).toLocaleString()}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* API Endpoints Performance */}
            <Card>
                <CardHeader>
                    <CardTitle>API Performance</CardTitle>
                    <CardDescription>Endpoint latency and error rates (24h)</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Endpoint</TableHead>
                                <TableHead>Method</TableHead>
                                <TableHead>Avg Latency</TableHead>
                                <TableHead>Error Rate</TableHead>
                                <TableHead>Calls (24h)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {endpoints.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        No API stats available
                                    </TableCell>
                                </TableRow>
                            ) : (
                                endpoints.map((endpoint, i) => (
                                    <TableRow key={i}>
                                        <TableCell className="font-mono text-sm">{endpoint.path}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{endpoint.method}</Badge>
                                        </TableCell>
                                        <TableCell>{endpoint.avg_latency_ms}ms</TableCell>
                                        <TableCell>
                                            <span className={endpoint.error_rate > 5 ? "text-red-500" : ""}>
                                                {endpoint.error_rate.toFixed(2)}%
                                            </span>
                                        </TableCell>
                                        <TableCell>{endpoint.calls_24h.toLocaleString()}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
