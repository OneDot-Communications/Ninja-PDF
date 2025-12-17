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
import { Loader2, Plus, Pencil, Eye, FileText, History, CheckCircle } from "lucide-react";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

interface LegalDocument {
    id: number;
    document_type: string;
    title: string;
    is_required: boolean;
    is_active: boolean;
    current_version: number;
    updated_at: string;
}

interface UserConsent {
    id: number;
    user_email: string;
    document_type: string;
    version_number: number;
    consented_at: string;
}

const DOCUMENT_TYPES = [
    { value: "TERMS_OF_SERVICE", label: "Terms of Service" },
    { value: "PRIVACY_POLICY", label: "Privacy Policy" },
    { value: "COOKIE_POLICY", label: "Cookie Policy" },
    { value: "REFUND_POLICY", label: "Refund Policy" },
    { value: "ACCEPTABLE_USE", label: "Acceptable Use Policy" },
    { value: "DPA", label: "Data Processing Agreement" },
    { value: "SLA", label: "Service Level Agreement" },
];

export default function LegalManagementPage() {
    const [documents, setDocuments] = useState<LegalDocument[]>([]);
    const [consents, setConsents] = useState<UserConsent[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingDoc, setEditingDoc] = useState<LegalDocument | null>(null);
    const [docForm, setDocForm] = useState({
        document_type: "",
        title: "",
        content: "",
        is_required: true,
        is_active: true,
        change_summary: ""
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [docsRes, consentsRes] = await Promise.all([
                api.get("/content/legal-documents/"),
                api.get("/content/legal-consents/?recent=true")
            ]);
            setDocuments(docsRes?.results || docsRes || []);
            setConsents(consentsRes?.results || consentsRes || []);
        } catch (error) {
            toast.error("Failed to load legal documents");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveDocument = async () => {
        try {
            if (editingDoc) {
                await api.put(`/content/legal-documents/${editingDoc.id}/`, docForm);
                toast.success("Document updated - new version created");
            } else {
                await api.post("/content/legal-documents/", docForm);
                toast.success("Document created");
            }
            setIsEditorOpen(false);
            setEditingDoc(null);
            setDocForm({ document_type: "", title: "", content: "", is_required: true, is_active: true, change_summary: "" });
            loadData();
        } catch (error) {
            toast.error("Failed to save document");
        }
    };

    const handleEditDocument = async (doc: LegalDocument) => {
        try {
            const fullDoc = await api.get(`/content/legal-documents/${doc.id}/`);
            setEditingDoc(doc);
            setDocForm({
                document_type: fullDoc.document_type,
                title: fullDoc.title,
                content: fullDoc.content || "",
                is_required: fullDoc.is_required,
                is_active: fullDoc.is_active,
                change_summary: ""
            });
            setIsEditorOpen(true);
        } catch (error) {
            toast.error("Failed to load document");
        }
    };

    const getTypeLabel = (type: string) => {
        return DOCUMENT_TYPES.find(t => t.value === type)?.label || type;
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Legal Documents</h1>
                    <p className="text-muted-foreground">Manage terms, policies, and user consent tracking</p>
                </div>
                <Button onClick={() => { setEditingDoc(null); setIsEditorOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" /> New Document
                </Button>
            </div>

            <Tabs defaultValue="documents">
                <TabsList>
                    <TabsTrigger value="documents">
                        <FileText className="h-4 w-4 mr-2" /> Documents
                    </TabsTrigger>
                    <TabsTrigger value="consents">
                        <CheckCircle className="h-4 w-4 mr-2" /> User Consents
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="documents" className="space-y-4">
                    <Card>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Document</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Version</TableHead>
                                        <TableHead>Required</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Last Updated</TableHead>
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
                                    ) : documents.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                                No legal documents configured
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        documents.map((doc) => (
                                            <TableRow key={doc.id}>
                                                <TableCell className="font-medium">{doc.title}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{getTypeLabel(doc.document_type)}</Badge>
                                                </TableCell>
                                                <TableCell>v{doc.current_version}</TableCell>
                                                <TableCell>
                                                    {doc.is_required ? (
                                                        <Badge className="bg-red-100 text-red-700">Required</Badge>
                                                    ) : (
                                                        <Badge variant="outline">Optional</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={doc.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>
                                                        {doc.is_active ? "Active" : "Draft"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>{new Date(doc.updated_at).toLocaleDateString()}</TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex gap-2 justify-end">
                                                        <Button variant="ghost" size="icon" onClick={() => handleEditDocument(doc)}>
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" asChild>
                                                            <a href={`/legal/${doc.document_type.toLowerCase()}`} target="_blank">
                                                                <Eye className="h-4 w-4" />
                                                            </a>
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
                </TabsContent>

                <TabsContent value="consents" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent User Consents</CardTitle>
                            <CardDescription>Track user acceptance of legal documents</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>User</TableHead>
                                        <TableHead>Document</TableHead>
                                        <TableHead>Version</TableHead>
                                        <TableHead>Consented At</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {consents.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                                No consent records yet
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        consents.map((consent) => (
                                            <TableRow key={consent.id}>
                                                <TableCell>{consent.user_email}</TableCell>
                                                <TableCell>{getTypeLabel(consent.document_type)}</TableCell>
                                                <TableCell>v{consent.version_number}</TableCell>
                                                <TableCell>{new Date(consent.consented_at).toLocaleString()}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Document Editor Dialog */}
            <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingDoc ? "Edit Document" : "Create Document"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Document Type</Label>
                                <Select
                                    value={docForm.document_type}
                                    onValueChange={(v) => setDocForm(f => ({ ...f, document_type: v }))}
                                    disabled={!!editingDoc}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select type..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {DOCUMENT_TYPES.map(type => (
                                            <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Title</Label>
                                <Input
                                    value={docForm.title}
                                    onChange={(e) => setDocForm(f => ({ ...f, title: e.target.value }))}
                                    placeholder="Terms of Service"
                                />
                            </div>
                        </div>
                        <div>
                            <Label>Content (Markdown supported)</Label>
                            <Textarea
                                value={docForm.content}
                                onChange={(e) => setDocForm(f => ({ ...f, content: e.target.value }))}
                                placeholder="# Terms of Service&#10;&#10;By using our service..."
                                rows={15}
                                className="font-mono text-sm"
                            />
                        </div>
                        {editingDoc && (
                            <div>
                                <Label>Change Summary (for version history)</Label>
                                <Input
                                    value={docForm.change_summary}
                                    onChange={(e) => setDocForm(f => ({ ...f, change_summary: e.target.value }))}
                                    placeholder="Updated data retention policy..."
                                />
                            </div>
                        )}
                        <div className="flex gap-6">
                            <div className="flex items-center space-x-2">
                                <Switch
                                    checked={docForm.is_required}
                                    onCheckedChange={(c) => setDocForm(f => ({ ...f, is_required: c }))}
                                />
                                <Label>Required for signup</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Switch
                                    checked={docForm.is_active}
                                    onCheckedChange={(c) => setDocForm(f => ({ ...f, is_active: c }))}
                                />
                                <Label>Active (visible to users)</Label>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditorOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveDocument}>
                            {editingDoc ? "Save & Create New Version" : "Create Document"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
