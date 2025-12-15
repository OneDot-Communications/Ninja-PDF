"use client";

import { useState, useEffect } from "react";
import { api } from "@/app/lib/api";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/app/components/ui/table";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Switch } from "@/app/components/ui/switch";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";

export default function SuperAdminFeaturesPage() {
    const [features, setFeatures] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newFeature, setNewFeature] = useState<{ name: string, code: string, description: string, is_premium_default: boolean, icon?: File }>({
        name: '', code: '', description: '', is_premium_default: false
    });
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingFeature, setEditingFeature] = useState<{ id: number, name: string, code: string, description: string, is_premium_default: boolean, free_limit: number, icon?: File | string } | null>(null);

    useEffect(() => {
        loadFeatures();
    }, []);

    const loadFeatures = async () => {
        try {
            const data = await api.getFeatures();
            setFeatures(data);
        } catch (error) {
            toast.error("Failed to load features");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateFeature = async () => {
        try {
            await api.createFeature(newFeature);
            toast.success("Feature created");
            setIsCreateOpen(false);
            loadFeatures();
        } catch (error) {
            toast.error("Failed to create feature");
        }
    };

    /* 
       Note: Toggling "default premium" on the list might require a PATCH endpoint 
       or full update. For now, assuming PATCH support or we add it. 
       If FeatureViewSet is standard ModelViewSet, patch works.
    */
    const togglePremium = async (feature: any) => {
        // Optimistic update
        const updated = { ...feature, is_premium_default: !feature.is_premium_default };
        setFeatures(features.map(f => f.id === feature.id ? updated : f));

        try {
            // We need a generic update method in api.ts or use request directly
            await api.request("PATCH", `/api/billing/features/${feature.id}/`, { is_premium_default: updated.is_premium_default });
            toast.success(`Updated ${feature.name}`);
        } catch (error) {
            toast.error("Failed to update");
            setFeatures(features); // Revert
        }
    };

    const handleUpdateFeature = async () => {
        if (!editingFeature) return;
        try {
            await api.updateFeature(editingFeature.id, editingFeature);
            toast.success("Feature updated");
            setIsEditOpen(false);
            loadFeatures();
        } catch (error) {
            toast.error("Failed to update feature");
        }
    };

    if (loading) return <Loader2 className="animate-spin" />;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Feature Management</h1>
                    <p className="text-slate-500">Control feature availability and pricing tiers globally.</p>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Plus className="w-4 h-4" /> Add Feature
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New System Feature</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Feature Name</Label>
                                <Input
                                    value={newFeature.name}
                                    onChange={e => setNewFeature({ ...newFeature, name: e.target.value })}
                                    placeholder="e.g. Merge PDF"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Code (Unique)</Label>
                                <Input
                                    value={newFeature.code}
                                    onChange={e => setNewFeature({ ...newFeature, code: e.target.value.toUpperCase() })}
                                    placeholder="MERGE_PDF"
                                />
                            </div>
                            <div className="flex items-center justify-between border p-4 rounded-lg">
                                <Label>Premium by Default?</Label>
                                <Switch
                                    checked={newFeature.is_premium_default}
                                    onCheckedChange={c => setNewFeature({ ...newFeature, is_premium_default: c })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Icon (Optional)</Label>
                                <Input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            setNewFeature({ ...newFeature, icon: file });
                                        }
                                    }}
                                />
                            </div>
                            <Button onClick={handleCreateFeature} className="w-full">Create Feature</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Feature Name</TableHead>
                            <TableHead>Code</TableHead>
                            <TableHead>Global Layer</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {features.map((feature) => (
                            <TableRow key={feature.id}>
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-3">
                                        {feature.icon && (
                                            <img src={feature.icon} alt={feature.name} className="w-8 h-8 rounded-lg object-contain bg-slate-50 border" />
                                        )}
                                        <div>
                                            {feature.name}
                                            <p className="text-xs text-slate-500">{feature.description}</p>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell><Badge variant="outline">{feature.code}</Badge></TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Switch
                                            checked={feature.is_premium_default}
                                            onCheckedChange={() => togglePremium(feature)}
                                        />
                                        <span className={`text-sm ${feature.is_premium_default ? 'text-amber-600 font-medium' : 'text-slate-500'}`}>
                                            {feature.is_premium_default ? 'Premium Only' : 'Free for All'}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" onClick={() => {
                                        setEditingFeature(feature);
                                        setIsEditOpen(true);
                                    }}>Edit</Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {features.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                                    No features defined yet.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Feature</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Feature Name</Label>
                            <Input
                                value={editingFeature?.name || ''}
                                onChange={e => setEditingFeature({ ...editingFeature!, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Code</Label>
                            <Input
                                value={editingFeature?.code || ''}
                                disabled
                                className="bg-slate-100"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Input
                                value={editingFeature?.description || ''}
                                onChange={e => setEditingFeature({ ...editingFeature!, description: e.target.value })}
                            />
                        </div>
                        <div className="flex items-center justify-between border p-4 rounded-lg">
                            <Label>Premium by Default?</Label>
                            <Switch
                                checked={editingFeature?.is_premium_default || false}
                                onCheckedChange={c => setEditingFeature({ ...editingFeature!, is_premium_default: c })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Free Usage Limit (0 = Unlimited or None)</Label>
                            <Input
                                type="number"
                                min="0"
                                value={editingFeature?.free_limit || 0}
                                onChange={e => setEditingFeature({ ...editingFeature!, free_limit: parseInt(e.target.value) || 0 })}
                                placeholder="e.g. 5"
                            />
                            <p className="text-[10px] text-slate-500">
                                If Premium is enabled, this allows free users this many actions per day/month.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label>Icon (Optional)</Label>
                            {editingFeature?.icon && typeof editingFeature.icon === 'string' && (
                                <img src={editingFeature.icon} alt="Current" className="h-10 w-10 object-contain border rounded p-1" />
                            )}
                            <Input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        setEditingFeature({ ...editingFeature!, icon: file });
                                    }
                                }}
                            />
                        </div>
                        <Button onClick={handleUpdateFeature} className="w-full">Update Feature</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
