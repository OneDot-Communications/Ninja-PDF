"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionFilter, setActionFilter] = useState("ALL");
    const [page, setPage] = useState(1);

    const ACTIONS = [
        "ALL", "LOGIN", "LOGOUT", "FILE_ACCESS", "FILE_DELETE", "SETTINGS_CHANGE", "USER_MODIFIED", "EXPORT_DATA"
    ];

    useEffect(() => {
        loadLogs();
    }, [page, actionFilter]);

    const loadLogs = async () => {
        setLoading(true);
        try {
            const data = await api.getAuditLogs(page, actionFilter);
            // Handling pagination if DRF returns { count, next, previous, results }
            if (data.results) {
                setLogs(data.results);
            } else if (Array.isArray(data)) {
                setLogs(data);
            }
        } catch (error) {
            toast.error("Failed to load audit logs");
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
        >
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Audit Logs</h2>
                    <p className="text-muted-foreground">Immutable record of sensitive system actions.</p>
                </div>
                <div className="w-[200px]">
                    <Select value={actionFilter} onValueChange={(val) => { setPage(1); setActionFilter(val); }}>
                        <SelectTrigger>
                            <SelectValue placeholder="Filter Action" />
                        </SelectTrigger>
                        <SelectContent>
                            {ACTIONS.map(a => <SelectItem key={a} value={a}>{a === 'ALL' ? 'All Actions' : a}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Timestamp</TableHead>
                                <TableHead>Actor</TableHead>
                                <TableHead>Action</TableHead>
                                <TableHead>Target</TableHead>
                                <TableHead>IP</TableHead>
                                <TableHead>Details</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                                    </TableCell>
                                </TableRow>
                            ) : logs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        No audit entries found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                logs.map((log) => (
                                    <TableRow key={log.id}>
                                        <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                                            {format(new Date(log.timestamp), "MMM d, HH:mm:ss")}
                                        </TableCell>
                                        <TableCell>
                                            {log.actor_email ? (
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-sm">{log.actor_email}</span>
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground italic">System / Anon</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="font-mono text-xs">
                                                {log.action}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs text-blue-600 dark:text-blue-400 truncate max-w-[150px]" title={log.target}>
                                            {log.target}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs text-muted-foreground">
                                            {log.ip_address || '-'}
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate" title={JSON.stringify(log.details, null, 2)}>
                                            {JSON.stringify(log.details)}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <div className="flex justify-between">
                <Button variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
                <Button variant="outline" onClick={() => setPage(p => p + 1)} disabled={logs.length < 10}>Next</Button>
            </div>
        </motion.div>
    );
}
