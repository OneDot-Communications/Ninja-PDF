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
import { Loader2, Plus, Pencil, Trash2, Megaphone, Eye, EyeOff, Send } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface Announcement {
    id: number;
    title: string;
    content: string;
    announcement_type: string;
    target_audience: string;
    is_active: boolean;
    is_dismissible: boolean;
    starts_at: string;
    ends_at: string | null;
    created_at: string;
    views_count: number;
    dismissals_count: number;
}

const TYPES = [
    { value: "INFO", label: "Info", color: "bg-blue-100 text-blue-700" },
    { value: "SUCCESS", label: "Success", color: "bg-green-100 text-green-700" },
    { value: "WARNING", label: "Warning", color: "bg-yellow-100 text-yellow-700" },
    { value: "ERROR", label: "Error", color: "bg-red-100 text-red-700" },
    { value: "MAINTENANCE", label: "Maintenance", color: "bg-purple-100 text-purple-700" },
];

const AUDIENCES = [
    { value: "ALL", label: "All Users" },
    { value: "FREE", label: "Free Users Only" },
    { value: "PREMIUM", label: "Premium Users Only" },
    { value: "ADMIN", label: "Admins Only" },
];

export default function AnnouncementsPage() {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editing, setEditing] = useState<Announcement | null>(null);
    const [form, setForm] = useState({
        title: "",
        content: "",
        announcement_type: "INFO",
        target_audience: "ALL",
        is_active: true,
        is_dismissible: true,
        starts_at: new Date().toISOString().slice(0, 16),
        ends_at: ""
    });

    useEffect(() => {
        loadAnnouncements();
    }, []);

    const loadAnnouncements = async () => {
        setLoading(true);
        try {
            const response = await api.get("/content/announcements/");
            setAnnouncements(response?.results || response || []);
        } catch (error) {
            toast.error("Failed to load announcements");
        } finally {
            setLoading(false);
        }
    };

    const openEditor = (announcement?: Announcement) => {
        if (announcement) {
            setEditing(announcement);
            setForm({
                title: announcement.title,
                content: announcement.content,
                announcement_type: announcement.announcement_type,
                target_audience: announcement.target_audience,
                is_active: announcement.is_active,
                is_dismissible: announcement.is_dismissible,
                starts_at: announcement.starts_at.slice(0, 16),
                ends_at: announcement.ends_at?.slice(0, 16) || ""
            });
        } else {
            setEditing(null);
            setForm({
                title: "",
                content: "",
                announcement_type: "INFO",
                target_audience: "ALL",
                is_active: true,
                is_dismissible: true,
                starts_at: new Date().toISOString().slice(0, 16),
                ends_at: ""
            });
        }
        setIsEditorOpen(true);
    };

    const saveAnnouncement = async () => {
        try {
            const data = {
                ...form,
                ends_at: form.ends_at || null
            };

            if (editing) {
                await api.put(`/content/announcements/${editing.id}/`, data);
                toast.success("Announcement updated");
            } else {
                await api.post("/content/announcements/", data);
                toast.success("Announcement created");
            }
            setIsEditorOpen(false);
            loadAnnouncements();
        } catch (error) {
            toast.error("Failed to save announcement");
        }
    };

    const deleteAnnouncement = async (id: number) => {
        if (!confirm("Delete this announcement?")) return;
        try {
            await api.delete(`/content/announcements/${id}/`);
            toast.success("Announcement deleted");
            loadAnnouncements();
        } catch (error) {
            toast.error("Failed to delete announcement");
        }
    };

    const toggleActive = async (announcement: Announcement) => {
        try {
            await api.patch(`/content/announcements/${announcement.id}/`, {
                is_active: !announcement.is_active
            });
            toast.success(announcement.is_active ? "Announcement hidden" : "Announcement published");
            loadAnnouncements();
        } catch (error) {
            toast.error("Failed to update announcement");
        }
    };

    const getTypeBadge = (type: string) => {
        const t = TYPES.find(t => t.value === type);
        return <Badge className={t?.color || ""}>{t?.label || type}</Badge>;
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Announcements</h1>
                    <p className="text-muted-foreground">Create and manage system-wide announcements</p>
                </div>
                <Button onClick={() => openEditor()}>
                    <Plus className="h-4 w-4 mr-2" /> New Announcement
                </Button>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Active</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {announcements.filter(a => a.is_active).length}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Views</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {announcements.reduce((sum, a) => sum + a.views_count, 0).toLocaleString()}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Dismissals</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {announcements.reduce((sum, a) => sum + a.dismissals_count, 0).toLocaleString()}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Announcements Table */}
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Audience</TableHead>
                                <TableHead>Views</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                    </TableCell>
                                </TableRow>
                            ) : announcements.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                        <p>No announcements yet</p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                announcements.map((ann) => (
                                    <TableRow key={ann.id}>
                                        <TableCell>
                                            <div>
                                                <div className="font-medium">{ann.title}</div>
                                                <div className="text-sm text-muted-foreground line-clamp-1">
                                                    {ann.content}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>{getTypeBadge(ann.announcement_type)}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">
                                                {AUDIENCES.find(a => a.value === ann.target_audience)?.label}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{ann.views_count.toLocaleString()}</TableCell>
                                        <TableCell>
                                            <Badge className={ann.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>
                                                {ann.is_active ? "Active" : "Hidden"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex gap-1 justify-end">
                                                <Button variant="ghost" size="icon" onClick={() => toggleActive(ann)}>
                                                    {ann.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => openEditor(ann)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => deleteAnnouncement(ann.id)}>
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Editor Dialog */}
            <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editing ? "Edit Announcement" : "New Announcement"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label>Title</Label>
                            <Input
                                value={form.title}
                                onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                                placeholder="System Maintenance Scheduled"
                            />
                        </div>
                        <div>
                            <Label>Content</Label>
                            <Textarea
                                value={form.content}
                                onChange={(e) => setForm(f => ({ ...f, content: e.target.value }))}
                                placeholder="Details about the announcement..."
                                rows={4}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Type</Label>
                                <Select
                                    value={form.announcement_type}
                                    onValueChange={(v) => setForm(f => ({ ...f, announcement_type: v }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {TYPES.map(t => (
                                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Target Audience</Label>
                                <Select
                                    value={form.target_audience}
                                    onValueChange={(v) => setForm(f => ({ ...f, target_audience: v }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {AUDIENCES.map(a => (
                                            <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Start Date/Time</Label>
                                <Input
                                    type="datetime-local"
                                    value={form.starts_at}
                                    onChange={(e) => setForm(f => ({ ...f, starts_at: e.target.value }))}
                                />
                            </div>
                            <div>
                                <Label>End Date/Time (optional)</Label>
                                <Input
                                    type="datetime-local"
                                    value={form.ends_at}
                                    onChange={(e) => setForm(f => ({ ...f, ends_at: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="flex gap-6">
                            <div className="flex items-center space-x-2">
                                <Switch
                                    checked={form.is_active}
                                    onCheckedChange={(c) => setForm(f => ({ ...f, is_active: c }))}
                                />
                                <Label>Active (visible to users)</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Switch
                                    checked={form.is_dismissible}
                                    onCheckedChange={(c) => setForm(f => ({ ...f, is_dismissible: c }))}
                                />
                                <Label>Dismissible</Label>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditorOpen(false)}>Cancel</Button>
                        <Button onClick={saveAnnouncement} disabled={!form.title || !form.content}>
                            <Send className="h-4 w-4 mr-2" />
                            {editing ? "Update" : "Publish"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
