"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/services/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, Trash2, UserX, Shield, FileText, Calendar, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface GDPRRequest {
    id: number;
    user_email: string;
    request_type: string;
    status: string;
    created_at: string;
    completed_at: string | null;
    download_url: string | null;
}

interface DataRetentionPolicy {
    id: number;
    data_type: string;
    retention_days: number;
    delete_after_expiry: boolean;
    last_cleanup_at: string;
    records_deleted: number;
}

const REQUEST_TYPES = [
    { value: "EXPORT", label: "Data Export", icon: Download },
    { value: "DELETE", label: "Account Deletion", icon: Trash2 },
    { value: "ANONYMIZE", label: "Data Anonymization", icon: UserX },
];

const STATUSES = [
    { value: "PENDING", label: "Pending", color: "bg-yellow-100 text-yellow-700" },
    { value: "PROCESSING", label: "Processing", color: "bg-blue-100 text-blue-700" },
    { value: "COMPLETED", label: "Completed", color: "bg-green-100 text-green-700" },
    { value: "FAILED", label: "Failed", color: "bg-red-100 text-red-700" },
];

export default function GDPRPage() {
    const [requests, setRequests] = useState<GDPRRequest[]>([]);
    const [policies, setPolicies] = useState<DataRetentionPolicy[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<GDPRRequest | null>(null);
    const [confirmEmail, setConfirmEmail] = useState("");

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [requestsRes, policiesRes] = await Promise.all([
                api.get("/accounts/admin/gdpr/requests/"),
                api.get("/accounts/admin/gdpr/retention-policies/")
            ]);
            setRequests(requestsRes?.results || requestsRes || []);
            setPolicies(policiesRes?.results || policiesRes || []);
        } catch (error) {
            toast.error("Failed to load GDPR data");
        } finally {
            setLoading(false);
        }
    };

    const processRequest = async (id: number) => {
        try {
            await api.post(`/accounts/admin/gdpr/requests/${id}/process/`);
            toast.success("Request processing started");
            loadData();
        } catch (error) {
            toast.error("Failed to process request");
        }
    };

    const confirmDelete = (request: GDPRRequest) => {
        setSelectedRequest(request);
        setConfirmEmail("");
        setIsDeleteConfirmOpen(true);
    };

    const executeDelete = async () => {
        if (!selectedRequest || confirmEmail !== selectedRequest.user_email) {
            toast.error("Email does not match");
            return;
        }
        try {
            await api.post(`/accounts/admin/gdpr/requests/${selectedRequest.id}/execute/`);
            toast.success("Account deletion executed");
            setIsDeleteConfirmOpen(false);
            loadData();
        } catch (error) {
            toast.error("Failed to execute deletion");
        }
    };

    const updatePolicy = async (policy: DataRetentionPolicy) => {
        try {
            await api.put(`/accounts/admin/gdpr/retention-policies/${policy.id}/`, policy);
            toast.success("Policy updated");
        } catch (error) {
            toast.error("Failed to update policy");
        }
    };

    const runCleanup = async (policyId: number) => {
        try {
            await api.post(`/accounts/admin/gdpr/retention-policies/${policyId}/cleanup/`);
            toast.success("Cleanup started");
            loadData();
        } catch (error) {
            toast.error("Failed to start cleanup");
        }
    };

    const getStatusBadge = (status: string) => {
        const s = STATUSES.find(s => s.value === status);
        return <Badge className={s?.color || ""}>{s?.label || status}</Badge>;
    };

    const getRequestIcon = (type: string) => {
        const r = REQUEST_TYPES.find(r => r.value === type);
        const Icon = r?.icon || FileText;
        return <Icon className="h-4 w-4" />;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    const pendingRequests = requests.filter(r => r.status === 'PENDING' || r.status === 'PROCESSING');

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">GDPR Compliance</h1>
                    <p className="text-muted-foreground">Manage data requests and retention policies</p>
                </div>
                <Badge className="bg-green-100 text-green-700 text-base px-4 py-1">
                    <Shield className="h-4 w-4 mr-2" /> GDPR Compliant
                </Badge>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">{pendingRequests.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{requests.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Export Requests</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{requests.filter(r => r.request_type === 'EXPORT').length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Deletion Requests</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{requests.filter(r => r.request_type === 'DELETE').length}</div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="requests">
                <TabsList>
                    <TabsTrigger value="requests">
                        <FileText className="h-4 w-4 mr-2" /> Data Requests
                    </TabsTrigger>
                    <TabsTrigger value="retention">
                        <Calendar className="h-4 w-4 mr-2" /> Retention Policies
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="requests" className="space-y-4">
                    <Card>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Type</TableHead>
                                        <TableHead>User</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Requested</TableHead>
                                        <TableHead>Completed</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {requests.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                No GDPR requests
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        requests.map(request => (
                                            <TableRow key={request.id}>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        {getRequestIcon(request.request_type)}
                                                        {REQUEST_TYPES.find(r => r.value === request.request_type)?.label}
                                                    </div>
                                                </TableCell>
                                                <TableCell>{request.user_email}</TableCell>
                                                <TableCell>{getStatusBadge(request.status)}</TableCell>
                                                <TableCell>{new Date(request.created_at).toLocaleDateString()}</TableCell>
                                                <TableCell>
                                                    {request.completed_at
                                                        ? new Date(request.completed_at).toLocaleDateString()
                                                        : "-"}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex gap-2 justify-end">
                                                        {request.status === 'PENDING' && (
                                                            <>
                                                                {request.request_type === 'EXPORT' && (
                                                                    <Button size="sm" onClick={() => processRequest(request.id)}>
                                                                        Process
                                                                    </Button>
                                                                )}
                                                                {request.request_type === 'DELETE' && (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="destructive"
                                                                        onClick={() => confirmDelete(request)}
                                                                    >
                                                                        Execute
                                                                    </Button>
                                                                )}
                                                            </>
                                                        )}
                                                        {request.status === 'COMPLETED' && request.download_url && (
                                                            <Button size="sm" variant="outline" asChild>
                                                                <a href={request.download_url} download>
                                                                    <Download className="h-4 w-4 mr-1" /> Download
                                                                </a>
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
                </TabsContent>

                <TabsContent value="retention" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Data Retention Policies</CardTitle>
                            <CardDescription>Configure how long data is kept before automatic deletion</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Data Type</TableHead>
                                        <TableHead>Retention Period</TableHead>
                                        <TableHead>Auto-Delete</TableHead>
                                        <TableHead>Last Cleanup</TableHead>
                                        <TableHead>Deleted</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {policies.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                No retention policies configured
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        policies.map(policy => (
                                            <TableRow key={policy.id}>
                                                <TableCell className="font-medium">{policy.data_type}</TableCell>
                                                <TableCell>{policy.retention_days} days</TableCell>
                                                <TableCell>
                                                    <Badge className={policy.delete_after_expiry ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"}>
                                                        {policy.delete_after_expiry ? "Yes" : "No"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {policy.last_cleanup_at
                                                        ? new Date(policy.last_cleanup_at).toLocaleString()
                                                        : "Never"}
                                                </TableCell>
                                                <TableCell>{policy.records_deleted.toLocaleString()}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button size="sm" variant="outline" onClick={() => runCleanup(policy.id)}>
                                                        <Clock className="h-4 w-4 mr-1" /> Run Now
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-red-600 flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5" />
                            Confirm Account Deletion
                        </DialogTitle>
                        <DialogDescription>
                            This will permanently delete all data for this user. This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-800">
                                <strong>User:</strong> {selectedRequest?.user_email}
                            </p>
                            <p className="text-sm text-red-800 mt-1">
                                This will delete: all files, account data, payment history, and activity logs.
                            </p>
                        </div>
                        <div>
                            <Label>Type the user's email to confirm:</Label>
                            <Input
                                value={confirmEmail}
                                onChange={(e) => setConfirmEmail(e.target.value)}
                                placeholder={selectedRequest?.user_email}
                                className="mt-1"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)}>Cancel</Button>
                        <Button
                            variant="destructive"
                            onClick={executeDelete}
                            disabled={confirmEmail !== selectedRequest?.user_email}
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Permanently Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
