"use client";

import { useEffect, useState } from "react";
import { api } from "@/app/lib/api";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function BillingPlansPage() {
    const [plans, setPlans] = useState<any[]>([]);
    const [subscription, setSubscription] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [upgrading, setUpgrading] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            const [plansData, subData] = await Promise.all([
                api.getPlans(),
                api.getSubscription()
            ]);
            setPlans(plansData);
            setSubscription(subData);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load billing info");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSubscribe = async (slug: string) => {
        setUpgrading(slug);
        try {
            await api.updateSubscription(slug);
            toast.success("Subscription updated successfully!");
            fetchData();
        } catch (error) {
            toast.error("Failed to update subscription");
        } finally {
            setUpgrading(null);
        }
    };

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;

    const currentPlanSlug = subscription?.plan?.slug || 'free';

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Plans & Packages</h1>
                <p className="text-muted-foreground mt-1">Choose the plan that fits your needs.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {plans.map((plan) => {
                    const isCurrent = currentPlanSlug === plan.slug;
                    return (
                        <Card key={plan.id} className={`flex flex-col ${isCurrent ? 'border-primary shadow-lg scale-105' : ''}`}>
                            <CardHeader>
                                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                                <CardDescription>
                                    <span className="text-3xl font-bold text-foreground">${plan.price}</span> / {plan.interval.toLowerCase()}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1">
                                <ul className="space-y-3">
                                    {Object.entries(plan.features || {}).map(([key, value]: any) => (
                                        <li key={key} className="flex items-center gap-2 text-sm">
                                            <Check className="w-4 h-4 text-green-500" />
                                            <span className="capitalize">{key}: <strong>{value}</strong></span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                            <CardFooter>
                                <Button
                                    className="w-full"
                                    variant={isCurrent ? "outline" : "default"}
                                    disabled={isCurrent || upgrading === plan.slug}
                                    onClick={() => handleSubscribe(plan.slug)}
                                >
                                    {isCurrent ? "Current Plan" : upgrading === plan.slug ? <Loader2 className="animate-spin" /> : "Subscribe"}
                                </Button>
                            </CardFooter>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
