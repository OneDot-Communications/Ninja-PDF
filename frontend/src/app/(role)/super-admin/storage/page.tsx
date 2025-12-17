"use client";

import { useEffect, useState } from "react";
import { api } from "@/app/lib/api";
import { Database, Trash2, Lock, Clock, HardDrive, AlertTriangle, Save } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Switch } from "@/app/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface StorageConfig {
    auto_delete_guest_files_hours: number;
    auto_delete_free_user_files_hours: number;
    auto_delete_premium_user_files_hours: number;
    enable_encrypted_storage: boolean;
    encryption_algorithm: string;
    max_file_size_free_mb: number;
    max_file_size_premium_mb: number;
    enable_virus_scanning: boolean;
    enable_compression: boolean;
}

const defaultConfig: StorageConfig = {
    auto_delete_guest_files_hours: 1,
    auto_delete_free_user_files_hours: 24,
    auto_delete_premium_user_files_hours: 168, // 7 days
    enable_encrypted_storage: true,
    encryption_algorithm: 'AES-256-GCM',
    max_file_size_free_mb: 10,
    max_file_size_premium_mb: 100,
    enable_virus_scanning: true,
    enable_compression: true,
};

export default function StorageSettingsPage() {
    const [config, setConfig] = useState<StorageConfig>(defaultConfig);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            // Try to load from system config
            const data = await api.request('GET', '/auth/security/system-config/').catch(() => ({}));
            const storageConfig = data.results?.find((c: any) => c.key === 'storage_settings');
            if (storageConfig?.value) {
                setConfig({ ...defaultConfig, ...JSON.parse(storageConfig.value) });
            }
        } catch (error) {
            // Use defaults
        } finally {
            setLoading(false);
        }
    };

    const saveConfig = async () => {
        setSaving(true);
        try {
            await api.request('POST', '/auth/security/system-config/', {
                key: 'storage_settings',
                value: JSON.stringify(config),
                is_public: false,
            });
            toast.success("Storage settings saved");
        } catch (error) {
            toast.error("Failed to save settings");
        } finally {
            setSaving(false);
        }
    };

    const updateConfig = (key: keyof StorageConfig, value: any) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                        <Database className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Storage Settings</h1>
                        <p className="text-slate-500">File retention, encryption, and storage policies</p>
                    </div>
                </div>
                <Button onClick={saveConfig} disabled={saving}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Settings
                </Button>
            </div>

            {/* Task 75-76: Auto-Delete Duration */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Trash2 className="w-5 h-5 text-red-500" />
                        <CardTitle>Auto-Delete Configuration</CardTitle>
                    </div>
                    <CardDescription>
                        Automatically delete uploaded files after specified duration (Tasks 75-76)
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-slate-400" />
                                Guest Files (hours)
                            </Label>
                            <Input
                                type="number"
                                value={config.auto_delete_guest_files_hours}
                                onChange={e => updateConfig('auto_delete_guest_files_hours', parseInt(e.target.value))}
                            />
                            <p className="text-xs text-slate-500">Files from non-logged-in users</p>
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-slate-400" />
                                Free User Files (hours)
                            </Label>
                            <Input
                                type="number"
                                value={config.auto_delete_free_user_files_hours}
                                onChange={e => updateConfig('auto_delete_free_user_files_hours', parseInt(e.target.value))}
                            />
                            <p className="text-xs text-slate-500">Files from free tier users</p>
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-slate-400" />
                                Premium User Files (hours)
                            </Label>
                            <Input
                                type="number"
                                value={config.auto_delete_premium_user_files_hours}
                                onChange={e => updateConfig('auto_delete_premium_user_files_hours', parseInt(e.target.value))}
                            />
                            <p className="text-xs text-slate-500">Files from premium/enterprise users</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Task 77: Encrypted Storage */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Lock className="w-5 h-5 text-green-500" />
                        <CardTitle>Encrypted Storage</CardTitle>
                    </div>
                    <CardDescription>
                        Server-side encryption for all uploaded files (Task 77)
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div>
                            <p className="font-medium">Enable Encrypted Storage</p>
                            <p className="text-sm text-slate-500">All files will be encrypted at rest using AES-256</p>
                        </div>
                        <Switch
                            checked={config.enable_encrypted_storage}
                            onCheckedChange={v => updateConfig('enable_encrypted_storage', v)}
                        />
                    </div>

                    {config.enable_encrypted_storage && (
                        <div className="space-y-2">
                            <Label>Encryption Algorithm</Label>
                            <Select
                                value={config.encryption_algorithm}
                                onValueChange={v => updateConfig('encryption_algorithm', v)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="AES-256-GCM">AES-256-GCM (Recommended)</SelectItem>
                                    <SelectItem value="AES-256-CBC">AES-256-CBC</SelectItem>
                                    <SelectItem value="ChaCha20-Poly1305">ChaCha20-Poly1305</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* File Size Limits */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <HardDrive className="w-5 h-5 text-blue-500" />
                        <CardTitle>File Size Limits</CardTitle>
                    </div>
                    <CardDescription>
                        Maximum upload file sizes by tier (Tasks 63-65)
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Free Users Max File Size (MB)</Label>
                            <Input
                                type="number"
                                value={config.max_file_size_free_mb}
                                onChange={e => updateConfig('max_file_size_free_mb', parseInt(e.target.value))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Premium Users Max File Size (MB)</Label>
                            <Input
                                type="number"
                                value={config.max_file_size_premium_mb}
                                onChange={e => updateConfig('max_file_size_premium_mb', parseInt(e.target.value))}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Security Features */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-yellow-500" />
                        <CardTitle>Security Features</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div>
                            <p className="font-medium">Virus Scanning</p>
                            <p className="text-sm text-slate-500">Scan all uploads for malware (Task 78)</p>
                        </div>
                        <Switch
                            checked={config.enable_virus_scanning}
                            onCheckedChange={v => updateConfig('enable_virus_scanning', v)}
                        />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div>
                            <p className="font-medium">File Compression</p>
                            <p className="text-sm text-slate-500">Compress stored files to save space</p>
                        </div>
                        <Switch
                            checked={config.enable_compression}
                            onCheckedChange={v => updateConfig('enable_compression', v)}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
