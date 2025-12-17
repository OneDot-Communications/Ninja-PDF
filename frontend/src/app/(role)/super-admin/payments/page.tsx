"use client";

import { useEffect, useState } from "react";
import { api } from "@/app/lib/api";
import { Banknote, Download, RefreshCw, Search, Filter, CheckCircle, XCircle, Clock, ChevronDown } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Payment {
    id: number;
    user: { id: number; email: string; first_name: string; };
    amount: string;
    currency: string;
    status: string;
    razorpay_order_id: string;
    razorpay_payment_id?: string;
    plan?: { name: string; };
    created_at: string;
}

const statusColors: Record<string, string> = {
    SUCCESS: 'bg-green-500',
    CREATED: 'bg-yellow-500',
    FAILED: 'bg-red-500',
    REFUNDED: 'bg-purple-500',
};

const statusIcons: Record<string, React.ReactNode> = {
    SUCCESS: <CheckCircle className="w-4 h-4" />,
    CREATED: <Clock className="w-4 h-4" />,
    FAILED: <XCircle className="w-4 h-4" />,
};

export default function SuperAdminPaymentsPage() {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [stats, setStats] = useState({ total: 0, successful: 0, failed: 0, pending: 0, revenue: 0 });

    useEffect(() => {
        loadPayments();
    }, []);

    const loadPayments = async () => {
        try {
            const data = await api.request('GET', '/api/billing/payments/');
            const paymentsList = data.results || data || [];
            setPayments(paymentsList);

            // Calculate stats
            const successful = paymentsList.filter((p: Payment) => p.status === 'SUCCESS').length;
            const failed = paymentsList.filter((p: Payment) => p.status === 'FAILED').length;
            const pending = paymentsList.filter((p: Payment) => p.status === 'CREATED').length;
            const revenue = paymentsList
                .filter((p: Payment) => p.status === 'SUCCESS')
                .reduce((sum: number, p: Payment) => sum + parseFloat(p.amount), 0);

            setStats({ total: paymentsList.length, successful, failed, pending, revenue });
        } catch (error) {
            toast.error("Failed to load payments");
        } finally {
            setLoading(false);
        }
    };

    const handleRefund = async (paymentId: number) => {
        if (!confirm("Are you sure you want to refund this payment?")) return;
        try {
            await api.request('POST', `/api/billing/payments/${paymentId}/refund/`);
            toast.success("Payment refunded successfully");
            loadPayments();
        } catch (error: any) {
            toast.error(error?.message || "Failed to refund payment");
        }
    };

    const handleRetry = async (paymentId: number) => {
        try {
            await api.request('POST', `/api/billing/payments/${paymentId}/retry/`);
            toast.success("Payment retry initiated");
            loadPayments();
        } catch (error: any) {
            toast.error(error?.message || "Failed to retry payment");
        }
    };

    const handleExport = () => {
        api.exportPayments();
        toast.success("Exporting payments...");
    };

    const filteredPayments = payments.filter(p => {
        const matchesSearch =
            p.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.razorpay_order_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.razorpay_payment_id?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg text-green-600">
                        <Banknote className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Global Payments</h1>
                        <p className="text-slate-500">Manage all platform transactions</p>
                    </div>
                </div>
                <Button onClick={handleExport} variant="outline">
                    <Download className="w-4 h-4 mr-2" /> Export CSV
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{stats.total}</div>
                        <p className="text-sm text-slate-500">Total Transactions</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-green-600">{stats.successful}</div>
                        <p className="text-sm text-slate-500">Successful</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
                        <p className="text-sm text-slate-500">Failed</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-blue-600">
                            ${stats.revenue.toFixed(2)}
                        </div>
                        <p className="text-sm text-slate-500">Total Revenue</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex gap-4 items-center">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <Input
                        placeholder="Search by email, order ID..."
                        className="pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                        <Filter className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">All Statuses</SelectItem>
                        <SelectItem value="SUCCESS">Successful</SelectItem>
                        <SelectItem value="CREATED">Pending</SelectItem>
                        <SelectItem value="FAILED">Failed</SelectItem>
                        <SelectItem value="REFUNDED">Refunded</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Payments Table */}
            <Card>
                <CardHeader>
                    <CardTitle>All Payments</CardTitle>
                    <CardDescription>{filteredPayments.length} transactions found</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b text-left text-sm text-slate-500">
                                    <th className="pb-3 font-medium">User</th>
                                    <th className="pb-3 font-medium">Amount</th>
                                    <th className="pb-3 font-medium">Plan</th>
                                    <th className="pb-3 font-medium">Status</th>
                                    <th className="pb-3 font-medium">Order ID</th>
                                    <th className="pb-3 font-medium">Date</th>
                                    <th className="pb-3 font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPayments.map((payment) => (
                                    <tr key={payment.id} className="border-b last:border-0">
                                        <td className="py-4">
                                            <div className="font-medium text-slate-900">{payment.user?.first_name || 'N/A'}</div>
                                            <div className="text-sm text-slate-500">{payment.user?.email}</div>
                                        </td>
                                        <td className="py-4 font-semibold">
                                            {payment.currency} {parseFloat(payment.amount).toFixed(2)}
                                        </td>
                                        <td className="py-4">
                                            <Badge variant="outline">{payment.plan?.name || 'N/A'}</Badge>
                                        </td>
                                        <td className="py-4">
                                            <Badge className={statusColors[payment.status] || 'bg-slate-400'}>
                                                {statusIcons[payment.status]} {payment.status}
                                            </Badge>
                                        </td>
                                        <td className="py-4 font-mono text-xs text-slate-500">
                                            {payment.razorpay_order_id?.slice(0, 15)}...
                                        </td>
                                        <td className="py-4 text-sm text-slate-500">
                                            {new Date(payment.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="py-4">
                                            <div className="flex gap-2">
                                                {payment.status === 'SUCCESS' && (
                                                    <Button size="sm" variant="outline" onClick={() => handleRefund(payment.id)}>
                                                        Refund
                                                    </Button>
                                                )}
                                                {payment.status === 'FAILED' && (
                                                    <Button size="sm" variant="outline" onClick={() => handleRetry(payment.id)}>
                                                        <RefreshCw className="w-3 h-3 mr-1" /> Retry
                                                    </Button>
                                                )}
                                                <Button size="sm" variant="ghost" onClick={() => api.downloadReceipt(payment.id)}>
                                                    <Download className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredPayments.length === 0 && (
                            <div className="text-center py-12 text-slate-500">
                                No payments found matching your criteria
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
