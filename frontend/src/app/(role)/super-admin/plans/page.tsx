"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, DollarSign, Save } from "lucide-react";

export default function AdminPlansPage() {
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<number | null>(null);

    useEffect(() => {
        loadPlans();
    }, []);

    const loadPlans = async () => {
        try {
            const data = await api.getPlans();
            // Sort by price usually makes sense
            setPlans(data.sort((a: any, b: any) => parseFloat(a.price) - parseFloat(b.price)));
        } catch (error) {
            toast.error("Failed to load plans");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (plan: any) => {
        setSaving(plan.id);
        try {
            await api.updatePlan(plan.id, {
                price: plan.price,
                name: plan.name,
                // We could allow editing features here too, but price is the main request
            });
            toast.success(`${plan.name} plan updated`);
        } catch (error) {
            toast.error("Failed to update plan");
        } finally {
            setSaving(null);
        }
    };

    const handleChange = (id: number, field: string, value: string) => {
        setPlans(plans.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Plan Management</h1>
            <p className="text-muted-foreground">Update pricing and details for subscription plans live.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.map((plan) => (
                    <Card key={plan.id} className="flex flex-col">
                        <CardHeader>
                            <CardTitle>
                                <Input
                                    value={plan.name}
                                    onChange={(e) => handleChange(plan.id, 'name', e.target.value)}
                                    className="text-xl font-bold border-transparent hover:border-input focus:border-input bg-transparent px-0 -ml-2 h-auto"
                                />
                            </CardTitle>
                            <CardDescription>{plan.interval} Billing</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 space-y-4">
                            <div className="space-y-2">
                                <Label>Price ({plan.currency})</Label>
                                <div className="relative">
                                    <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="number"
                                        value={plan.price}
                                        onChange={(e) => handleChange(plan.id, 'price', e.target.value)}
                                        className="pl-8"
                                    />
                                </div>
                            </div>
                            {/* Feature editor could go here, JSON editor maybe? */}
                        </CardContent>
                        <CardFooter>
                            <Button
                                onClick={() => handleUpdate(plan)}
                                disabled={saving === plan.id}
                                className="w-full"
                            >
                                {saving === plan.id ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                Save Changes
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    );
}
