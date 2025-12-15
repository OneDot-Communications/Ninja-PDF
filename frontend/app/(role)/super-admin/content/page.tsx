
"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { Loader2, Save, RefreshCw, LayoutTemplate, Upload, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/app/lib/api";
import { HomeView } from "@/app/components/home/HomeView";

export default function ContentPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'editor' | 'history'>('editor');
    const [versions, setVersions] = useState<any[]>([]);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [settings, setSettings] = useState({
        platformName: "",
        heroTitle: "",
        heroSubtitle: "",
        primaryColor: "#01B0F1",
        logoUrl: ""
    });
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [previewLogo, setPreviewLogo] = useState<string | null>(null);

    // Initial load
    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        setLoading(true);
        try {
            const data = await api.getAdminBranding();
            if (data) {
                setSettings({
                    platformName: data.platform_name || "Ninja PDF",
                    heroTitle: data.hero_title || "",
                    heroSubtitle: data.hero_subtitle || "",
                    primaryColor: data.primary_color || "#01B0F1",
                    logoUrl: data.logo || ""
                });
                if (data.logo) {
                    setPreviewLogo(data.logo);
                }
            }
        } catch (error) {
            toast.error("Failed to load branding settings");
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setLogoFile(file);
            setPreviewLogo(URL.createObjectURL(file));
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const formData = new FormData();
            formData.append('platform_name', settings.platformName);
            formData.append('hero_title', settings.heroTitle);
            formData.append('hero_subtitle', settings.heroSubtitle);
            formData.append('primary_color', settings.primaryColor);

            if (logoFile) {
                formData.append('logo', logoFile);
            }

            const response = await api.updateAdminBranding(formData);

            if (response) {
                setSettings({
                    platformName: response.platform_name,
                    heroTitle: response.hero_title,
                    heroSubtitle: response.hero_subtitle,
                    primaryColor: response.primary_color,
                    logoUrl: response.logo
                });
                setLogoFile(null);
            }

            toast.success("Branding updated successfully");
        } catch (error) {
            toast.error("Failed to save changes");
        } finally {
            setSaving(false);
        }
    };

    const loadVersions = async () => {
        try {
            const data = await api.getContentVersions();
            setVersions(data);
        } catch (error) {
            toast.error("Failed to load history");
        }
    };

    const handleRevert = async (versionId: number) => {
        if (!confirm("Are you sure you want to revert to this version? Current changes will be lost.")) return;
        setLoading(true);
        try {
            const res = await api.revertContent(versionId);
            toast.success("Reverted successfully");
            setSettings({
                platformName: res.data.platform_name || "Ninja PDF",
                heroTitle: res.data.hero_title || "",
                heroSubtitle: res.data.hero_subtitle || "",
                primaryColor: res.data.primary_color || "#01B0F1",
                logoUrl: res.data.logo || ""
            });
            if (res.data.logo) setPreviewLogo(res.data.logo);
            setActiveTab('editor');
        } catch (error) {
            toast.error("Revert failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
            {/* Left Sidebar - Editor Controls */}
            <div className="w-[400px] border-r border-slate-200 bg-white flex flex-col h-full overflow-y-auto z-20 shadow-xl">
                <div className="p-6 border-b border-slate-100 bg-white sticky top-0 z-10">
                    <div className="flex items-center gap-2 mb-2 text-slate-500">
                        <LayoutTemplate className="w-5 h-5" />
                        <span className="text-sm font-medium uppercase tracking-wider">Live Editor</span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">CMS & Branding</h1>
                    <div className="flex bg-slate-100 p-1 rounded-lg mt-4">
                        <button
                            className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-all ${activeTab === 'editor' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                            onClick={() => setActiveTab('editor')}
                        >
                            Editor
                        </button>
                        <button
                            className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-all ${activeTab === 'history' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                            onClick={() => { setActiveTab('history'); loadVersions(); }}
                        >
                            History
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-8 flex-1">
                    {activeTab === 'editor' ? (
                        <>
                            {/* Branding Section */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-bold text-slate-900 uppercase">Identity</h3>
                                    <span className="text-xs text-slate-400">Global</span>
                                </div>

                                {/* Logo Upload */}
                                <div className="space-y-3">
                                    <Label>Logo</Label>
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 border rounded-lg bg-slate-50 flex items-center justify-center overflow-hidden relative">
                                            {previewLogo ? (
                                                <img src={previewLogo} alt="Logo Preview" className="w-full h-full object-contain" />
                                            ) : (
                                                <ImageIcon className="text-slate-300 w-8 h-8" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <Input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                ref={fileInputRef}
                                                onChange={handleFileChange}
                                            />
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="w-full"
                                                onClick={() => fileInputRef.current?.click()}
                                            >
                                                <Upload className="w-4 h-4 mr-2" /> Upload Logo
                                            </Button>
                                            <p className="text-[10px] text-slate-400 mt-1">Recommended: PNG or SVG, 512x512</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <Label>Platform Name</Label>
                                    <Input
                                        value={settings.platformName}
                                        onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
                                        placeholder="e.g. Ninja PDF"
                                        className="font-medium"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <Label>Primary Color</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            type="color"
                                            value={settings.primaryColor}
                                            onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                                            className="w-12 h-10 p-1 cursor-pointer"
                                        />
                                        <Input
                                            value={settings.primaryColor}
                                            onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                                            placeholder="#000000"
                                            className="uppercase font-mono"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="w-full h-px bg-slate-100 my-2"></div>

                            {/* Hero Section */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-bold text-slate-900 uppercase">Home Page Hero</h3>
                                </div>

                                <div className="space-y-3">
                                    <Label>Main Headline</Label>
                                    <Textarea
                                        value={settings.heroTitle}
                                        onChange={(e) => setSettings({ ...settings, heroTitle: e.target.value })}
                                        placeholder="Catchy title..."
                                        className="min-h-[100px] font-caveat text-xl"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <Label>Subtitle</Label>
                                    <Textarea
                                        value={settings.heroSubtitle}
                                        onChange={(e) => setSettings({ ...settings, heroSubtitle: e.target.value })}
                                        placeholder="Subtext..."
                                        className="min-h-[80px]"
                                    />
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="space-y-4">
                            {versions.length === 0 ? (
                                <p className="text-center text-slate-400 py-8">No history available.</p>
                            ) : (
                                versions.map((v) => (
                                    <div key={v.id} className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-bold bg-slate-100 px-2 py-1 rounded text-slate-600">
                                                Ver {v.id}
                                            </span>
                                            <span className="text-xs text-slate-400">
                                                {new Date(v.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-600 mb-3">
                                            {v.note || "Auto-save"}
                                        </p>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="w-full text-xs"
                                            onClick={() => handleRevert(v.id)}
                                        >
                                            <RefreshCw className="w-3 h-3 mr-2" /> Revert to this
                                        </Button>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Actions - Only visible in Editor mode */}
                {activeTab === 'editor' && (
                    <div className="p-6 border-t border-slate-100 bg-slate-50 sticky bottom-0 z-10">
                        <div className="flex items-center gap-3">
                            <Button
                                variant="outline"
                                onClick={loadSettings}
                                disabled={saving}
                                className="flex-1"
                            >
                                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                                Reset
                            </Button>
                            <Button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex-1 bg-[#01B0F1] hover:bg-[#0091d4]"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                {saving ? 'Saving...' : 'Publish Changes'}
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Right Area - Live Preview */}
            <div className="flex-1 bg-slate-100 overflow-hidden relative flex flex-col">
                <div className="bg-slate-900 text-white text-xs py-2 px-4 flex items-center justify-between shadow-md z-30">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="font-mono opacity-80">LIVE PREVIEW MODE</span>
                    </div>
                </div>

                <div className="flex-1 overflow-auto bg-slate-200/50 flex items-start justify-center p-8">
                    {/* Preview Container - Scaled to fit but maintained aspect ratio */}
                    <div className="origin-top transform scale-[0.65] lg:scale-[0.75] xl:scale-[0.85] w-[1280px] min-h-[1000px] bg-white shadow-2xl rounded-lg overflow-hidden border border-slate-200 ring-4 ring-slate-200/50">
                        <HomeView
                            heroTitle={settings.heroTitle || "Title Placeholder"}
                            heroSubtitle={settings.heroSubtitle || "Subtitle Placeholder"}
                            platformName={settings.platformName || "Platform"}
                        // Pass other branding props if HomeView supports them
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
