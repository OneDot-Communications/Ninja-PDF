"use client";

import { useEffect, useState } from "react";
import { api } from "@/app/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Activity, Shield, User } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { Badge } from "@/app/components/ui/badge";
import { Loader2 } from "lucide-react";

export default function SuperAdminActivityPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const res = await api.getAdminActivity();
                setData(res);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-slate-400" /></div>;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">System Activity</h1>
                <p className="text-slate-500">Real-time audit logs and user session tracking.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Shield className="w-4 h-4 text-purple-500" />
                            Admin Audit Log
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Action</TableHead>
                                    <TableHead className="text-right">Time</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data?.admin_actions?.map((log: any) => (
                                    <TableRow key={log.id}>
                                        <TableCell className="font-medium text-xs">{log.user}</TableCell>
                                        <TableCell className="text-xs text-slate-600 truncate max-w-[150px]">{log.action}</TableCell>
                                        <TableCell className="text-right text-xs text-slate-400">
                                            {new Date(log.timestamp).toLocaleTimeString()}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {!data?.admin_actions?.length && (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center text-xs text-slate-400 py-4">No recent admin actions</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <User className="w-4 h-4 text-blue-500" />
                            Recent User Sessions
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Device</TableHead>
                                    <TableHead className="text-right">Since</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data?.sessions?.map((session: any) => (
                                    <TableRow key={session.id}>
                                        <TableCell className="font-medium text-xs">{session.user_email}</TableCell>
                                        <TableCell className="text-xs text-slate-600 font-mono">
                                            {session.device_info ? `${session.device_info} (${session.ip_address})` : session.ip_address}
                                        </TableCell>
                                        <TableCell className="text-right text-xs text-slate-400">
                                            {new Date(session.created_at).toLocaleTimeString()}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {!data?.sessions?.length && (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center text-xs text-slate-400 py-4">No active sessions</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
