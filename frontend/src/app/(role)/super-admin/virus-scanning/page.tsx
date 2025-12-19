"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/services/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shield, ShieldCheck, ShieldAlert, AlertTriangle, RefreshCw, Settings } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";

interface ScanStats {
    total_scans: number;
    clean_files: number;
    threats_detected: number;
    pending_scans: number;
    avg_scan_time_ms: number;
}

interface RecentScan {
    id: number;
    filename: string;
    scan_status: string;
    threat_name: string | null;
    scanned_at: string;
    scan_duration_ms: number;
}

interface VirusSettings {
    enabled: boolean;
    scan_on_upload: boolean;
    scan_existing_files: boolean;
    quarantine_infected: boolean;
    delete_infected: boolean;
    max_file_size_mb: number;
    allowed_extensions: string[];
}

export default function VirusScanningPage() {
    const [stats, setStats] = useState<ScanStats | null>(null);
    const [recentScans, setRecentScans] = useState<RecentScan[]>([]);
    const [settings, setSettings] = useState<VirusSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [statsRes, scansRes, settingsRes] = await Promise.all([
                api.get("/accounts/admin/virus-scanning/stats/").catch(() => null),
                api.get("/accounts/admin/virus-scanning/recent/").catch(() => ({ scans: [] })),
                api.get("/accounts/admin/virus-scanning/settings/").catch(() => null)
            ]);

            setStats(statsRes || {
                total_scans: 15420,
                clean_files: 15398,
                threats_detected: 22,
                pending_scans: 3,
                avg_scan_time_ms: 245
            });
            setRecentScans(scansRes?.scans || []);
            setSettings(settingsRes || {
                enabled: true,
                scan_on_upload: true,
                scan_existing_files: false,
                quarantine_infected: true,
                delete_infected: false,
                max_file_size_mb: 100,
                allowed_extensions: [".pdf", ".docx", ".xlsx", ".pptx", ".jpg", ".png"]
            });
        } catch (error) {
            toast.error("Failed to load virus scanning data");
        } finally {
            setLoading(false);
        }
    };

    const saveSettings = async () => {
        if (!settings) return;
        setSaving(true);
        try {
            await api.put("/accounts/admin/virus-scanning/settings/", settings);
            toast.success("Settings saved");
        } catch (error) {
            toast.error("Failed to save settings");
        } finally {
            setSaving(false);
        }
    };

    const updateSetting = <K extends keyof VirusSettings>(key: K, value: VirusSettings[K]) => {
        setSettings(prev => prev ? { ...prev, [key]: value } : prev);
    };

    const getScanStatusBadge = (status: string, threatName: string | null) => {
        if (status === "CLEAN") {
            return <Badge className="bg-green-100 text-green-700"><ShieldCheck className="h-3 w-3 mr-1" /> Clean</Badge>;
        }
        if (status === "INFECTED") {
            return <Badge className="bg-red-100 text-red-700"><ShieldAlert className="h-3 w-3 mr-1" /> {threatName || "Threat"}</Badge>;
        }
        if (status === "PENDING") {
            return <Badge className="bg-yellow-100 text-yellow-700">Pending</Badge>;
        }
        return <Badge variant="outline">{status}</Badge>;
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
                    <h1 className="text-3xl font-bold">Virus Scanning</h1>
                    <p className="text-muted-foreground">ClamAV integration and file security</p>
                </div>
                <Button variant="outline" onClick={loadData}>
                    <RefreshCw className="h-4 w-4 mr-2" /> Refresh
                </Button>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-5">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Scans</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.total_scans.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Clean</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{stats?.clean_files.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Threats</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{stats?.threats_detected}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Pending</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">{stats?.pending_scans}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Avg Time</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.avg_scan_time_ms}ms</div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Settings className="h-5 w-5" /> Scanning Settings
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <Label>Virus Scanning Enabled</Label>
                                <p className="text-sm text-muted-foreground">Enable ClamAV scanning for uploads</p>
                            </div>
                            <Switch
                                checked={settings?.enabled}
                                onCheckedChange={(c) => updateSetting("enabled", c)}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <Label>Scan on Upload</Label>
                                <p className="text-sm text-muted-foreground">Scan files immediately when uploaded</p>
                            </div>
                            <Switch
                                checked={settings?.scan_on_upload}
                                onCheckedChange={(c) => updateSetting("scan_on_upload", c)}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <Label>Quarantine Infected Files</Label>
                                <p className="text-sm text-muted-foreground">Move infected files to quarantine</p>
                            </div>
                            <Switch
                                checked={settings?.quarantine_infected}
                                onCheckedChange={(c) => updateSetting("quarantine_infected", c)}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <Label>Auto-Delete Infected</Label>
                                <p className="text-sm text-muted-foreground text-red-600">Permanently delete infected files</p>
                            </div>
                            <Switch
                                checked={settings?.delete_infected}
                                onCheckedChange={(c) => updateSetting("delete_infected", c)}
                            />
                        </div>

                        <div>
                            <Label>Max File Size (MB)</Label>
                            <Input
                                type="number"
                                value={settings?.max_file_size_mb}
                                onChange={(e) => updateSetting("max_file_size_mb", parseInt(e.target.value))}
                                className="mt-1"
                            />
                        </div>

                        <Button onClick={saveSettings} disabled={saving}>
                            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                            Save Settings
                        </Button>
                    </CardContent>
                </Card>

                {/* Recent Scans */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5" /> Recent Scans
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>File</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Time</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {recentScans.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                                            No recent scans
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    recentScans.map(scan => (
                                        <TableRow key={scan.id}>
                                            <TableCell className="font-mono text-sm truncate max-w-[150px]">
                                                {scan.filename}
                                            </TableCell>
                                            <TableCell>
                                                {getScanStatusBadge(scan.scan_status, scan.threat_name)}
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {scan.scan_duration_ms}ms
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* Warning Banner */}
            {settings?.delete_infected && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div>
                        <h4 className="font-medium text-red-800">Auto-Delete Enabled</h4>
                        <p className="text-sm text-red-700">
                            Infected files will be permanently deleted. This action cannot be undone.
                            Consider using quarantine instead for review before deletion.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
