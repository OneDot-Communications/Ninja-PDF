"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Upload, Save } from "lucide-react";
import Image from "next/image";

export default function SuperAdminSettingsPage() {
    const [settings, setSettings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const data = await api.getSystemSettings();
            setSettings(data);
            const logoSetting = data.find((s: any) => s.key === 'LOGO_URL');
            if (logoSetting?.file) {
                setPreviewUrl(logoSetting.file);
            }
        } catch (error) {
            console.error(error);
            // Ignore 404/403 for now if init fails
        } finally {
            setLoading(false);
        }
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setLogoFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSaveLogo = async () => {
        if (!logoFile) return;
        setUploading(true);
        try {
            // Check if setting exists, if not strictly create (API handles this logic usually, but here we assume key existence or upsert)
            // For simplicity, we just try to update 'LOGO_URL'
            // If backend is strict, we might need a create endpoint. 
            // Assuming the PATCH endpoint creates if missing or we use a separate create.
            // Let's assume we maintain LOGO_URL key.

            await api.updateSystemSetting('LOGO_URL', null, logoFile);
            toast.success("Logo updated successfully");
            setLogoFile(null);
            loadSettings();
        } catch (error) {
            toast.error("Failed to update logo");
            console.error(error);
        } finally {
            setUploading(false);
        }
    };

    if (loading) return <Loader2 className="animate-spin" />;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">System Settings</h1>
                    <p className="text-slate-500">Configure global platform settings.</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Branding</CardTitle>
                    <CardDescription>Manage the platform logo and identity.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label>Platform Logo</Label>
                        <div className="flex items-center gap-6">
                            <div className="w-24 h-24 border border-dashed rounded-lg flex items-center justify-center bg-slate-50 relative overflow-hidden">
                                {previewUrl ? (
                                    <Image
                                        src={previewUrl}
                                        alt="Logo Preview"
                                        fill
                                        className="object-contain p-2"
                                    />
                                ) : (
                                    <span className="text-xs text-slate-400">No Logo</span>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleLogoChange}
                                    className="max-w-xs"
                                />
                                <p className="text-xs text-slate-500">
                                    Recommended: 200x200px PNG or SVG.
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <Button onClick={handleSaveLogo} disabled={!logoFile || uploading}>
                            {uploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            <Save className="w-4 h-4 mr-2" />
                            Save Changes
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>General Configuration</CardTitle>
                    <CardDescription>Other system variables.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-slate-500 italic">No other configurable settings yet.</p>
                </CardContent>
            </Card>
        </div>
    );
}
