"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/services/api";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, X, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/context/AuthContext";

export default function AdminRequestsPage() {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    const isSuperAdmin = user?.role === 'SUPER_ADMIN';

    useEffect(() => {
        loadRequests();
    }, []);

    const loadRequests = async () => {
        try {
            const data = await api.getAdminRequests();
            setRequests(data);
        } catch (error) {
            toast.error("Failed to load requests");
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id: number) => {
        try {
            await api.approveRequest(id);
            toast.success("Request approved");
            loadRequests();
        } catch (error) {
            toast.error("Failed to approve");
        }
    };

    const handleReject = async (id: number, note: string) => {
        try {
            await api.rejectRequest(id, note);
            toast.success("Request rejected");
            loadRequests();
        } catch (error) {
            toast.error("Failed to reject");
        }
    };

    if (loading) return <Loader2 className="animate-spin" />;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Admin Approvals</h1>
                    <p className="text-slate-500">Review and authorize sensitive administrative actions.</p>
                </div>
            </div>

            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Action</TableHead>
                            <TableHead>Requester</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Date</TableHead>
                            {isSuperAdmin && <TableHead className="text-right">Decision</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {requests.map((req) => (
                            <TableRow key={req.id}>
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 text-amber-500" />
                                        {req.action_type}
                                    </div>
                                    <p className="text-xs text-slate-500 truncate max-w-[200px]">{JSON.stringify(req.payload)}</p>
                                </TableCell>
                                <TableCell>{req.requester_email}</TableCell>
                                <TableCell>
                                    <Badge variant={
                                        req.status === 'APPROVED' ? 'default' :
                                            req.status === 'REJECTED' ? 'destructive' : 'secondary'
                                    }>
                                        {req.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-xs text-slate-500">
                                    {new Date(req.created_at).toLocaleDateString()}
                                </TableCell>
                                {isSuperAdmin && (
                                    <TableCell className="text-right">
                                        {req.status === 'PENDING' ? (
                                            <div className="flex items-center justify-end gap-2">
                                                <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleApprove(req.id)}>
                                                    <Check className="w-4 h-4" />
                                                </Button>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button size="sm" variant="destructive">
                                                            <X className="w-4 h-4" />
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-80">
                                                        <div className="space-y-2">
                                                            <h4 className="font-medium leading-none">Reject Request</h4>
                                                            <p className="text-sm text-slate-500">Provide a reason for rejection.</p>
                                                            <form onSubmit={(e: any) => {
                                                                e.preventDefault();
                                                                handleReject(req.id, e.target.note.value);
                                                            }}>
                                                                <Input name="note" placeholder="Reason..." className="mb-2" />
                                                                <Button type="submit" size="sm" className="w-full">Confirm Rejection</Button>
                                                            </form>
                                                        </div>
                                                    </PopoverContent>
                                                </Popover>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-slate-400">
                                                By {req.reviewer_email}
                                            </span>
                                        )}
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                        {requests.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                                    No pending approvals.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
