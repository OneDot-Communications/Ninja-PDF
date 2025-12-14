"use client";

import { useEffect, useState } from "react";
import { api } from "@/app/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Database, Server, Zap, HardDrive } from "lucide-react";
import { Loader2 } from "lucide-react";

export default function SuperAdminDatabasePage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const res = await api.getAdminDatabase();
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
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Database Status</h1>
                <p className="text-slate-500">PostgreSQL health metrics and performance indicators.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Storage Used</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <HardDrive className="w-4 h-4 text-slate-400" />
                            <div className="text-2xl font-bold text-slate-900">{data?.size || 'Unknown'}</div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Active Connections</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <Server className="w-4 h-4 text-slate-400" />
                            <div className="text-2xl font-bold text-slate-900">{data?.connections || 0}</div>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Simultaneous backends</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Cache Hit Ratio</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-amber-500" />
                            <div className="text-2xl font-bold text-slate-900">{data?.cache_hit_ratio}%</div>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Target &gt; 99%</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Object Counts</CardTitle>
                    <CardDescription>Approximate row counts for key tables</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b pb-2">
                            <span className="text-sm font-medium">Total Users</span>
                            <span className="font-mono text-sm">{data?.objects?.users}</span>
                        </div>
                        <div className="flex items-center justify-between border-b pb-2">
                            <span className="text-sm font-medium">Subscriptions</span>
                            <span className="font-mono text-sm">{data?.objects?.subscriptions}</span>
                        </div>
                        <div className="flex items-center justify-between border-b pb-2">
                            <span className="text-sm font-medium">Invoices</span>
                            <span className="font-mono text-sm">{data?.objects?.invoices}</span>
                        </div>
                        <div className="flex items-center justify-between border-b pb-2">
                            <span className="text-sm font-medium">Features</span>
                            <span className="font-mono text-sm">{data?.objects?.features}</span>
                        </div>
                        {/* Expandable for other models if needed */}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
