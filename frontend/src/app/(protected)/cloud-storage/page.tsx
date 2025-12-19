"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/services/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Cloud, Link2, Unlink, FolderOpen, Download, Upload, RefreshCw, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";

interface CloudProvider {
    id: number;
    name: string;
    provider_type: string;
    is_active: boolean;
    max_file_size_mb: number;
}

interface CloudConnection {
    id: number;
    provider_name: string;
    provider_type: string;
    account_email: string;
    account_name: string;
    status: string;
    is_expired: boolean;
    last_sync_at: string;
    created_at: string;
}

interface CloudFile {
    id: string;
    name: string;
    is_folder: boolean;
    size?: number;
    modified?: string;
}

export default function CloudStoragePage() {
    const [providers, setProviders] = useState<CloudProvider[]>([]);
    const [connections, setConnections] = useState<CloudConnection[]>([]);
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState<string | null>(null);
    const [browseConnection, setBrowseConnection] = useState<CloudConnection | null>(null);
    const [files, setFiles] = useState<CloudFile[]>([]);
    const [currentFolder, setCurrentFolder] = useState<string | null>(null);
    const [folderStack, setFolderStack] = useState<{ id: string | null; name: string }[]>([{ id: null, name: "Root" }]);
    const [filesLoading, setFilesLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [providersRes, connectionsRes] = await Promise.all([
                api.get("/files/cloud/providers/"),
                api.get("/files/cloud/connections/")
            ]);
            setProviders(providersRes?.providers || []);
            setConnections(connectionsRes?.connections || []);
        } catch (error: any) {
            if (error?.response?.status === 403) {
                toast.error("Cloud storage is a premium feature");
            } else {
                toast.error("Failed to load cloud storage data");
            }
        } finally {
            setLoading(false);
        }
    };

    const connectProvider = async (providerType: string) => {
        setConnecting(providerType);
        try {
            const response = await api.post(`/files/cloud/connect/${providerType}/`);
            if (response?.auth_url) {
                window.location.href = response.auth_url;
            }
        } catch (error) {
            toast.error("Failed to initiate connection");
            setConnecting(null);
        }
    };

    const disconnectProvider = async (connectionId: number) => {
        if (!confirm("Disconnect this cloud storage account?")) return;
        try {
            await api.post(`/files/cloud/${connectionId}/disconnect/`);
            toast.success("Disconnected");
            loadData();
        } catch (error) {
            toast.error("Failed to disconnect");
        }
    };

    const browseFiles = async (connection: CloudConnection) => {
        setBrowseConnection(connection);
        setCurrentFolder(null);
        setFolderStack([{ id: null, name: "Root" }]);
        await loadFiles(connection.id, null);
    };

    const loadFiles = async (connectionId: number, folderId: string | null) => {
        setFilesLoading(true);
        try {
            const params = folderId ? `?folder_id=${folderId}` : "";
            const response = await api.get(`/files/cloud/${connectionId}/files/${params}`);
            setFiles(response?.files || []);
        } catch (error) {
            toast.error("Failed to load files");
        } finally {
            setFilesLoading(false);
        }
    };

    const navigateToFolder = (file: CloudFile) => {
        if (file.is_folder && browseConnection) {
            setCurrentFolder(file.id);
            setFolderStack(prev => [...prev, { id: file.id, name: file.name }]);
            loadFiles(browseConnection.id, file.id);
        }
    };

    const navigateBack = (index: number) => {
        if (browseConnection) {
            const folder = folderStack[index];
            setCurrentFolder(folder.id);
            setFolderStack(prev => prev.slice(0, index + 1));
            loadFiles(browseConnection.id, folder.id);
        }
    };

    const importFile = async (file: CloudFile) => {
        if (!browseConnection) return;
        try {
            await api.post(`/files/cloud/${browseConnection.id}/import/`, {
                file_id: file.id,
                file_name: file.name
            });
            toast.success(`Imported ${file.name}`);
        } catch (error) {
            toast.error("Failed to import file");
        }
    };

    const getProviderIcon = (type: string) => {
        const icons: { [key: string]: string } = {
            GOOGLE_DRIVE: "🔵",
            DROPBOX: "🔷",
            ONEDRIVE: "☁️"
        };
        return icons[type] || "📁";
    };

    const getProviderColor = (type: string) => {
        const colors: { [key: string]: string } = {
            GOOGLE_DRIVE: "bg-blue-100 hover:bg-blue-200 border-blue-300",
            DROPBOX: "bg-sky-100 hover:bg-sky-200 border-sky-300",
            ONEDRIVE: "bg-cyan-100 hover:bg-cyan-200 border-cyan-300"
        };
        return colors[type] || "";
    };

    const isConnected = (providerType: string) => {
        return connections.some(c => c.provider_type === providerType);
    };

    const getConnection = (providerType: string) => {
        return connections.find(c => c.provider_type === providerType);
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
            <div>
                <h1 className="text-3xl font-bold">Cloud Storage</h1>
                <p className="text-muted-foreground">Connect and sync files with your cloud storage providers</p>
            </div>

            {/* Providers Grid */}
            <div className="grid gap-4 md:grid-cols-3">
                {providers.map(provider => {
                    const connected = isConnected(provider.provider_type);
                    const connection = getConnection(provider.provider_type);

                    return (
                        <Card key={provider.id} className={`transition-all ${getProviderColor(provider.provider_type)}`}>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="text-3xl">{getProviderIcon(provider.provider_type)}</span>
                                        <div>
                                            <CardTitle className="text-lg">{provider.name}</CardTitle>
                                            {connected && connection && (
                                                <p className="text-sm text-muted-foreground">{connection.account_email}</p>
                                            )}
                                        </div>
                                    </div>
                                    {connected && (
                                        <Badge className="bg-green-100 text-green-700">
                                            <CheckCircle className="h-3 w-3 mr-1" /> Connected
                                        </Badge>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent>
                                {connected && connection ? (
                                    <div className="space-y-2">
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1"
                                                onClick={() => browseFiles(connection)}
                                            >
                                                <FolderOpen className="h-4 w-4 mr-1" /> Browse
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => disconnectProvider(connection.id)}
                                            >
                                                <Unlink className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        {connection.last_sync_at && (
                                            <p className="text-xs text-muted-foreground">
                                                Last sync: {new Date(connection.last_sync_at).toLocaleString()}
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <Button
                                        className="w-full"
                                        onClick={() => connectProvider(provider.provider_type)}
                                        disabled={connecting === provider.provider_type}
                                    >
                                        {connecting === provider.provider_type ? (
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                            <Link2 className="h-4 w-4 mr-2" />
                                        )}
                                        Connect
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Connected Accounts */}
            {connections.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Connected Accounts</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Provider</TableHead>
                                    <TableHead>Account</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Connected</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {connections.map(conn => (
                                    <TableRow key={conn.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span>{getProviderIcon(conn.provider_type)}</span>
                                                <span className="font-medium">{conn.provider_name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div>
                                                <div>{conn.account_name}</div>
                                                <div className="text-sm text-muted-foreground">{conn.account_email}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={conn.is_expired ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}>
                                                {conn.is_expired ? "Expired" : "Active"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{new Date(conn.created_at).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex gap-2 justify-end">
                                                <Button variant="outline" size="sm" onClick={() => browseFiles(conn)}>
                                                    <FolderOpen className="h-4 w-4" />
                                                </Button>
                                                <Button variant="outline" size="sm" onClick={() => disconnectProvider(conn.id)}>
                                                    <Unlink className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {/* File Browser Dialog */}
            <Dialog open={!!browseConnection} onOpenChange={() => setBrowseConnection(null)}>
                <DialogContent className="max-w-3xl max-h-[80vh]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {browseConnection && (
                                <>
                                    {getProviderIcon(browseConnection.provider_type)}
                                    <span>{browseConnection.provider_name}</span>
                                </>
                            )}
                        </DialogTitle>
                    </DialogHeader>

                    {/* Breadcrumb */}
                    <div className="flex items-center gap-1 text-sm overflow-x-auto pb-2">
                        {folderStack.map((folder, index) => (
                            <span key={index} className="flex items-center">
                                {index > 0 && <span className="mx-1 text-muted-foreground">/</span>}
                                <button
                                    className={`hover:underline ${index === folderStack.length - 1 ? "font-medium" : "text-muted-foreground"}`}
                                    onClick={() => navigateBack(index)}
                                >
                                    {folder.name}
                                </button>
                            </span>
                        ))}
                    </div>

                    {/* Files List */}
                    <div className="border rounded-lg overflow-hidden">
                        {filesLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-6 w-6 animate-spin" />
                            </div>
                        ) : files.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                No files in this folder
                            </div>
                        ) : (
                            <div className="max-h-96 overflow-y-auto">
                                {files.map(file => (
                                    <div
                                        key={file.id}
                                        className="flex items-center justify-between p-3 border-b last:border-0 hover:bg-muted/50"
                                    >
                                        <div
                                            className={`flex items-center gap-3 flex-1 ${file.is_folder ? "cursor-pointer" : ""}`}
                                            onClick={() => file.is_folder && navigateToFolder(file)}
                                        >
                                            <span className="text-xl">{file.is_folder ? "📁" : "📄"}</span>
                                            <div>
                                                <div className="font-medium">{file.name}</div>
                                                {file.size && (
                                                    <div className="text-xs text-muted-foreground">
                                                        {(file.size / 1024 / 1024).toFixed(2)} MB
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {!file.is_folder && (
                                            <Button size="sm" onClick={() => importFile(file)}>
                                                <Download className="h-4 w-4 mr-1" /> Import
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => browseConnection && loadFiles(browseConnection.id, currentFolder)}>
                            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
                        </Button>
                        <Button variant="outline" onClick={() => setBrowseConnection(null)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
