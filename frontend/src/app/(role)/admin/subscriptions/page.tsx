"use client";

import { useEffect, useState } from "react";
import { api } from "@/app/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Search, Filter, Shield, Zap, UserCheck, Loader2 } from "lucide-react";
import { Input } from "@/app/components/ui/input";
import { toast } from "sonner";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/app/components/ui/table";
import { useAuth } from "@/app/context/AuthContext";

export default function SubscriptionsPage() {
    const { user: currentUser } = useAuth();
    const [subscriptions, setSubscriptions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    const fetchSubscriptions = async () => {
        try {
            setLoading(true);
            const data = await api.getUsers(search);
            if (data && data.results) {
                setSubscriptions(data.results);
            } else if (Array.isArray(data)) {
                setSubscriptions(data);
            } else {
                setSubscriptions([]);
            }
        } catch (error) {
            toast.error("Failed to load subscriptions");
            setSubscriptions([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchSubscriptions();
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    const handlePlanChange = async (userId: number, planSlug: string) => {
        try {
            const res = await api.assignUserPlan(userId, planSlug);
            if (res && res.status === 'Queued for Approval') {
                toast.info("Request queued for Super Admin approval");
            } else {
                toast.success(`Plan updated to ${planSlug}`);
                fetchSubscriptions(); // Refresh to show changes if immediate
            }
        } catch (error: any) {
            toast.error("Failed to update plan");
        }
    };



    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Subscriptions</h1>
                <p className="text-slate-500">Manage user plans and billing cycles.</p>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>User Subscriptions</CardTitle>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                placeholder="Search..."
                                className="pl-9 w-[250px]"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Current Plan</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Quick Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8"><Loader2 className="animate-spin inline mr-2" /> Loading...</TableCell>
                                </TableRow>
                            ) : subscriptions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8">No users found.</TableCell>
                                </TableRow>
                            ) : (
                                subscriptions.map((sub) => (
                                    <TableRow key={sub.id}>
                                        <TableCell>
                                            <div className="font-medium">{sub.email}</div>
                                            <div className="text-xs text-slate-500">{sub.first_name} {sub.last_name}</div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={sub.subscription_tier === 'PRO' ? 'default' : 'secondary'}>
                                                {sub.subscription_tier || 'FREE'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                                Active
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    size="sm"
                                                    variant={sub.subscription_tier === 'FREE' ? "outline" : "ghost"}
                                                    className={sub.subscription_tier === 'FREE' ? "bg-slate-100" : ""}
                                                    onClick={() => handlePlanChange(sub.id, 'free')}
                                                    disabled={sub.subscription_tier === 'FREE'}
                                                >
                                                    Free
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant={sub.subscription_tier === 'PRO' ? "default" : "outline"}
                                                    className={sub.subscription_tier === 'PRO' ? "bg-amber-500 hover:bg-amber-600" : "text-amber-600 border-amber-200 hover:bg-amber-50"}
                                                    onClick={() => handlePlanChange(sub.id, 'pro')}
                                                    disabled={sub.subscription_tier === 'PRO'}
                                                >
                                                    <Zap className="w-3 h-3 mr-1" /> Premium
                                                </Button>
                                            </div>
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
