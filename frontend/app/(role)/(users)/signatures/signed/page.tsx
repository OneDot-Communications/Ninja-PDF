"use client";

import { useEffect, useState } from "react";
import { api } from "@/app/lib/api";
import { Card, CardContent } from "@/app/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { Badge } from "@/app/components/ui/badge";
import { Loader2, Download } from "lucide-react";
import { Button } from "@/app/components/ui/button";

export default function SignedSignaturesPage() {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getSignatureRequests('signed')
            .then(data => setRequests(data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Signed Documents</h1>
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead>Completed On</TableHead>
                                <TableHead className="text-right">Download</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {requests.map((req) => (
                                <TableRow key={req.id}>
                                    <TableCell className="font-medium">{req.title}</TableCell>
                                    <TableCell>{new Date(req.updated_at).toLocaleDateString()}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm">
                                            <Download className="w-4 h-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {requests.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center py-10 text-muted-foreground">
                                        No signed documents found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
