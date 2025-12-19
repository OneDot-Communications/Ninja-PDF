"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Loader2, RefreshCw, Mail, Trash, FileText } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function AdminInvoicesPage() {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentAdmin, setCurrentAdmin] = useState<any>(null);
    const [processing, setProcessing] = useState<number | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [invoicesData, me] = await Promise.all([
                api.getInvoices(),
                api.getUserDetails('me')
            ]);
            setInvoices(invoicesData);
            setCurrentAdmin(me);
        } catch (error) {
            toast.error("Failed to load invoices");
        } finally {
            setLoading(false);
        }
    };

    // Permission Helper
    const can = (permission: string) => {
        if (!currentAdmin) return false;
        if (currentAdmin.role === 'SUPER_ADMIN') return true;
        const ent = currentAdmin.entitlements?.[permission];
        return ent?.allowed === true;
    };

    const handleRegenerate = async (id: number) => {
        setProcessing(id);
        try {
            await api.regenerateInvoice(id);
            toast.success("Invoice PDF regeneration started");
            // Usually async, but we assume success
        } catch {
            toast.error("Failed to regenerate invoice");
        } finally {
            setProcessing(null);
        }
    };

    const handleEmail = async (id: number) => {
        setProcessing(id);
        try {
            await api.emailInvoice(id);
            toast.success("Invoice sent to user");
        } catch {
            toast.error("Failed to send email");
        } finally {
            setProcessing(null);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this invoice?")) return;
        setProcessing(id);
        try {
            await api.deleteInvoice(id);
            toast.success("Invoice deleted");
            loadData();
        } catch {
            toast.error("Failed to delete invoice");
        } finally {
            setProcessing(null);
        }
    };

    if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="animate-spin" /></div>;

    if (!can('MANAGE_INVOICES')) {
        return <div className="p-10 text-center text-red-500">Access Denied: You do not have permission to manage invoices.</div>;
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="container mx-auto py-10 space-y-8"
        >
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Invoice Manager</h1>
                    <p className="text-slate-500">Manage, regenerate, and send invoices.</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Invoices</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>User</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {invoices.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8">No invoices found.</TableCell>
                                </TableRow>
                            ) : (
                                invoices.map((invoice) => (
                                    <TableRow key={invoice.id}>
                                        <TableCell className="font-mono text-xs">{invoice.invoice_number || invoice.id}</TableCell>
                                        <TableCell>{new Date(invoice.created_at).toLocaleDateString()}</TableCell>
                                        <TableCell>
                                            <div className="font-medium">{invoice.user?.email || 'Unknown'}</div>
                                        </TableCell>
                                        <TableCell>${invoice.amount}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{invoice.status}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                {can('REGENERATE_INVOICE') && (
                                                    <Button variant="ghost" size="icon" onClick={() => handleRegenerate(invoice.id)} disabled={processing === invoice.id}>
                                                        <RefreshCw className={`w-4 h-4 ${processing === invoice.id ? 'animate-spin' : ''}`} />
                                                    </Button>
                                                )}
                                                {can('SEND_INVOICE_EMAIL') && (
                                                    <Button variant="ghost" size="icon" onClick={() => handleEmail(invoice.id)} disabled={processing === invoice.id}>
                                                        <Mail className="w-4 h-4" />
                                                    </Button>
                                                )}
                                                {/* Download Button (Public) */}
                                                <Button variant="ghost" size="icon" onClick={() => window.open(invoice.pdf_url, '_blank')} disabled={!invoice.pdf_url}>
                                                    <FileText className="w-4 h-4" />
                                                </Button>

                                                {can('MANAGE_INVOICES') && (
                                                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(invoice.id)} disabled={processing === invoice.id}>
                                                        <Trash className="w-4 h-4" />
                                                    </Button>
                                                )}
                                            </div>
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
