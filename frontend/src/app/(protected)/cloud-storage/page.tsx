"use client";

import { useEffect, useState } from "react";
import { api } from "@/app/lib/api";
import { Cloud, Plus, Trash2, RefreshCw, Link2, Unlink, Check, AlertCircle } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface CloudProvider {
    id: number;
    name: string;
    provider_type: string;
    is_active: boolean;
    max_file_size_mb: number;
    icon: string | null;
}

interface CloudConnection {
    id: number;
    provider: number;
    provider_name: string;
    provider_type: string;
    account_email: string;
    account_name: string;
    status: string;
    is_token_expired: boolean;
    last_sync_at: string | null;
    auto_sync_enabled: boolean;
}

const providerIcons: Record<string, string> = {
    GOOGLE_DRIVE: '🔷',
    DROPBOX: '📦',
    ONEDRIVE: '☁️',
    AWS_S3: '🪣',
};

const statusColors: Record<string, string> = {
    ACTIVE: 'bg-green-500',
    EXPIRED: 'bg-yellow-500',
    REVOKED: 'bg-red-500',
    ERROR: 'bg-red-500',
};

export default function CloudStoragePage() {
    const [providers, setProviders] = useState<CloudProvider[]>([]);
    const [connections, setConnections] = useState<CloudConnection[]>([]);
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState<number | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [providerData, connectionData] = await Promise.all([
                api.request('GET', '/files/cloud/providers/'),
                api.request('GET', '/files/cloud/connections/'),
            ]);
            setProviders(providerData.results || providerData || []);
            setConnections(connectionData.results || connectionData || []);
        } catch (error) {
            toast.error("Failed to load cloud storage data");
        } finally {
            setLoading(false);
        }
    };

    const connectProvider = async (providerId: number) => {
        setConnecting(providerId);
        try {
            const data = await api.request('POST', '/files/cloud/connections/connect/', { provider_id: providerId });
            if (data.auth_url) {
                // Open OAuth window
                window.open(data.auth_url, '_blank', 'width=600,height=700');
                toast.info("Complete the authorization in the popup window");
            }
        } catch (error: any) {
            toast.error(error?.response?.data?.error || "Failed to start connection");
        } finally {
            setConnecting(null);
        }
    };

    const disconnectProvider = async (connectionId: number) => {
        if (!confirm("Disconnect this cloud storage?")) return;
        try {
            await api.request('POST', `/files/cloud/connections/${connectionId}/disconnect/`);
            toast.success("Disconnected");
            loadData();
        } catch (error) {
            toast.error("Failed to disconnect");
        }
    };

    const refreshToken = async (connectionId: number) => {
        try {
            await api.request('POST', `/files/cloud/connections/${connectionId}/refresh_token/`);
            toast.success("Token refreshed");
            loadData();
        } catch (error) {
            toast.error("Failed to refresh token");
        }
    };

    const getConnectionForProvider = (providerType: string) => {
        return connections.find(c => c.provider_type === providerType);
    };

    if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="container mx-auto py-10 space-y-8">
            <div className="flex items-center gap-2">
                <div className="p-2 bg-sky-100 rounded-lg text-sky-600">
                    <Cloud className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Cloud Storage</h1>
                    <p className="text-slate-500">Connect your cloud storage accounts to import and export files</p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {providers.map(provider => {
                    const connection = getConnectionForProvider(provider.provider_type);
                    const isConnected = connection && connection.status === 'ACTIVE';

                    return (
                        <Card key={provider.id} className={!provider.is_active ? 'opacity-50' : ''}>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="text-4xl">{providerIcons[provider.provider_type] || '☁️'}</span>
                                        <div>
                                            <CardTitle className="text-lg">{provider.name}</CardTitle>
                                            <CardDescription>Max {provider.max_file_size_mb} MB per file</CardDescription>
                                        </div>
                                    </div>
                                    {!provider.is_active && <Badge variant="secondary">Disabled</Badge>}
                                </div>
                            </CardHeader>
                            <CardContent>
                                {connection ? (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Badge className={statusColors[connection.status]}>
                                                    {connection.status}
                                                </Badge>
                                                {connection.is_token_expired && (
                                                    <Badge variant="destructive">Token Expired</Badge>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-sm space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Check className="h-4 w-4 text-green-500" />
                                                <span className="text-slate-600">{connection.account_email || connection.account_name || 'Connected'}</span>
                                            </div>
                                            {connection.last_sync_at && (
                                                <p className="text-slate-400 text-xs">
                                                    Last sync: {new Date(connection.last_sync_at).toLocaleString()}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            {connection.is_token_expired && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => refreshToken(connection.id)}
                                                >
                                                    <RefreshCw className="h-4 w-4 mr-1" /> Refresh
                                                </Button>
                                            )}
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="text-red-500 hover:text-red-600"
                                                onClick={() => disconnectProvider(connection.id)}
                                            >
                                                <Unlink className="h-4 w-4 mr-1" /> Disconnect
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <p className="text-sm text-slate-500">
                                            Connect your {provider.name} account to easily import and export PDF files.
                                        </p>
                                        <Button
                                            className="w-full"
                                            onClick={() => connectProvider(provider.id)}
                                            disabled={connecting === provider.id || !provider.is_active}
                                        >
                                            {connecting === provider.id ? (
                                                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Connecting...</>
                                            ) : (
                                                <><Link2 className="h-4 w-4 mr-2" /> Connect {provider.name}</>
                                            )}
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {providers.length === 0 && (
                <Card className="p-12 text-center">
                    <Cloud className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                    <h3 className="text-lg font-medium text-slate-900">No Cloud Providers Available</h3>
                    <p className="text-slate-500 mt-1">
                        Contact your administrator to enable cloud storage integrations.
                    </p>
                </Card>
            )}

            <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                        <AlertCircle className="h-6 w-6 text-blue-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <h3 className="font-medium text-blue-900">How Cloud Storage Works</h3>
                            <ul className="mt-2 text-sm text-blue-700 space-y-1 list-disc list-inside">
                                <li>Connect your cloud accounts securely via OAuth</li>
                                <li>Import PDFs directly from your cloud storage</li>
                                <li>Export processed files back to your cloud</li>
                                <li>Your credentials are never stored - only OAuth tokens</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
