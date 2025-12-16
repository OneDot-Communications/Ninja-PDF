"use client";

import { useEffect, useState } from "react";
import { api } from "@/app/lib/api";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Switch } from "@/app/components/ui/switch";
import { toast } from "sonner";
import { Pencil, Loader2 } from "lucide-react";

export default function PlansAdminPage() {
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingPlan, setEditingPlan] = useState<any | null>(null);
    const [editForm, setEditForm] = useState({ price: "", is_active: true, stripe_price_id: "" });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadPlans();
    }, []);

    const loadPlans = async () => {
        try {
            const data = await api.getPlans();
            setPlans(data);
        } catch (error) {
            toast.error("Failed to load plans");
        } finally {
            setLoading(false);
        }
    };

    const handleEditClick = (plan: any) => {
        setEditingPlan(plan);
        setEditForm({
            price: plan.price,
            is_active: plan.is_active,
            stripe_price_id: plan.stripe_price_id || ""
        });
    };

    const handleSave = async () => {
        if (!editingPlan) return;
        setSaving(true);
        try {
            await api.updatePlan(editingPlan.id, editForm);
            toast.success("Plan updated successfully");
            setEditingPlan(null);
            loadPlans();
        } catch (error) {
            toast.error("Failed to update plan");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="container mx-auto py-10">
            <h1 className="text-3xl font-bold mb-6">Manage Plans</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Subscription Plans</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Price</TableHead>
                                <TableHead>Interval</TableHead>
                                <TableHead>Stripe ID</TableHead>
                                <TableHead>Active</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {plans.map((plan) => (
                                <TableRow key={plan.id}>
                                    <TableCell className="font-medium">{plan.name}</TableCell>
                                    <TableCell>${plan.price}</TableCell>
                                    <TableCell>{plan.interval}</TableCell>
                                    <TableCell className="font-mono text-sm">{plan.stripe_price_id || '-'}</TableCell>
                                    <TableCell>
                                        <div className={`w-3 h-3 rounded-full ${plan.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                                    </TableCell>
                                    <TableCell>
                                        <Dialog open={editingPlan?.id === plan.id} onOpenChange={(open) => !open && setEditingPlan(null)}>
                                            <DialogTrigger asChild>
                                                <Button variant="ghost" size="icon" onClick={() => handleEditClick(plan)}>
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>Edit Plan: {plan.name}</DialogTitle>
                                                </DialogHeader>
                                                <div className="space-y-4 py-4">
                                                    <div className="space-y-2">
                                                        <Label>Price</Label>
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            value={editForm.price}
                                                            onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Stripe Price ID</Label>
                                                        <Input
                                                            value={editForm.stripe_price_id}
                                                            onChange={(e) => setEditForm({ ...editForm, stripe_price_id: e.target.value })}
                                                        />
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <Label>Is Active?</Label>
                                                        <Switch
                                                            checked={editForm.is_active}
                                                            onCheckedChange={(c) => setEditForm({ ...editForm, is_active: c })}
                                                        />
                                                    </div>
                                                </div>
                                                <DialogFooter>
                                                    <Button variant="outline" onClick={() => setEditingPlan(null)}>Cancel</Button>
                                                    <Button onClick={handleSave} disabled={saving}>
                                                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                        Save Changes
                                                    </Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
