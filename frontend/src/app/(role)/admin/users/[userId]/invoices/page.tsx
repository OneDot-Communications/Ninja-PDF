"use client";

import { useEffect, useState } from "react";
import { api } from "@/app/lib/api";
import {
    ArrowLeft,
    Download,
    ExternalLink,
    FileText,
    Loader2
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/app/components/ui/table";
import { Badge } from "@/app/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { use } from "react";

export default function UserInvoicesPage({ params }: { params: Promise<{ userId: string }> }) {
    const { userId } = use(params);
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const [userData, invoicesData] = await Promise.all([
                    api.getUserDetails(userId),
                    api.getPayments(parseInt(userId))
                ]);
                setUser(userData);
                setInvoices(invoicesData);
            } catch (error: any) {
                toast.error("Failed to load invoices");
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [userId]);

    const handleDownload = (id: number) => {
        api.downloadReceipt(id);
    };

    if (loading) {
        return <div className="flex h-96 items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        Invoices for {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.email || 'User'}
                    </h1>
                    <p className="text-slate-500 text-sm">{user?.email}</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Billing History</CardTitle>
                    <CardDescription>View and download invoices for this user.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Order ID</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {invoices.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                                        No invoices found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                invoices.map((invoice) => (
                                    <TableRow key={invoice.id}>
                                        <TableCell>
                                            {new Date(invoice.created_at).toLocaleDateString()}
                                            <div className="text-xs text-slate-400">
                                                {new Date(invoice.created_at).toLocaleTimeString()}
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {invoice.plan?.name || 'Subscription'}
                                        </TableCell>
                                        <TableCell>
                                            {invoice.currency} {invoice.amount}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={
                                                invoice.status === 'SUCCESS' ? 'bg-green-50 text-green-700 border-green-200' :
                                                    invoice.status === 'CREATED' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                                        'bg-red-50 text-red-700 border-red-200'
                                            }>
                                                {invoice.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs text-slate-500">
                                            {invoice.razorpay_order_id}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {invoice.status === 'SUCCESS' && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDownload(invoice.id)}
                                                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                >
                                                    <Download className="w-4 h-4 mr-2" /> Download
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
