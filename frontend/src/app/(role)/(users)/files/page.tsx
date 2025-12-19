"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { api } from "@/lib/services/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog";
import {
    FileIcon, Lock, Unlock, Share2, Trash2, Download, Eye, Plus, Copy, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export default function MyFilesPage() {
    const { user, refreshUser } = useAuth();
    const [files, setFiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploadOpen, setUploadOpen] = useState(false);
    const [shareOpen, setShareOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState<any>(null);

    // Upload State
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploadPassword, setUploadPassword] = useState("");
    const [uploading, setUploading] = useState(false);

    // Share State
    const [shareUrl, setShareUrl] = useState("");

    const loadFiles = () => {
        api.getFiles()
            .then(data => setFiles(data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadFiles();
    }, []);

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!uploadFile) return;

        try {
            setUploading(true);
            await api.uploadFileAsset(uploadFile, uploadPassword);
            toast.success("File uploaded successfully");
            setUploadOpen(false);
            setUploadFile(null);
            setUploadPassword("");
            loadFiles();
            refreshUser();
        } catch (error: any) {
            toast.error(error.message || "Upload failed");
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this file?")) return;
        try {
            await api.deleteFile(id);
            toast.success("File deleted");
            setFiles(files.filter(f => f.id !== id));
            refreshUser();
        } catch (error) {
            toast.error("Failed to delete file");
        }
    };

    const handleShare = (file: any) => {
        const url = `${window.location.origin}/share/${file.share_token}`;
        setShareUrl(url);
        setSelectedFile(file);
        setShareOpen(true);
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(shareUrl);
        toast.success("Link copied to clipboard");
    };

    const handleUpdatePassword = async (add: boolean) => {
        if (!selectedFile) return;
        const newPass = add ? prompt("Enter new password:") : null;
        if (add && !newPass) return;

        try {
            await api.updateFilePassword(selectedFile.id, newPass || undefined);
            toast.success(add ? "Password protected" : "Password removed");
            setShareOpen(false);
            loadFiles();
        } catch (error) {
            toast.error("Failed to update password");
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between">
                    <Skeleton className="h-9 w-32" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                </div>
            </div>
        );
    }

    // Calculate Quota
    const used = user?.storage_used || 0;
    const limit = user?.storage_limit || 100 * 1024 * 1024; // Default 100MB
    const percent = Math.min(100, (used / limit) * 100);
    const usedMB = (used / (1024 * 1024)).toFixed(2);
    const limitMB = (limit / (1024 * 1024)).toFixed(0);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">My Files</h1>
                    <p className="text-muted-foreground">Securely store and share your files.</p>
                </div>

                <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Plus className="w-4 h-4" /> Upload File
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Upload Secure File</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleUpload} className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="file">File</Label>
                                <Input id="file" type="file" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Password Protection (Optional)</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={uploadPassword}
                                    onChange={(e) => setUploadPassword(e.target.value)}
                                    placeholder="Leave empty for public access"
                                />
                                <p className="text-xs text-muted-foreground">If set, users will need this password to download the file.</p>
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={uploading}>
                                    {uploading ? <Loader2 className="animate-spin mr-2 w-4 h-4" /> : null}
                                    {uploading ? "Uploading..." : "Upload"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Storage Quota Card */}
            <Card className="bg-slate-50 border-dashed">
                <CardContent className="p-6">
                    <div className="flex flex-col gap-4">
                        <div>
                            <h3 className="font-semibold text-lg">Storage Usage</h3>
                            <p className="text-sm text-muted-foreground">View your current storage consumption.</p>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between text-sm font-medium">
                                <span>Used Space</span>
                                <span>{usedMB} MB / {limitMB} MB</span>
                            </div>
                            <Progress value={percent} className={`h-2 ${percent > 90 ? "bg-red-100 [&>div]:bg-red-500" : ""}`} />
                            <p className="text-xs text-muted-foreground">You have ample space for your documents.</p>
                        </div>

                        <div className="pt-2">
                            <Button variant="outline" size="sm" asChild className="w-fit">
                                <a href="/pricing">Upgrade Plan</a>
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Size</TableHead>
                                <TableHead>Protection</TableHead>
                                <TableHead>Stats</TableHead>
                                <TableHead>Uploaded</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {files.map((file) => (
                                <TableRow key={file.id}>
                                    <TableCell className="font-medium flex items-center gap-2">
                                        <FileIcon className="w-4 h-4 text-blue-500" />
                                        {file.name}
                                    </TableCell>
                                    <TableCell>{(file.size_bytes / 1024).toFixed(1)} KB</TableCell>
                                    <TableCell>
                                        {file.is_protected ? (
                                            <div className="flex items-center text-green-600 text-xs font-medium bg-green-50 w-fit px-2 py-1 rounded">
                                                <Lock className="w-3 h-3 mr-1" /> Protected
                                            </div>
                                        ) : (
                                            <div className="flex items-center text-amber-600 text-xs font-medium bg-amber-50 w-fit px-2 py-1 rounded">
                                                <Unlock className="w-3 h-3 mr-1" /> Public
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-xs">
                                        <div className="flex gap-3">
                                            <span className="flex items-center"><Eye className="w-3 h-3 mr-1" /> {file.view_count}</span>
                                            <span className="flex items-center"><Download className="w-3 h-3 mr-1" /> {file.download_count}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{new Date(file.created_at).toLocaleDateString()}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button size="icon" variant="ghost" onClick={() => handleShare(file)}>
                                                <Share2 className="w-4 h-4 text-slate-500" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(file.id)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {files.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                                        No files found. Upload your first secure file.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={shareOpen} onOpenChange={setShareOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Share File</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Share Link</Label>
                            <div className="flex gap-2">
                                <Input value={shareUrl} readOnly />
                                <Button size="icon" variant="outline" onClick={copyToClipboard}>
                                    <Copy className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        {selectedFile && (
                            <div className="pt-4 border-t">
                                <h4 className="font-medium mb-2">Security Settings</h4>
                                {selectedFile.is_protected ? (
                                    <Button variant="destructive" size="sm" onClick={() => handleUpdatePassword(false)}>
                                        <Unlock className="w-4 h-4 mr-2" /> Remove Password
                                    </Button>
                                ) : (
                                    <Button variant="outline" size="sm" onClick={() => handleUpdatePassword(true)}>
                                        <Lock className="w-4 h-4 mr-2" /> Add Password Protection
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
