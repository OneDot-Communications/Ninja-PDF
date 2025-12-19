"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/services/api";
import { Plus, Trash2, Edit, Tag, Percent, DollarSign, CheckCircle, XCircle, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Coupon {
    id: number;
    code: string;
    name: string;
    description: string;
    discount_type: 'PERCENTAGE' | 'FIXED_AMOUNT';
    discount_value: string;
    valid_from: string;
    valid_until: string | null;
    max_uses: number;
    times_used: number;
    status: 'ACTIVE' | 'EXPIRED' | 'EXHAUSTED' | 'DISABLED';
    is_valid: boolean;
}

export default function AdminCouponsPage() {
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [generating, setGenerating] = useState(false);

    const [form, setForm] = useState({
        code: '',
        name: '',
        description: '',
        discount_type: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED_AMOUNT',
        discount_value: '',
        valid_until: '',
        max_uses: 0,
        minimum_order_amount: 0,
        new_users_only: false,
    });

    useEffect(() => {
        loadCoupons();
    }, []);

    const loadCoupons = async () => {
        try {
            const data = await api.request('GET', '/subscriptions/coupons/');
            setCoupons(data.results || data || []);
        } catch (error) {
            toast.error("Failed to load coupons");
        } finally {
            setLoading(false);
        }
    };

    const generateCode = async () => {
        setGenerating(true);
        try {
            const data = await api.request('GET', '/subscriptions/coupons/generate_code/');
            setForm(prev => ({ ...prev, code: data.code }));
        } catch (error) {
            toast.error("Failed to generate code");
        } finally {
            setGenerating(false);
        }
    };

    const createCoupon = async () => {
        try {
            await api.request('POST', '/subscriptions/coupons/', {
                ...form,
                valid_until: form.valid_until || null,
            });
            toast.success("Coupon created!");
            setDialogOpen(false);
            setForm({
                code: '', name: '', description: '',
                discount_type: 'PERCENTAGE', discount_value: '',
                valid_until: '', max_uses: 0, minimum_order_amount: 0, new_users_only: false
            });
            loadCoupons();
        } catch (error: any) {
            toast.error(error?.response?.data?.detail || "Failed to create coupon");
        }
    };

    const toggleCoupon = async (coupon: Coupon) => {
        try {
            const action = coupon.status === 'ACTIVE' ? 'deactivate' : 'activate';
            await api.request('POST', `/subscriptions/coupons/${coupon.id}/${action}/`);
            toast.success(`Coupon ${action}d`);
            loadCoupons();
        } catch (error) {
            toast.error("Failed to update coupon");
        }
    };

    const deleteCoupon = async (id: number) => {
        if (!confirm("Delete this coupon?")) return;
        try {
            await api.request('DELETE', `/subscriptions/coupons/${id}/`);
            toast.success("Coupon deleted");
            loadCoupons();
        } catch (error) {
            toast.error("Failed to delete coupon");
        }
    };

    const copyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        toast.success("Code copied!");
    };

    if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="container mx-auto py-10 space-y-8">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                        <Tag className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Coupons & Discounts</h1>
                        <p className="text-slate-500">Manage promotional codes and discounts</p>
                    </div>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button><Plus className="mr-2 h-4 w-4" /> Create Coupon</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Create New Coupon</DialogTitle>
                            <DialogDescription>Create a promotional coupon code</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Coupon Code</Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={form.code}
                                        onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                                        placeholder="SUMMER2024"
                                    />
                                    <Button variant="outline" onClick={generateCode} disabled={generating}>
                                        {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate"}
                                    </Button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Internal Name</Label>
                                <Input
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    placeholder="Summer Sale 2024"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Discount Type</Label>
                                    <Select value={form.discount_type} onValueChange={v => setForm({ ...form, discount_type: v as any })}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                                            <SelectItem value="FIXED_AMOUNT">Fixed Amount</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Discount Value</Label>
                                    <Input
                                        type="number"
                                        value={form.discount_value}
                                        onChange={e => setForm({ ...form, discount_value: e.target.value })}
                                        placeholder={form.discount_type === 'PERCENTAGE' ? "20" : "500"}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Valid Until (Optional)</Label>
                                    <Input
                                        type="datetime-local"
                                        value={form.valid_until}
                                        onChange={e => setForm({ ...form, valid_until: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Max Uses (0 = Unlimited)</Label>
                                    <Input
                                        type="number"
                                        value={form.max_uses}
                                        onChange={e => setForm({ ...form, max_uses: parseInt(e.target.value) })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Min Order Amount</Label>
                                <Input
                                    type="number"
                                    value={form.minimum_order_amount}
                                    onChange={e => setForm({ ...form, minimum_order_amount: parseInt(e.target.value) })}
                                    placeholder="0"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="new_users"
                                    checked={form.new_users_only}
                                    onChange={e => setForm({ ...form, new_users_only: e.target.checked })}
                                />
                                <Label htmlFor="new_users">New users only</Label>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                            <Button onClick={createCoupon}>Create Coupon</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {coupons.map(coupon => (
                    <Card key={coupon.id} className={coupon.status !== 'ACTIVE' ? 'opacity-60' : ''}>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <Badge
                                    variant={coupon.status === 'ACTIVE' ? 'default' : 'secondary'}
                                    className={coupon.status === 'ACTIVE' ? 'bg-green-500' : ''}
                                >
                                    {coupon.status}
                                </Badge>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="sm" onClick={() => copyCode(coupon.code)}>
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => toggleCoupon(coupon)}>
                                        {coupon.status === 'ACTIVE' ? <XCircle className="h-4 w-4 text-red-500" /> : <CheckCircle className="h-4 w-4 text-green-500" />}
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => deleteCoupon(coupon.id)}>
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                </div>
                            </div>
                            <CardTitle className="flex items-center gap-2 mt-2">
                                <code className="px-2 py-1 bg-slate-100 rounded text-lg font-mono">{coupon.code}</code>
                            </CardTitle>
                            <CardDescription>{coupon.name}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-2 text-2xl font-bold text-purple-600">
                                {coupon.discount_type === 'PERCENTAGE' ? (
                                    <><Percent className="h-6 w-6" /> {coupon.discount_value}% OFF</>
                                ) : (
                                    <><DollarSign className="h-6 w-6" /> {coupon.discount_value} OFF</>
                                )}
                            </div>
                            <div className="mt-4 text-sm text-slate-500 space-y-1">
                                <div>Uses: {coupon.times_used} / {coupon.max_uses || '∞'}</div>
                                {coupon.valid_until && (
                                    <div>Expires: {new Date(coupon.valid_until).toLocaleDateString()}</div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {coupons.length === 0 && (
                <Card className="p-12 text-center">
                    <Tag className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                    <h3 className="text-lg font-medium text-slate-900">No Coupons Yet</h3>
                    <p className="text-slate-500 mt-1">Create your first promotional coupon to get started.</p>
                </Card>
            )}
        </div>
    );
}
