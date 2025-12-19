"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/context/AuthContext";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";

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

function PricingPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<string | null>(null);
    const [config, setConfig] = useState<{ stripe_public_key?: string, razorpay_key_id?: string }>({});
    const [showPaymentSelector, setShowPaymentSelector] = useState<{ plan: any, open: boolean }>({ plan: null, open: false });

    useEffect(() => {
        loadRazorpay();
        // Load Stripe if available - we load script dynamically if needed or rely on @stripe/stripe-js package
        // For simplicity, we assume Stripe is initialized via keys later.

        const init = async () => {
            try {
                const [plansBox, settingsBox] = await Promise.all([
                    api.getPlans(),
                    api.getPublicSettings()
                ]);
                setPlans(plansBox);
                setConfig(settingsBox.config || {});
            } catch (error) {
                console.error("Failed to load data");
            } finally {
                setLoading(false);
            }
        };
        init();
    }, []);

    const hasStripe = !!config.stripe_public_key;
    const hasRazorpay = !!config.razorpay_key_id;

    const initiatePayment = async (plan: any, provider: 'stripe' | 'razorpay') => {
        setProcessing(plan.id);
        setShowPaymentSelector({ ...showPaymentSelector, open: false }); // Close modal if open

        try {
            // 1. Create Order
            const order = await api.createOrder(plan.slug, provider);

            if (provider === 'stripe') {
                // Stripe Flow
                if (!(window as any).Stripe && !document.getElementById('stripe-js')) {
                    // Lazy load stripe
                    const script = document.createElement('script');
                    script.src = 'https://js.stripe.com/v3/';
                    script.id = 'stripe-js';
                    document.body.appendChild(script);
                    await new Promise(res => script.onload = res);
                }

                const stripe = (window as any).Stripe(config.stripe_public_key);
                await stripe.redirectToCheckout({ sessionId: order.sessionId });
            } else {
                // Razorpay Flow
                const options = {
                    key: config.razorpay_key_id,
                    amount: order.amount,
                    currency: order.currency,
                    name: "Ninja PDF",
                    description: `Subscribe to ${plan.name}`,
                    order_id: order.id,
                    handler: async function (response: any) {
                        try {
                            await api.verifyPayment({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature
                            });
                            toast.success("Payment Successful! Upgrading...");
                            setTimeout(() => router.push("/"), 1500); // Redirect to Home
                        } catch (err) {
                            toast.error("Payment verification failed");
                        }
                    },
                    prefill: {
                        name: `${user?.first_name} ${user?.last_name}`,
                        email: user?.email,
                    },
                    theme: { color: "#7c3aed" }
                };
                const rzp = new (window as any).Razorpay(options);
                rzp.on('payment.failed', (r: any) => toast.error(r.error.description));
                rzp.open();
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to initiate payment");
        } finally {
            setProcessing(null);
        }
    };

    const handleSubscribeClick = (plan: any) => {
        // Custom plan → Contact Us flow
        if (plan.name?.toLowerCase() === 'custom') {
            window.location.href = "mailto:support@ninjapdf.com?subject=Enterprise Inquiry";
            return;
        }

        // Free plan → Register or show current
        if (plan.name?.toLowerCase() === 'free') {
            if (!user) {
                router.push("/register");
            } else {
                toast.info("You're already on the Free plan.");
            }
            return;
        }

        // Paid plans require login
        if (!user) {
            toast.error("Please log in to subscribe");
            router.push("/login");
            return;
        }

        // Check if already on this plan
        const userPlanSlug = user?.subscription_tier?.toLowerCase() || 'free';
        if (userPlanSlug === plan.slug?.toLowerCase()) {
            toast.info("You're already on this plan.");
            return;
        }

        if (hasStripe && hasRazorpay) {
            setShowPaymentSelector({ plan, open: true });
        } else if (hasStripe) {
            initiatePayment(plan, 'stripe');
        } else if (hasRazorpay) {
            initiatePayment(plan, 'razorpay');
        } else {
            toast.error("No payment gateway configured");
        }
    };

    if (loading) {
        return (
            <div className="container mx-auto py-20 px-4">
                <div className="text-center mb-16 space-y-4">
                    <Skeleton className="h-12 w-3/4 mx-auto" />
                    <Skeleton className="h-6 w-1/2 mx-auto" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-7xl mx-auto">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex flex-col space-y-4 border rounded-xl p-6">
                            <Skeleton className="h-8 w-1/2" />
                            <Skeleton className="h-4 w-1/3" />
                            <Skeleton className="h-10 w-24 mt-4" />
                            <div className="space-y-2 mt-6">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-3/4" />
                            </div>
                            <Skeleton className="h-10 w-full mt-auto" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-20 px-4">
            <div className="text-center mb-16">
                <h1 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h1>
                <p className="text-xl text-muted-foreground">Choose the plan that's right for you</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-7xl mx-auto">
                {plans.map((plan) => {
                    // Determine user's current plan
                    const userPlanSlug = user?.subscription_tier?.toLowerCase() || 'free';
                    const isCurrentPlan = userPlanSlug === plan.slug?.toLowerCase();

                    // Determine button text
                    let buttonText = "Subscribe Now";
                    if (plan.name?.toLowerCase() === 'custom') {
                        buttonText = "Contact Us";
                    } else if (plan.name?.toLowerCase() === 'free') {
                        buttonText = isCurrentPlan ? "Current Plan" : "Get Started Free";
                    } else if (isCurrentPlan) {
                        buttonText = "Current Plan";
                    } else if (plan.price > 0) {
                        buttonText = "Subscribe Now";
                    }

                    return (
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
                                    {plan.name?.toLowerCase() === 'custom' ? (
                                        <span className="text-3xl font-bold">Contact Us</span>
                                    ) : plan.price > 0 ? (
                                        <>
                                            <span className="text-4xl font-bold">${plan.price}</span>
                                            <span className="text-muted-foreground">/{plan.interval === 'YEARLY' ? 'yr' : 'mo'}</span>
                                        </>
                                    ) : (
                                        <span className="text-4xl font-bold">Free</span>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1">
                                <ul className="space-y-3">
                                    {plan.features && Object.keys(plan.features).length > 0 ? (
                                        Object.entries(plan.features).map(([key, val]: any) => (
                                            <li key={key} className="flex items-start gap-2">
                                                <Check className="w-5 h-5 text-green-500 shrink-0" />
                                                <span className="text-sm">{val === true ? key.replace(/_/g, ' ') : key + ': ' + str(val)}</span>
                                            </li>
                                        ))
                                    ) : (
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
                                    onClick={() => handleSubscribeClick(plan)}
                                    disabled={!!processing || isCurrentPlan}
                                    variant={isCurrentPlan ? "secondary" : "default"}
                                >
                                    {processing === plan.id ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}
                                    {buttonText}
                                </Button>
                            </CardFooter>
                        </Card>
                    );
                })}
            </div>

            {/* Payment Gateway Selector Modal */}
            {showPaymentSelector.open && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-xl w-full max-w-sm">
                        <h3 className="text-lg font-bold mb-4">Select Payment Method</h3>
                        <div className="space-y-3">
                            <Button variant="outline" className="w-full justify-start gap-3 h-12" onClick={() => initiatePayment(showPaymentSelector.plan, 'stripe')}>
                                {/* Stripe Icon SVG */}
                                <svg width="24" height="24" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="M11.75 12.18c0-1.42 1.3-2.02 3.4-2.02 2.3 0 4.2.82 4.2.82l.53-3.4s-1.57-.45-3.66-.45c-4.14 0-6.9 2.1-6.9 5.86 0 5.4 7.5 5.54 7.5 8.4 0 1.57-1.5 2.1-3.67 2.1-2.85 0-5.1-.98-5.1-.98L7.5 26.1s1.95.6 4.35.6c4.5 0 7.35-2.17 7.35-6.14 0-5.7-7.44-5.63-7.44-8.4z" fill="#635bff" /></svg>
                                Pay with Stripe (Card)
                            </Button>
                            <Button variant="outline" className="w-full justify-start gap-3 h-12" onClick={() => initiatePayment(showPaymentSelector.plan, 'razorpay')}>
                                {/* Razorpay Icon (Generic) */}
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>
                                Pay with Razorpay
                            </Button>
                        </div>
                        <Button variant="ghost" className="w-full mt-4" onClick={() => setShowPaymentSelector({ plan: null, open: false })}>Cancel</Button>
                    </div>
                </div>
            )}
        </div>
    );
}


function str(val: any) {
    if (typeof val === 'string') return val;
    return JSON.stringify(val);
}

export default PricingPage;
