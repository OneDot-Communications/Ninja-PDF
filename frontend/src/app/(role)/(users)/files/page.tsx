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
    FileIcon, Lock, Unlock, Share2, Trash2, Download, Eye, Plus, Copy, Loader2, ExternalLink, AlertCircle, CheckCircle2
} from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export default function MyFilesPage() {
    const { user, refreshUser } = useAuth();
    const [files, setFiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploadOpen, setUploadOpen] = useState(false);
    const [shareOpen, setShareOpen] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState<any>(null);
    const [previewUrl, setPreviewUrl] = useState<string>("");
    const [loadingAction, setLoadingAction] = useState<number | null>(null);

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

    const handlePreview = async (file: any) => {
        try {
            setLoadingAction(file.id);
            // The file object already contains the URL from the serializer
            if (file.url) {
                setPreviewUrl(file.url);
                setSelectedFile(file);
                setPreviewOpen(true);
            } else {
                // Fetch fresh file details if URL not present
                const fileData = await api.getFileUrl(file.id);
                if (fileData.url) {
                    setPreviewUrl(fileData.url);
                    setSelectedFile(file);
                    setPreviewOpen(true);
                } else {
                    toast.error("Could not get file URL");
                }
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to load preview");
        } finally {
            setLoadingAction(null);
        }
    };

    const handleDownload = async (file: any) => {
        try {
            setLoadingAction(file.id);
            let downloadUrl = file.url;

            // Fetch fresh URL if not present
            if (!downloadUrl) {
                const fileData = await api.getFileUrl(file.id);
                downloadUrl = fileData.url;
            }

            if (downloadUrl) {
                // Create a temporary link and trigger download
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.download = file.name;
                link.target = '_blank';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                toast.success("Download started");
            } else {
                toast.error("Could not get download URL");
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to download file");
        } finally {
            setLoadingAction(null);
        }
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

    // Helper function to check if file is previewable
    const isPreviewable = (mimeType: string) => {
        if (!mimeType) return false;
        return mimeType.startsWith('image/') ||
            mimeType === 'application/pdf' ||
            mimeType.startsWith('video/') ||
            mimeType.startsWith('audio/');
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
                                <TableHead>Status</TableHead>
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
                                        {file.exists_in_storage === true ? (
                                            <div className="flex items-center text-green-600 text-xs font-medium bg-green-50 w-fit px-2 py-1 rounded" title="File exists in storage">
                                                <CheckCircle2 className="w-3 h-3 mr-1" /> Synced
                                            </div>
                                        ) : file.exists_in_storage === false ? (
                                            <div className="flex items-center text-red-600 text-xs font-medium bg-red-50 w-fit px-2 py-1 rounded" title="File missing from storage">
                                                <AlertCircle className="w-3 h-3 mr-1" /> Missing
                                            </div>
                                        ) : (
                                            <div className="flex items-center text-gray-500 text-xs font-medium bg-gray-50 w-fit px-2 py-1 rounded" title="Storage status unknown">
                                                <AlertCircle className="w-3 h-3 mr-1" /> Unknown
                                            </div>
                                        )}
                                    </TableCell>
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
                                        <div className="flex justify-end gap-1">
                                            {/* Preview Button */}
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                onClick={() => handlePreview(file)}
                                                disabled={loadingAction === file.id}
                                                title="Preview"
                                            >
                                                {loadingAction === file.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Eye className="w-4 h-4 text-blue-500" />
                                                )}
                                            </Button>
                                            {/* Download Button */}
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                onClick={() => handleDownload(file)}
                                                disabled={loadingAction === file.id}
                                                title="Download"
                                            >
                                                <Download className="w-4 h-4 text-green-500" />
                                            </Button>
                                            {/* Share Button */}
                                            <Button size="icon" variant="ghost" onClick={() => handleShare(file)} title="Share">
                                                <Share2 className="w-4 h-4 text-slate-500" />
                                            </Button>
                                            {/* Delete Button */}
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="text-destructive hover:bg-destructive/10"
                                                onClick={() => handleDelete(file.id)}
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {files.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                                        No files found. Upload your first secure file.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Share Dialog */}
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

            {/* Preview Dialog */}
            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileIcon className="w-5 h-5" />
                            {selectedFile?.name}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        {selectedFile && previewUrl && (
                            <div className="space-y-4">
                                {/* Preview based on file type */}
                                {selectedFile.mime_type?.startsWith('image/') ? (
                                    <div className="flex justify-center">
                                        <img
                                            src={previewUrl}
                                            alt={selectedFile.name}
                                            className="max-w-full max-h-[60vh] object-contain rounded-lg border"
                                        />
                                    </div>
                                ) : selectedFile.mime_type === 'application/pdf' ? (
                                    <iframe
                                        src={previewUrl}
                                        className="w-full h-[60vh] rounded-lg border"
                                        title={selectedFile.name}
                                    />
                                ) : selectedFile.mime_type?.startsWith('video/') ? (
                                    <video
                                        src={previewUrl}
                                        controls
                                        className="w-full max-h-[60vh] rounded-lg"
                                    >
                                        Your browser does not support video playback.
                                    </video>
                                ) : selectedFile.mime_type?.startsWith('audio/') ? (
                                    <audio
                                        src={previewUrl}
                                        controls
                                        className="w-full"
                                    >
                                        Your browser does not support audio playback.
                                    </audio>
                                ) : (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <FileIcon className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                                        <p>Preview not available for this file type</p>
                                        <p className="text-sm">({selectedFile.mime_type || 'Unknown type'})</p>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex justify-center gap-3 pt-4 border-t">
                                    <Button onClick={() => handleDownload(selectedFile)} className="gap-2">
                                        <Download className="w-4 h-4" /> Download
                                    </Button>
                                    <Button variant="outline" onClick={() => window.open(previewUrl, '_blank')} className="gap-2">
                                        <ExternalLink className="w-4 h-4" /> Open in New Tab
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
