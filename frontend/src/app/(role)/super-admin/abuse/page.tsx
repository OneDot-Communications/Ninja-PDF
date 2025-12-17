"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/services/api";
import { AlertTriangle, Ban, Clock, Eye, Filter, MapPin, RefreshCw, Shield, User } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface AbuseAlert {
    id: number;
    type: 'BRUTE_FORCE' | 'RATE_LIMIT' | 'SUSPICIOUS_ACTIVITY' | 'VPNFLAGGED' | 'BOT_DETECTED';
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    ip_address: string;
    user_email: string | null;
    description: string;
    status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'DISMISSED';
    created_at: string;
    geo_location: string | null;
}

const severityColors: Record<string, string> = {
    LOW: 'bg-blue-100 text-blue-700',
    MEDIUM: 'bg-yellow-100 text-yellow-700',
    HIGH: 'bg-orange-100 text-orange-700',
    CRITICAL: 'bg-red-100 text-red-700',
};

const typeIcons: Record<string, React.ReactNode> = {
    BRUTE_FORCE: <Shield className="w-4 h-4" />,
    RATE_LIMIT: <Clock className="w-4 h-4" />,
    SUSPICIOUS_ACTIVITY: <Eye className="w-4 h-4" />,
    VPNFLAGGED: <MapPin className="w-4 h-4" />,
    BOT_DETECTED: <Ban className="w-4 h-4" />,
};

export default function AbuseAlertsPage() {
    const [alerts, setAlerts] = useState<AbuseAlert[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState({
        total: 0, open: 0, investigating: 0, resolved: 0, critical: 0
    });

    useEffect(() => {
        loadAlerts();
    }, []);

    const loadAlerts = async () => {
        try {
            // Load from failed logins / audit logs as abuse signals
            const [failedLogins, auditLogs] = await Promise.all([
                api.request('GET', '/auth/security/failed-logins/').catch(() => ({ results: [] })),
                api.request('GET', '/auth/security/audit-logs/?limit=50').catch(() => ({ results: [] })),
            ]);

            // Transform failed logins into abuse alerts format
            const failedLoginAlerts: AbuseAlert[] = (failedLogins.results || [])
                .slice(0, 20)
                .map((fl: any, i: number) => ({
                    id: fl.id || i,
                    type: 'BRUTE_FORCE' as const,
                    severity: fl.attempt_count >= 10 ? 'CRITICAL' : fl.attempt_count >= 5 ? 'HIGH' : 'MEDIUM',
                    ip_address: fl.ip_address || 'Unknown',
                    user_email: fl.email || null,
                    description: `${fl.attempt_count || 1} failed login attempts`,
                    status: fl.is_locked ? 'RESOLVED' : 'OPEN',
                    created_at: fl.last_attempt || fl.created_at || new Date().toISOString(),
                    geo_location: fl.geo_location || null,
                }));

            setAlerts(failedLoginAlerts);

            // Calculate stats
            setStats({
                total: failedLoginAlerts.length,
                open: failedLoginAlerts.filter(a => a.status === 'OPEN').length,
                investigating: failedLoginAlerts.filter(a => a.status === 'INVESTIGATING').length,
                resolved: failedLoginAlerts.filter(a => a.status === 'RESOLVED').length,
                critical: failedLoginAlerts.filter(a => a.severity === 'CRITICAL').length,
            });
        } catch (error) {
            toast.error("Failed to load alerts");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        loadAlerts();
    };

    const blockIP = async (ip: string) => {
        try {
            await api.request('POST', '/auth/security/ip-rules/', {
                ip_address: ip,
                rule_type: 'BLACKLIST',
                scope: 'GLOBAL',
                reason: 'Blocked via abuse alert',
            });
            toast.success(`IP ${ip} blocked`);
            loadAlerts();
        } catch (error) {
            toast.error("Failed to block IP");
        }
    };

    const dismissAlert = async (alertId: number) => {
        // For now just remove from local state
        setAlerts(prev => prev.filter(a => a.id !== alertId));
        toast.success("Alert dismissed");
    };

    const filteredAlerts = alerts.filter(a =>
        statusFilter === 'ALL' || a.status === statusFilter
    );

    if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-lg text-red-600">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Abuse Detection</h1>
                        <p className="text-slate-500">Monitor and respond to security threats (Tasks 117-122)</p>
                    </div>
                </div>
                <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-sm text-slate-500">Total Alerts</p>
                        <p className="text-2xl font-bold">{stats.total}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-sm text-slate-500">Open</p>
                        <p className="text-2xl font-bold text-yellow-600">{stats.open}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-sm text-slate-500">Investigating</p>
                        <p className="text-2xl font-bold text-blue-600">{stats.investigating}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-sm text-slate-500">Resolved</p>
                        <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-sm text-slate-500">Critical</p>
                        <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filter */}
            <div className="flex gap-4 items-center">
                <Filter className="w-4 h-4 text-slate-400" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">All Statuses</SelectItem>
                        <SelectItem value="OPEN">Open</SelectItem>
                        <SelectItem value="INVESTIGATING">Investigating</SelectItem>
                        <SelectItem value="RESOLVED">Resolved</SelectItem>
                        <SelectItem value="DISMISSED">Dismissed</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Alerts List */}
            <div className="space-y-3">
                {filteredAlerts.map(alert => (
                    <Card key={alert.id} className="border-l-4" style={{
                        borderLeftColor: alert.severity === 'CRITICAL' ? '#ef4444' :
                            alert.severity === 'HIGH' ? '#f97316' :
                                alert.severity === 'MEDIUM' ? '#eab308' : '#3b82f6'
                    }}>
                        <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                                <div className="flex gap-4">
                                    <div className="p-2 bg-slate-100 rounded-lg">
                                        {typeIcons[alert.type] || <AlertTriangle className="w-4 h-4" />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-semibold">{alert.type.replace('_', ' ')}</span>
                                            <Badge className={severityColors[alert.severity]}>{alert.severity}</Badge>
                                            <Badge variant="outline">{alert.status}</Badge>
                                        </div>
                                        <p className="text-sm text-slate-600">{alert.description}</p>
                                        <div className="flex gap-4 mt-2 text-xs text-slate-400">
                                            <span className="font-mono">{alert.ip_address}</span>
                                            {alert.user_email && (
                                                <span className="flex items-center gap-1">
                                                    <User className="w-3 h-3" /> {alert.user_email}
                                                </span>
                                            )}
                                            {alert.geo_location && (
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" /> {alert.geo_location}
                                                </span>
                                            )}
                                            <span>{new Date(alert.created_at).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="destructive" onClick={() => blockIP(alert.ip_address)}>
                                        <Ban className="w-3 h-3 mr-1" /> Block IP
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => dismissAlert(alert.id)}>
                                        Dismiss
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {filteredAlerts.length === 0 && (
                    <Card className="p-12 text-center">
                        <AlertTriangle className="w-12 h-12 mx-auto text-green-500 mb-4" />
                        <p className="text-lg font-medium text-slate-700">No abuse alerts</p>
                        <p className="text-slate-500">All systems are operating normally</p>
                    </Card>
                )}
            </div>
        </div>
    );
}
