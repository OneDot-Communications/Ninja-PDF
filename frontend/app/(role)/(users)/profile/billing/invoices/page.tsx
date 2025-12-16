"use client";

import { useEffect, useState } from "react";
import { api } from "@/app/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Receipt, Download, Info } from "lucide-react";
import { Skeleton } from "@/app/components/ui/skeleton";

export default function InvoicesPage() {
    const [payments, setPayments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadPayments = async () => {
            try {
                const data = await api.getPayments(); // Use real payments now
                setPayments(data || []);
            } catch (error) {
                console.error("Failed to load payments");
            } finally {
                setLoading(false);
            }
        };
        loadPayments();
    }, []);

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Invoices & Receipts</h1>
            <p className="text-muted-foreground">Download your payment receipts.</p>

            <Card>
                <CardHeader>
                    <CardTitle>History</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="divide-y p-0">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <Skeleton className="h-10 w-10 rounded" />
                                        <div className="space-y-2">
                                            <Skeleton className="h-5 w-32" />
                                            <Skeleton className="h-3 w-24" />
                                        </div>
                                    </div>
                                    <Skeleton className="h-8 w-20" />
                                </div>
                            ))}
                        </div>
                    ) : payments.length === 0 ? (
                        <div className="p-10 text-center text-muted-foreground">No payment history available.</div>
                    ) : (
                        <div className="divide-y">
                            {payments.map((payment) => (
                                <div key={payment.id} className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 bg-slate-100 rounded">
                                            <Receipt className="w-5 h-5 text-slate-600" />
                                        </div>
                                        <div>
                                            <div className="font-semibold">{payment.plan_name || 'Subscription'}</div>
                                            <div className="text-sm text-slate-500">{new Date(payment.created_at).toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                    <div className="text-right flex items-center gap-4">
                                        <div>
                                            <div className="flex items-center justify-end gap-1">
                                                <div className="font-bold">{payment.currency} {payment.amount}</div>
                                                <div className="group relative">
                                                    <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                                                    <div className="absolute right-0 bottom-full mb-2 w-48 p-2 bg-slate-800 text-white text-xs rounded shadow-lg hidden group-hover:block z-50 pointer-events-none">
                                                        Includes applicable taxes (GST/VAT) based on billing address.
                                                    </div>
                                                </div>
                                            </div>
                                            <Badge variant="outline" className="mt-1">PAID</Badge>
                                        </div>
                                        <Button size="icon" variant="ghost" onClick={() => api.downloadReceipt(payment.id)}>
                                            <Download className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
