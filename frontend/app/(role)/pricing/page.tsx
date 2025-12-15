"use client";

import { useEffect, useState } from "react";
import { api } from "@/app/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/app/context/AuthContext";
import { useRouter } from "next/navigation";

// Load Razorpay script
const loadRazorpay = () => {
    return new Promise((resolve) => {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

export default function PricingPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<string | null>(null);

    useEffect(() => {
        loadRazorpay();
        const loadPlans = async () => {
            try {
                const data = await api.getPlans();
                setPlans(data);
            } catch (error) {
                console.error("Failed to load plans");
            } finally {
                setLoading(false);
            }
        };
        loadPlans();
    }, []);

    const handleSubscribe = async (plan: any) => {
        if (!user) {
            toast.error("Please log in to subscribe");
            router.push("/login");
            return;
        }

        if (plan.price === "0.00" || plan.price === 0) {
            toast.info("Free plan is active.");
            return;
        }

        setProcessing(plan.id);

        try {
            // 1. Create Order
            const order = await api.createOrder(plan.slug);

            // 2. Open Razorpay
            const options = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_placeholder", // Replace with env
                amount: order.amount,
                currency: order.currency,
                name: "Ninja PDF",
                description: `Subscribe to ${plan.name}`,
                order_id: order.id,
                handler: async function (response: any) {
                    try {
                        const verify = await api.verifyPayment({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature
                        });
                        toast.success("Payment Successful! Subscription Active.");
                        router.push("/profile/billing");
                    } catch (err) {
                        toast.error("Payment verification failed");
                    }
                },
                prefill: {
                    name: `${user.first_name} ${user.last_name}`,
                    email: user.email,
                },
                theme: {
                    color: "#7c3aed"
                }
            };

            const rzp = new (window as any).Razorpay(options);
            rzp.on('payment.failed', function (response: any) {
                toast.error(response.error.description);
            });
            rzp.open();
        } catch (error: any) {
            toast.error(error.message || "Failed to initiate payment");
        } finally {
            setProcessing(null);
        }
    };

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin w-10 h-10" /></div>;

    return (
        <div className="container mx-auto py-20 px-4">
            <div className="text-center mb-16">
                <h1 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h1>
                <p className="text-xl text-muted-foreground">Choose the plan that's right for you</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {plans.map((plan) => (
                    <Card key={plan.id} className={`flex flex-col ${plan.name === 'Pro' ? 'border-violet-500 border-2 shadow-xl relative' : ''}`}>
                        {plan.name === 'Pro' && (
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-violet-600 text-white px-4 py-1 rounded-full text-sm font-bold">
                                MOST POPULAR
                            </div>
                        )}
                        <CardHeader>
                            <CardTitle className="text-2xl">{plan.name}</CardTitle>
                            <CardDescription>{plan.interval === 'YEARLY' ? 'Yearly billing' : 'Monthly billing'}</CardDescription>
                            <div className="mt-4">
                                <span className="text-4xl font-bold">${plan.price}</span>
                                <span className="text-muted-foreground">/{plan.interval === 'YEARLY' ? 'yr' : 'mo'}</span>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1">
                            <ul className="space-y-3">
                                {plan.features && Object.keys(plan.features).length > 0 ? (
                                    Object.entries(plan.features).map(([key, val]: any) => (
                                        <li key={key} className="flex items-start gap-2">
                                            <Check className="w-5 h-5 text-green-500 shrink-0" />
                                            <span>{val === true ? key.replace(/_/g, ' ') : str(val)}</span>
                                        </li>
                                    ))
                                ) : (
                                    // Fallback features if empty
                                    <>
                                        <li className="flex items-center gap-2"><Check className="w-5 h-5 text-green-500" /> All PDF Tools</li>
                                        {plan.name !== 'Free' && <li className="flex items-center gap-2"><Check className="w-5 h-5 text-green-500" /> Unlimited Processing</li>}
                                        {plan.name === 'Enterprise' && <li className="flex items-center gap-2"><Check className="w-5 h-5 text-green-500" /> Priority Support</li>}
                                    </>
                                )}
                            </ul>
                        </CardContent>
                        <CardFooter>
                            <Button
                                className={`w-full ${plan.name === 'Pro' ? 'bg-violet-600 hover:bg-violet-700' : ''}`}
                                onClick={() => handleSubscribe(plan)}
                                disabled={!!processing}
                            >
                                {processing === plan.id ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}
                                {plan.price > 0 ? "Subscribe Now" : "Current Plan"}
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    );
}

function str(val: any) {
    if (typeof val === 'string') return val;
    return JSON.stringify(val);
}
