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
import { Loader2, Search, Clock, CheckCircle, XCircle, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface Trial {
    id: number;
    user_email: string;
    user_name: string;
    plan_name: string;
    trial_started_at: string;
    trial_ends_at: string;
    days_remaining: number;
    status: string;
    trial_converted: boolean;
}

export default function TrialsManagementPage() {
    const [trials, setTrials] = useState<Trial[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<"all" | "active" | "expired" | "converted">("all");
    const [selectedTrial, setSelectedTrial] = useState<Trial | null>(null);
    const [isExtendOpen, setIsExtendOpen] = useState(false);
    const [extendDays, setExtendDays] = useState("7");
    const [stats, setStats] = useState({ active: 0, expired: 0, converted: 0 });

    useEffect(() => {
        loadTrials();
    }, [filter]);

    const loadTrials = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/accounts/admin/trials/?status=${filter}`);
            const data = response?.results || response || [];
            setTrials(Array.isArray(data) ? data : []);

            // Calculate stats
            const active = data.filter((t: Trial) => t.status === 'TRIAL').length;
            const expired = data.filter((t: Trial) => t.status === 'FREE' && !t.trial_converted).length;
            const converted = data.filter((t: Trial) => t.trial_converted).length;
            setStats({ active, expired, converted });
        } catch (error) {
            toast.error("Failed to load trials");
            setTrials([]);
        } finally {
            setLoading(false);
        }
    };

    const handleExtendTrial = async () => {
        if (!selectedTrial) return;
        try {
            await api.post(`/subscriptions/admin/trials/${selectedTrial.id}/extend/`, {
                additional_days: parseInt(extendDays)
            });
            toast.success(`Trial extended by ${extendDays} days`);
            setIsExtendOpen(false);
            loadTrials();
        } catch (error) {
            toast.error("Failed to extend trial");
        }
    };

    const handleExpireTrial = async (trialId: number) => {
        if (!confirm("Are you sure you want to expire this trial immediately?")) return;
        try {
            await api.post(`/subscriptions/admin/trials/${trialId}/expire/`);
            toast.success("Trial expired");
            loadTrials();
        } catch (error) {
            toast.error("Failed to expire trial");
        }
    };

    const StatusBadge = ({ status, converted }: { status: string; converted: boolean }) => {
        if (converted) {
            return <Badge className="bg-green-100 text-green-700">Converted</Badge>;
        }
        switch (status) {
            case 'TRIAL':
                return <Badge className="bg-blue-100 text-blue-700">Active</Badge>;
            case 'FREE':
                return <Badge className="bg-gray-100 text-gray-700">Expired</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const filteredTrials = trials.filter(trial => {
        if (!search) return true;
        return trial.user_email.toLowerCase().includes(search.toLowerCase()) ||
            trial.user_name?.toLowerCase().includes(search.toLowerCase());
    });

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Trial Management</h1>
                    <p className="text-muted-foreground">Monitor and manage user trial periods</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Active Trials</CardTitle>
                        <Clock className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.active}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Converted</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.converted}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Expired</CardTitle>
                        <XCircle className="h-4 w-4 text-gray-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.expired}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Trials</SelectItem>
                        <SelectItem value="active">Active Only</SelectItem>
                        <SelectItem value="expired">Expired Only</SelectItem>
                        <SelectItem value="converted">Converted Only</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Trials Table */}
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Plan</TableHead>
                                <TableHead>Started</TableHead>
                                <TableHead>Ends</TableHead>
                                <TableHead>Days Left</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                    </TableCell>
                                </TableRow>
                            ) : filteredTrials.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                        No trials found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredTrials.map((trial) => (
                                    <TableRow key={trial.id}>
                                        <TableCell>
                                            <div>
                                                <div className="font-medium">{trial.user_name || 'N/A'}</div>
                                                <div className="text-sm text-muted-foreground">{trial.user_email}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell>{trial.plan_name}</TableCell>
                                        <TableCell>{new Date(trial.trial_started_at).toLocaleDateString()}</TableCell>
                                        <TableCell>{new Date(trial.trial_ends_at).toLocaleDateString()}</TableCell>
                                        <TableCell>
                                            {trial.days_remaining > 0 ? (
                                                <span className="font-medium">{trial.days_remaining} days</span>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge status={trial.status} converted={trial.trial_converted} />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {trial.status === 'TRIAL' && (
                                                <div className="flex gap-2 justify-end">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                            setSelectedTrial(trial);
                                                            setIsExtendOpen(true);
                                                        }}
                                                    >
                                                        Extend
                                                    </Button>
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={() => handleExpireTrial(trial.id)}
                                                    >
                                                        Expire
                                                    </Button>
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Extend Dialog */}
            <Dialog open={isExtendOpen} onOpenChange={setIsExtendOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Extend Trial Period</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <p>Extending trial for: <strong>{selectedTrial?.user_email}</strong></p>
                        <div>
                            <label className="text-sm font-medium">Additional Days</label>
                            <Select value={extendDays} onValueChange={setExtendDays}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="3">3 days</SelectItem>
                                    <SelectItem value="7">7 days</SelectItem>
                                    <SelectItem value="14">14 days</SelectItem>
                                    <SelectItem value="30">30 days</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsExtendOpen(false)}>Cancel</Button>
                        <Button onClick={handleExtendTrial}>Extend Trial</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
