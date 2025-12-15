"use client";

import { useEffect, useState } from "react";
import { api } from "@/app/lib/api";
import { Card, CardContent } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Trash2, AlertTriangle, RotateCcw, FileSignature } from "lucide-react";
import { toast } from "sonner";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/app/components/ui/table";
import { Skeleton } from "@/app/components/ui/skeleton";

export default function TrashPage() {
    const [deletedItems, setDeletedItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchTrash = async () => {
        try {
            setLoading(true);
            const data = await api.getTrash(); // Fetches items with mode=trash
            setDeletedItems(data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTrash();
    }, []);

    const handleRestore = async (id: number) => {
        try {
            await api.restoreSignature(id);
            toast.success("Item restored");
            fetchTrash(); // Refresh list
        } catch (error) {
            toast.error("Failed to restore item");
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Trash</h1>
            <p className="text-muted-foreground">Items in trash will be permanently deleted after 30 days.</p>

            <Card>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-6 space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="flex justify-between items-center">
                                    <div className="flex gap-4">
                                        <Skeleton className="h-4 w-24" />
                                        <Skeleton className="h-4 w-48" />
                                    </div>
                                    <Skeleton className="h-8 w-16" />
                                </div>
                            ))}
                        </div>
                    ) : deletedItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                            <Trash2 className="w-12 h-12 mb-4 opacity-20" />
                            <p>Trash is empty.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Deleted Date</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {deletedItems.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <FileSignature className="w-4 h-4 text-slate-400" />
                                                <span className="text-xs uppercase font-medium text-slate-500">Signature</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-medium">{item.title}</TableCell>
                                        <TableCell className="text-slate-500">
                                            {new Date(item.updated_at).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" onClick={() => handleRestore(item.id)}>
                                                <RotateCcw className="w-4 h-4 mr-2" />
                                                Restore
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {deletedItems.length > 0 && (
                <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-4 rounded-lg text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Warning: Empting trash is irreversible.</span>
                    <Button variant="link" className="text-amber-700 underline h-auto p-0 ml-auto">
                        Empty Trash
                    </Button>
                </div>
            )}
        </div>
    );
}
