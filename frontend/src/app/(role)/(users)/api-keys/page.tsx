"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/services/api";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Copy, Trash2, Key, Eye, EyeOff, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface APIKey {
    id: number;
    name: string;
    key_prefix: string;
    permissions: string[];
    rate_limit: number;
    is_active: boolean;
    last_used_at: string | null;
    expires_at: string | null;
    created_at: string;
}

const PERMISSIONS = [
    { value: "read:files", label: "Read Files" },
    { value: "write:files", label: "Upload Files" },
    { value: "delete:files", label: "Delete Files" },
    { value: "convert:pdf", label: "PDF Conversion" },
    { value: "edit:pdf", label: "PDF Editing" },
    { value: "batch:process", label: "Batch Processing" },
];

export default function APIKeysPage() {
    const [keys, setKeys] = useState<APIKey[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newKeyResult, setNewKeyResult] = useState<{ key: string; name: string } | null>(null);
    const [showKey, setShowKey] = useState(false);
    const [form, setForm] = useState({
        name: "",
        permissions: ["read:files", "convert:pdf"],
        rate_limit: 1000,
        expires_in_days: 365
    });

    useEffect(() => {
        loadKeys();
    }, []);

    const loadKeys = async () => {
        setLoading(true);
        try {
            const response = await api.get("/accounts/api-keys/");
            setKeys(response?.results || response || []);
        } catch (error: any) {
            if (error?.response?.status === 403) {
                toast.error("API access is a premium feature");
            } else {
                toast.error("Failed to load API keys");
            }
        } finally {
            setLoading(false);
        }
    };

    const createKey = async () => {
        try {
            const response = await api.post("/accounts/api-keys/", form);
            setNewKeyResult({ key: response.key, name: form.name });
            setIsCreateOpen(false);
            setForm({ name: "", permissions: ["read:files", "convert:pdf"], rate_limit: 1000, expires_in_days: 365 });
            loadKeys();
            toast.success("API key created");
        } catch (error) {
            toast.error("Failed to create API key");
        }
    };

    const revokeKey = async (id: number) => {
        if (!confirm("Revoke this API key? This cannot be undone.")) return;
        try {
            await api.delete(`/accounts/api-keys/${id}/`);
            toast.success("API key revoked");
            loadKeys();
        } catch (error) {
            toast.error("Failed to revoke API key");
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard");
    };

    const togglePermission = (perm: string) => {
        setForm(f => ({
            ...f,
            permissions: f.permissions.includes(perm)
                ? f.permissions.filter(p => p !== perm)
                : [...f.permissions, perm]
        }));
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">API Keys</h1>
                    <p className="text-muted-foreground">Manage API keys for programmatic access (Premium Feature)</p>
                </div>
                <Button onClick={() => setIsCreateOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" /> Create API Key
                </Button>
            </div>

            {/* Usage Stats */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Active Keys</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{keys.filter(k => k.is_active).length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Keys</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{keys.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Rate Limit</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">1,000/hr</div>
                    </CardContent>
                </Card>
            </div>

            {/* Keys Table */}
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Key</TableHead>
                                <TableHead>Permissions</TableHead>
                                <TableHead>Rate Limit</TableHead>
                                <TableHead>Last Used</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                    </TableCell>
                                </TableRow>
                            ) : keys.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                        <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                        <p>No API keys yet</p>
                                        <Button variant="outline" className="mt-2" onClick={() => setIsCreateOpen(true)}>
                                            Create your first key
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                keys.map((key) => (
                                    <TableRow key={key.id}>
                                        <TableCell className="font-medium">{key.name}</TableCell>
                                        <TableCell>
                                            <code className="bg-muted px-2 py-1 rounded text-sm">
                                                {key.key_prefix}...
                                            </code>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {key.permissions.slice(0, 2).map(p => (
                                                    <Badge key={p} variant="outline" className="text-xs">{p}</Badge>
                                                ))}
                                                {key.permissions.length > 2 && (
                                                    <Badge variant="outline" className="text-xs">+{key.permissions.length - 2}</Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>{key.rate_limit}/hr</TableCell>
                                        <TableCell>
                                            {key.last_used_at
                                                ? new Date(key.last_used_at).toLocaleDateString()
                                                : "Never"}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={key.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>
                                                {key.is_active ? "Active" : "Revoked"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {key.is_active && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => revokeKey(key.id)}
                                                >
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Create Key Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create API Key</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label>Key Name</Label>
                            <Input
                                value={form.name}
                                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                                placeholder="Production Server"
                            />
                        </div>
                        <div>
                            <Label>Permissions</Label>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                {PERMISSIONS.map(perm => (
                                    <label key={perm.value} className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={form.permissions.includes(perm.value)}
                                            onChange={() => togglePermission(perm.value)}
                                            className="rounded"
                                        />
                                        <span className="text-sm">{perm.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Rate Limit (per hour)</Label>
                                <Select
                                    value={form.rate_limit.toString()}
                                    onValueChange={(v) => setForm(f => ({ ...f, rate_limit: parseInt(v) }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="100">100</SelectItem>
                                        <SelectItem value="500">500</SelectItem>
                                        <SelectItem value="1000">1,000</SelectItem>
                                        <SelectItem value="5000">5,000</SelectItem>
                                        <SelectItem value="10000">10,000</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Expires In</Label>
                                <Select
                                    value={form.expires_in_days.toString()}
                                    onValueChange={(v) => setForm(f => ({ ...f, expires_in_days: parseInt(v) }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="30">30 days</SelectItem>
                                        <SelectItem value="90">90 days</SelectItem>
                                        <SelectItem value="365">1 year</SelectItem>
                                        <SelectItem value="1095">3 years</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                        <Button onClick={createKey} disabled={!form.name}>Create Key</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* New Key Result Dialog */}
            <Dialog open={!!newKeyResult} onOpenChange={() => setNewKeyResult(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>API Key Created</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-sm text-yellow-800 font-medium">
                                ⚠️ Copy this key now. You won't be able to see it again!
                            </p>
                        </div>
                        <div>
                            <Label>Key Name</Label>
                            <p className="font-medium">{newKeyResult?.name}</p>
                        </div>
                        <div>
                            <Label>API Key</Label>
                            <div className="flex gap-2 mt-1">
                                <Input
                                    type={showKey ? "text" : "password"}
                                    value={newKeyResult?.key || ""}
                                    readOnly
                                    className="font-mono"
                                />
                                <Button variant="outline" size="icon" onClick={() => setShowKey(!showKey)}>
                                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => newKeyResult && copyToClipboard(newKeyResult.key)}
                                >
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setNewKeyResult(null)}>Done</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
