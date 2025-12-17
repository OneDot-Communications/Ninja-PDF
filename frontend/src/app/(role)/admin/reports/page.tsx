"use client";

import { useEffect, useState } from "react";
import { api } from "@/app/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/app/components/ui/table";
import { Loader2, Download, TrendingUp, Users, DollarSign, Activity } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/app/components/ui/dialog";

export default function AdminReportsPage() {
    const [stats, setStats] = useState<any>(null);
    const [payments, setPayments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPayment, setSelectedPayment] = useState<any>(null);
    const [currentAdmin, setCurrentAdmin] = useState<any>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [statsData, paymentsData, me] = await Promise.all([
                api.getAdminStats(),
                api.getAdminPayments(),
                api.getUserDetails('me')
            ]);
            setStats(statsData);
            setPayments(paymentsData);
            setCurrentAdmin(me);
        } catch (error) {
            toast.error("Failed to load reports");
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        try {
            api.exportPayments();
            toast.success("Export started");
        } catch (error) {
            toast.error("Export failed");
        }
    };

    // Permission Helper
    const can = (permission: string) => {
        if (!currentAdmin) return false;
        if (currentAdmin.role === 'SUPER_ADMIN') return true;
        const ent = currentAdmin.entitlements?.[permission];
        return ent?.allowed === true;
    };

    if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="animate-spin" /></div>;

    if (!can('VIEW_REVENUE_REPORTS')) {
        return <div className="p-10 text-center text-red-500">Access Denied: You do not have permission to view revenue reports.</div>;
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="container mx-auto py-10 space-y-8"
        >
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Analytics & Reports</h1>
                    <p className="text-slate-500">Overview of platform performance and revenue.</p>
                </div>
                {can('EXPORT_PAYMENT_DATA') && (
                    <Button onClick={handleExport} variant="outline">
                        <Download className="mr-2 h-4 w-4" /> Export CSV
                    </Button>
                )}
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${stats?.revenue || "0.00"}</div>
                        <p className="text-xs text-muted-foreground">+20.1% from last month</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.active_subscriptions || 0}</div>
                        <p className="text-xs text-muted-foreground">+180 since last hour</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.total_users || 0}</div>
                        <p className="text-xs text-muted-foreground">+19% from last month</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.churn_rate || "0%"}</div>
                        <p className="text-xs text-muted-foreground">-2% from last month</p>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Payments Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Transactions</CardTitle>
                    <CardDescription>Latest payments from users.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>User</TableHead>
                                <TableHead>Plan</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {payments.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8">No transactions found.</TableCell>
                                </TableRow>
                            ) : (
                                payments.slice(0, 10).map((payment) => (
                                    <TableRow key={payment.id}>
                                        <TableCell>{new Date(payment.created_at).toLocaleDateString()}</TableCell>
                                        <TableCell>
                                            <div className="font-medium">{payment.user.email}</div>
                                            <div className="text-xs text-slate-500">ID: {payment.razorpay_order_id}</div>
                                        </TableCell>
                                        <TableCell>{payment.plan.name}</TableCell>
                                        <TableCell>${payment.amount}</TableCell>
                                        <TableCell>
                                            <Badge variant={payment.status === 'SUCCESS' ? 'default' : 'secondary'} className={
                                                payment.status === 'SUCCESS' ? 'bg-green-100 text-green-700 hover:bg-green-100' : 'bg-slate-100 text-slate-700'
                                            }>
                                                {payment.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {can('VIEW_TRANSACTION_DETAILS') && (
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button variant="ghost" size="sm" onClick={() => setSelectedPayment(payment)}>View</Button>
                                                    </DialogTrigger>
                                                    <DialogContent>
                                                        <DialogHeader>
                                                            <DialogTitle>Transaction Details</DialogTitle>
                                                            <DialogDescription>ID: {selectedPayment?.razorpay_order_id}</DialogDescription>
                                                        </DialogHeader>
                                                        <div className="space-y-4 py-4">
                                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                                <div>
                                                                    <span className="font-semibold block">User:</span>
                                                                    {selectedPayment?.user.email}
                                                                </div>
                                                                <div>
                                                                    <span className="font-semibold block">Date:</span>
                                                                    {selectedPayment?.created_at ? new Date(selectedPayment.created_at).toLocaleString() : '-'}
                                                                </div>
                                                                <div>
                                                                    <span className="font-semibold block">Plan:</span>
                                                                    {selectedPayment?.plan.name}
                                                                </div>
                                                                <div>
                                                                    <span className="font-semibold block">Amount:</span>
                                                                    {selectedPayment?.currency} {selectedPayment?.amount}
                                                                </div>
                                                                <div>
                                                                    <span className="font-semibold block">Payment ID:</span>
                                                                    {selectedPayment?.razorpay_payment_id || 'N/A'}
                                                                </div>
                                                                <div>
                                                                    <span className="font-semibold block">Signature:</span>
                                                                    <span className="truncate block w-32">{selectedPayment?.razorpay_signature || 'N/A'}</span>
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-2 justify-end mt-4">
                                                                {can('CREATE_REFUND') && selectedPayment?.status === 'SUCCESS' && (
                                                                    <Button
                                                                        variant="destructive"
                                                                        size="sm"
                                                                        onClick={async () => {
                                                                            try {
                                                                                await api.refundPayment(selectedPayment.id);
                                                                                toast.success("Refund processed");
                                                                                loadData(); // refresh
                                                                                setSelectedPayment(null);
                                                                            } catch {
                                                                                toast.error("Refund failed");
                                                                            }
                                                                        }}
                                                                    >
                                                                        Refund
                                                                    </Button>
                                                                )}
                                                                {can('PROCESS_CHARGEBACK') && selectedPayment?.status === 'SUCCESS' && (
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="text-red-600 border-red-200 hover:bg-red-50"
                                                                        onClick={async () => {
                                                                            try {
                                                                                await api.chargebackPayment(selectedPayment.id);
                                                                                toast.success("Chargeback recorded");
                                                                                loadData(); // refresh
                                                                                setSelectedPayment(null);
                                                                            } catch {
                                                                                toast.error("Chargeback failed");
                                                                            }
                                                                        }}
                                                                    >
                                                                        Chargeback
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </DialogContent>
                                                </Dialog>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </motion.div>
    );
}
