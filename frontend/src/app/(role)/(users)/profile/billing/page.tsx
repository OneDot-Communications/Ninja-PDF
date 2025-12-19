"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, CheckCircle, Package, Receipt } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

export default function BillingPage() {
    const { user } = useAuth();
    const [currentSubscription, setCurrentSubscription] = useState<any>(null);
    const [payments, setPayments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [subBox, paymentsBox] = await Promise.all([
                    api.getSubscription(),
                    api.getPayments()
                ]);
                setCurrentSubscription(subBox);
                setPayments(paymentsBox || []);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Billing & Plans</h2>
                <p className="text-muted-foreground">Manage your subscription and billing details.</p>
            </div>

            {loading ? (
                <div className="space-y-8">
                    <Card className="bg-slate-50 border-blue-200">
                        <CardHeader>
                            <Skeleton className="h-6 w-48 mb-2" />
                            <div className="flex gap-4">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-4 w-32" />
                            </div>
                        </CardHeader>
                        <CardFooter>
                            <Skeleton className="h-10 w-32" />
                        </CardFooter>
                    </Card>
                    <div className="space-y-4">
                        <Skeleton className="h-6 w-32" />
                        <Card>
                            <CardContent className="p-0">
                                <div className="p-4 space-y-4">
                                    <Skeleton className="h-12 w-full" />
                                    <Skeleton className="h-12 w-full" />
                                    <Skeleton className="h-12 w-full" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            ) : (
                <>
                    {/* Current Plan */}
                    <Card className="bg-slate-50 border-blue-200">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Package className="w-5 h-5 text-blue-600" />
                                Current Plan: <span className="text-blue-600 uppercase">{currentSubscription?.plan?.name || "Free"}</span>
                            </CardTitle>
                            <div className="text-sm text-muted-foreground mt-1 flex items-center">
                                Status: <Badge variant="outline" className="ml-1 bg-white">{currentSubscription?.status || "Active"}</Badge>
                                <span className="ml-4">Expires: {currentSubscription?.current_period_end ? new Date(currentSubscription.current_period_end).toLocaleDateString() : 'Never'}</span>
                            </div>
                        </CardHeader>
                        <CardFooter>
                            <Button onClick={() => window.location.href = '/pricing'} variant="default">
                                Manage / Upgrade Plan
                            </Button>
                        </CardFooter>
                    </Card>

                    {/* Payment History */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Payment History</h3>
                        <Card>
                            <CardContent className="p-0">
                                {payments.length === 0 ? (
                                    <div className="p-8 text-center text-slate-500 text-sm">
                                        No payments found.
                                    </div>
                                ) : (
                                    <div className="divide-y">
                                        {payments.map((payment) => (
                                            <div key={payment.id} className="p-4 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-slate-100 rounded">
                                                        <Receipt className="w-4 h-4 text-slate-600" />
                                                    </div>
                                                    <div>
                                                        <div className="font-medium">{payment.plan_name || 'Payment'}</div>
                                                        <div className="text-xs text-slate-500">{new Date(payment.created_at).toLocaleDateString()}</div>
                                                    </div>
                                                </div>
                                                <div className="text-right flex flex-col items-end gap-1">
                                                    <div className="font-bold">{payment.currency} {payment.amount}</div>
                                                    <Badge variant={payment.status === 'SUCCESS' ? 'default' : 'destructive'}>{payment.status}</Badge>
                                                    {payment.status === 'SUCCESS' && (
                                                        <Button variant="ghost" size="sm" className="h-6 text-xs text-blue-600 hover:text-blue-700 p-0" onClick={() => api.downloadReceipt(payment.id)}>
                                                            Download Receipt
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </>
            )}
        </div>
    );
}
