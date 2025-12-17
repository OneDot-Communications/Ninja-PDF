"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash, Copy, Check, Terminal } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { motion } from "framer-motion";

export default function DeveloperPage() {
    const [keys, setKeys] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [createOpen, setCreateOpen] = useState(false);
    const [newKeyName, setNewKeyName] = useState("");
    const [createdKey, setCreatedKey] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        loadKeys();
    }, []);

    const loadKeys = async () => {
        try {
            const data = await api.getAPIKeys();
            setKeys(data);
        } catch (error) {
            toast.error("Failed to load API keys");
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!newKeyName) return;
        setCreating(true);
        try {
            const res = await api.createAPIKey(newKeyName);
            setCreatedKey(res.key); // Display raw key
            loadKeys();
            toast.success("API Key created");
        } catch (error: any) {
            toast.error(error.message || "Failed to create API Key");
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure? This action cannot be undone.")) return;
        try {
            await api.deleteAPIKey(id);
            toast.success("API Key revoked");
            loadKeys();
        } catch (error) {
            toast.error("Failed to revoke API Key");
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard");
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
        >
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Developer Settings</h2>
                    <p className="text-muted-foreground">Manage your API keys for programmatic access.</p>
                </div>
                <Dialog open={createOpen} onOpenChange={(open) => {
                    setCreateOpen(open);
                    if (!open) setCreatedKey(null); // Reset on close
                }}>
                    <DialogTrigger asChild>
                        <Button><Plus className="w-4 h-4 mr-2" /> Create New Key</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create API Key</DialogTitle>
                            <DialogDescription>
                                Generate a new key to access the 18+ PDF API.
                            </DialogDescription>
                        </DialogHeader>

                        {!createdKey ? (
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Key Name</Label>
                                    <Input
                                        placeholder="e.g. Production App"
                                        value={newKeyName}
                                        onChange={(e) => setNewKeyName(e.target.value)}
                                    />
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                                    <Button onClick={handleCreate} disabled={creating || !newKeyName}>
                                        {creating ? "Creating..." : "Create Key"}
                                    </Button>
                                </DialogFooter>
                            </div>
                        ) : (
                            <div className="space-y-4 py-4">
                                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg space-y-2">
                                    <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
                                        <Terminal className="w-4 h-4" /> Save this key!
                                    </h4>
                                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                                        This key will only be shown once. Copy it now.
                                    </p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <code className="flex-1 bg-white dark:bg-black p-2 rounded border border-yellow-300 dark:border-yellow-700 font-mono text-sm break-all">
                                            {createdKey}
                                        </code>
                                        <Button size="icon" variant="ghost" onClick={() => copyToClipboard(createdKey)}>
                                            <Copy className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button onClick={() => setCreateOpen(false)}>Done</Button>
                                </DialogFooter>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Your API Keys</CardTitle>
                    <CardDescription>
                        Authenticate requests with `X-API-Key` header.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Prefix</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead>Last Used</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {keys.length === 0 && !loading && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        No API keys found.
                                    </TableCell>
                                </TableRow>
                            )}
                            {keys.map((key) => (
                                <TableRow key={key.id}>
                                    <TableCell className="font-medium">{key.name}</TableCell>
                                    <TableCell className="font-mono text-xs text-muted-foreground">{key.prefix}...</TableCell>
                                    <TableCell>{format(new Date(key.created_at), 'MMM d, yyyy')}</TableCell>
                                    <TableCell>
                                        {key.last_used_at ? format(new Date(key.last_used_at), 'MMM d, HH:mm') : '-'}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={key.is_active ? "default" : "secondary"}>
                                            {key.is_active ? "Active" : "Inactive"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                            onClick={() => handleDelete(key.id)}
                                        >
                                            <Trash className="w-4 h-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </motion.div>
    );
}
