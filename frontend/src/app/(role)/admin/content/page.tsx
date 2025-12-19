"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/services/api";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Edit, Trash2, Megaphone, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function ContentManagementPage() {
    const [activeTab, setActiveTab] = useState("announcements");
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<any[]>([]);

    // Dialog state
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<any | null>(null);
    const [formData, setFormData] = useState<any>({});

    useEffect(() => {
        loadContent();
    }, [activeTab]);

    const loadContent = async () => {
        setLoading(true);
        try {
            let data;
            if (activeTab === "announcements") {
                data = await api.getAnnouncements();
            } else {
                data = await api.getHelpArticles();
            }
            // data might be { results: [...] } or [...]
            setItems(Array.isArray(data) ? data : data.results || []);
        } catch (error) {
            toast.error("Failed to load content");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        try {
            if (activeTab === "announcements") {
                if (editingItem) {
                    await api.updateAnnouncement(editingItem.id, formData);
                    toast.success("Announcement updated");
                } else {
                    await api.createAnnouncement(formData);
                    toast.success("Announcement created");
                }
            } else {
                if (editingItem) {
                    await api.updateHelpArticle(editingItem.id, formData);
                    toast.success("Article updated");
                } else {
                    await api.createHelpArticle(formData);
                    toast.success("Article created");
                }
            }
            setIsDialogOpen(false);
            loadContent();
        } catch (error: any) {
            toast.error(error.message || "Operation failed");
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this item?")) return;
        try {
            if (activeTab === "announcements") {
                await api.deleteAnnouncement(id);
            } else {
                await api.deleteHelpArticle(id);
            }
            toast.success("Item deleted");
            loadContent();
        } catch (error) {
            toast.error("Failed to delete item");
        }
    };

    const openCreateDialog = () => {
        setEditingItem(null);
        setFormData({ is_active: true, is_public: true }); // defaults
        setIsDialogOpen(true);
    };

    const openEditDialog = (item: any) => {
        setEditingItem(item);
        setFormData({ ...item });
        setIsDialogOpen(true);
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Content Management</h1>
                    <p className="text-muted-foreground">Manage announcements and help articles</p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList>
                    <TabsTrigger value="announcements" className="flex items-center gap-2">
                        <Megaphone className="h-4 w-4" /> Announcements
                    </TabsTrigger>
                    <TabsTrigger value="help" className="flex items-center gap-2">
                        <HelpCircle className="h-4 w-4" /> Help Articles
                    </TabsTrigger>
                </TabsList>

                <div className="flex justify-end mb-4">
                    <Button onClick={openCreateDialog}>
                        <Plus className="mr-2 h-4 w-4" /> Create New
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>{activeTab === "announcements" ? "Announcements" : "Help Articles"}</CardTitle>
                        <CardDescription>
                            {activeTab === "announcements"
                                ? "System-wide notifications for users"
                                : "Knowledge base articles and FAQs"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : items.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">No content found.</div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Title</TableHead>
                                        <TableHead>Status</TableHead>
                                        {activeTab === "announcements" && <TableHead>Type</TableHead>}
                                        {activeTab === "help" && <TableHead>Category</TableHead>}
                                        <TableHead>Created</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">{item.title}</TableCell>
                                            <TableCell>
                                                <Badge variant={item.is_active ? "default" : "secondary"}>
                                                    {item.is_active ? "Active" : "Draft"}
                                                </Badge>
                                            </TableCell>
                                            {activeTab === "announcements" && (
                                                <TableCell>
                                                    <Badge variant="outline">{item.type || 'INFO'}</Badge>
                                                </TableCell>
                                            )}
                                            {activeTab === "help" && (
                                                <TableCell>{item.category || '-'}</TableCell>
                                            )}
                                            <TableCell className="text-sm text-muted-foreground">
                                                {format(new Date(item.created_at), "MMM d, yyyy")}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm" onClick={() => openEditDialog(item)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDelete(item.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </Tabs>

            {/* Editor Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingItem ? "Edit" : "Create"} {activeTab === "announcements" ? "Announcement" : "Article"}</DialogTitle>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Title</Label>
                            <Input
                                value={formData.title || ""}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                placeholder="Enter title..."
                            />
                        </div>

                        {activeTab === "announcements" && (
                            <div className="grid gap-2">
                                <Label>Type</Label>
                                <Select
                                    value={formData.type || "INFO"}
                                    onValueChange={v => setFormData({ ...formData, type: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="INFO">Info</SelectItem>
                                        <SelectItem value="WARNING">Warning</SelectItem>
                                        <SelectItem value="CRITICAL">Critical</SelectItem>
                                        <SelectItem value="SUCCESS">Success</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {activeTab === "help" && (
                            <div className="grid gap-2">
                                <Label>Category (Slug or Name)</Label>
                                <Input
                                    value={formData.category || ""}
                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                    placeholder="e.g. billing, tools, account"
                                />
                            </div>
                        )}

                        <div className="grid gap-2">
                            <Label>Content (Markdown supported)</Label>
                            <Textarea
                                className="min-h-[200px]"
                                value={formData.content || ""}
                                onChange={e => setFormData({ ...formData, content: e.target.value })}
                                placeholder="Type your content here..."
                            />
                        </div>

                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.is_active ?? true}
                                    onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                    className="rounded border-gray-300"
                                />
                                Active / Published
                            </label>

                            {activeTab === "announcements" && (
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_public ?? true}
                                        onChange={e => setFormData({ ...formData, is_public: e.target.checked })}
                                        className="rounded border-gray-300"
                                    />
                                    Public (Visible to guests)
                                </label>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSubmit}>{editingItem ? "Update" : "Create"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
