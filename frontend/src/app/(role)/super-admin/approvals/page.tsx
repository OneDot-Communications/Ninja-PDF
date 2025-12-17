"use client";

import { useEffect, useState } from "react";
import { api } from "@/app/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { CheckCircle2, XCircle, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function ApprovalsPage() {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<number | null>(null);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const data = await api.getAdminRequests();
            setRequests(data);
        } catch (error) {
            toast.error("Failed to load requests");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const handleAction = async (id: number, action: 'approve' | 'reject') => {
        if (!confirm(`Are you sure you want to ${action} this request?`)) return;
        setProcessing(id);
        try {
            if (action === 'approve') {
                await api.approveRequest(id);
                toast.success("Request approved and executed");
            } else {
                await api.rejectRequest(id, "Rejected by Super Admin");
                toast.success("Request rejected");
            }
            fetchRequests();
        } catch (error: any) {
            toast.error(error.message || "Action failed");
        } finally {
            setProcessing(null);
        }
    };

    const pendingRequests = requests.filter(r => r.status === 'PENDING');
    const historyRequests = requests.filter(r => r.status !== 'PENDING');

    return (
        <div className="space-y-8 p-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Admin Approvals</h1>
                <p className="text-slate-500">Review and authorize sensitive administrative actions.</p>
            </div>

            <div className="space-y-6">
                <Card className="border-l-4 border-l-blue-500 shadow-md">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <ArrowRight className="w-5 h-5 text-blue-500" />
                            Pending Approvals ({pendingRequests.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex justify-center py-6"><Loader2 className="animate-spin text-slate-400" /></div>
                        ) : pendingRequests.length === 0 ? (
                            <p className="text-center py-6 text-slate-500 italic">No pending actions requiring your attention.</p>
                        ) : (
                            <div className="space-y-4">
                                {pendingRequests.map((req) => (
                                    <motion.div
                                        key={req.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                                    >
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <Badge variant="outline" className="font-mono">{req.action_type}</Badge>
                                                <span className="text-xs text-slate-400">{new Date(req.created_at).toLocaleString()}</span>
                                            </div>
                                            <p className="font-medium text-slate-900">
                                                Request from <span className="text-blue-600 font-bold">{req.requester_email || "Admin"}</span>
                                            </p>

                                            {/* Rich Preview */}
                                            {req.rich_preview ? (
                                                <div className="mt-2 p-3 bg-slate-50 rounded border border-slate-100 text-sm">
                                                    <div className="font-semibold text-slate-800">
                                                        {req.rich_preview.target_user}
                                                    </div>
                                                    <div className="text-slate-600">
                                                        {req.rich_preview.action_detail}
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                                                    {JSON.stringify(req.payload, null, 2)}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleAction(req.id, 'reject')}
                                                disabled={processing === req.id}
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                            >
                                                <XCircle className="w-4 h-4 mr-1" /> Reject
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() => handleAction(req.id, 'approve')}
                                                disabled={processing === req.id}
                                                className="bg-green-600 hover:bg-green-700 text-white"
                                            >
                                                {processing === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                                                Approve
                                            </Button>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base text-slate-500">History Log</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {historyRequests.slice(0, 10).map((req) => (
                                <div key={req.id} className="flex items-center justify-between p-3 bg-slate-50 rounded border border-slate-100 text-sm opacity-70 hover:opacity-100 transition-opacity">
                                    <div className="flex items-center gap-3">
                                        {req.status === 'APPROVED' ?
                                            <CheckCircle2 className="w-4 h-4 text-green-500" /> :
                                            <XCircle className="w-4 h-4 text-red-500" />
                                        }
                                        <div>
                                            <span className="font-medium text-slate-700">{req.action_type}</span>
                                            <span className="mx-2 text-slate-300">|</span>
                                            <span className="text-slate-500">By {req.requester_email || "Unknown"}</span>
                                        </div>
                                    </div>
                                    <span className="text-xs text-slate-400">{new Date(req.updated_at).toLocaleDateString()}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
