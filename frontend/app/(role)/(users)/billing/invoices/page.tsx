"use client";

import { useEffect, useState } from "react";
import { api } from "@/app/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table"; // Need to check if available, otherwise build simple table
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Download, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";

export default function InvoicesPage() {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getInvoices()
            .then(data => setInvoices(data))
            .catch(err => toast.error("Failed to load invoices"))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
                <p className="text-muted-foreground mt-1">View and download your past invoices.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Invoice History</CardTitle>
                </CardHeader>
                <CardContent>
                    {invoices.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">
                            <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            No invoices found.
                        </div>
                    ) : (
                        <div className="relative w-full overflow-auto">
                            <table className="w-full caption-bottom text-sm text-left">
                                <thead className="[&_tr]:border-b">
                                    <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                        <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Date</th>
                                        <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Number</th>
                                        <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Amount</th>
                                        <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Status</th>
                                        <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="[&_tr:last-child]:border-0">
                                    {invoices.map((inv) => (
                                        <tr key={inv.id} className="border-b transition-colors hover:bg-muted/50">
                                            <td className="p-4 align-middle">{new Date(inv.created_at).toLocaleDateString()}</td>
                                            <td className="p-4 align-middle font-mono">{inv.number}</td>
                                            <td className="p-4 align-middle font-bold">${inv.amount_due}</td>
                                            <td className="p-4 align-middle">
                                                <Badge variant={inv.status === 'PAID' ? 'default' : 'secondary'}>
                                                    {inv.status}
                                                </Badge>
                                            </td>
                                            <td className="p-4 align-middle text-right">
                                                <Button variant="ghost" size="sm">
                                                    <Download className="w-4 h-4 mr-2" /> PDF
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
