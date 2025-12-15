"use client";

import { useEffect, useState } from "react";
import { api } from "@/app/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { Badge } from "@/app/components/ui/badge";
import { Loader2 } from "lucide-react";

export default function AdminPaymentsPage() {
    const [payments, setPayments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadPayments = async () => {
            try {
                const data = await api.getAdminPayments();
                setPayments(data);
            } catch (error) {
                console.error("Failed to load payments");
            } finally {
                setLoading(false);
            }
        };
        loadPayments();
    }, []);

    if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Global Payment History</h1>
            <p className="text-muted-foreground">View all transactions across the platform.</p>

            <Card>
                <CardHeader>
                    <CardTitle>Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>User</TableHead>
                                <TableHead>Plan</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Razorpay Order ID</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {payments.map((payment) => (
                                <TableRow key={payment.id}>
                                    <TableCell>{new Date(payment.created_at).toLocaleString()}</TableCell>
                                    <TableCell className="font-medium">
                                        {payment.user_email}
                                        <div className="text-xs text-slate-400">ID: {payment.user}</div>
                                    </TableCell>
                                    <TableCell>{payment.plan_name || 'N/A'}</TableCell>
                                    <TableCell>{payment.currency} {payment.amount}</TableCell>
                                    <TableCell className="font-mono text-xs">{payment.razorpay_order_id}</TableCell>
                                    <TableCell>
                                        <Badge variant={payment.status === 'SUCCESS' ? 'default' : 'secondary'}>
                                            {payment.status}
                                        </Badge>
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
