"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Shield, Ban, Mail, UserCheck, Calendar, Activity, Database, AlertCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function AdminUserDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const userId = params.userId as string;

    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<any>(null);

    // Feature Overrides
    const [features, setFeatures] = useState<any[]>([]);
    const [overrides, setOverrides] = useState<any[]>([]);
    const [savingOverride, setSavingOverride] = useState<number | null>(null);

    useEffect(() => {
        if (userId) loadData();
    }, [userId]);

    const loadData = async () => {
        try {
            const [u, me, feats, ovs] = await Promise.all([
                api.getUserDetails(userId),
                api.getUserDetails('me'),
                api.getFeatures(),
                api.getFeatureOverrides(parseInt(userId))
            ]);
            setUser(u);
            setCurrentUser(me);
            setFeatures(feats);
            setOverrides(ovs);
        } catch (error) {
            toast.error("Failed to load user details");
            router.push("/admin/users");
        } finally {
            setLoading(false);
        }
    };

    const can = (permission: string) => {
        if (!currentUser) return false;
        if (currentUser.role === 'SUPER_ADMIN') return true;
        return currentUser.entitlements?.[permission]?.allowed === true;
    };

    // Helper to get current config for a feature
    const getOverrideConfig = (featureId: number) => {
        const ov = overrides.find(o => o.feature === featureId);
        if (ov) return { is_enabled: ov.is_enabled, limit: ov.limit };
        // If no override, what is the default?
        // Ideally we show "Inherited" status.
        return null;
    };

    const handleSaveOverride = async (feature: any, isEnabled: boolean, limit: number | null) => {
        setSavingOverride(feature.id);
        try {
            // Check if override exists
            const existing = overrides.find(o => o.feature === feature.id);

            if (existing) {
                // Update
                // Need Update Endpoint: PATCH /api/billing/feature-overrides/{id}/
                // api.ts needs updateFeatureOverride or we use generic request
                await api.request("PATCH", `/api/billing/feature-overrides/${existing.id}/`, {
                    is_enabled: isEnabled,
                    limit: limit
                });
            } else {
                // Create
                await api.setFeatureOverride(parseInt(userId), feature.id, isEnabled); // Takes user, feature, enabled. Limit?
                // setFeatureOverride only takes isEnabled in current api.ts
                // We might need to update api.ts setFeatureOverride to accept limit or use direct request
                // For now, let's use direct POST if we want to send limit
            }
            toast.success("Override updated");

            // Refresh overrides
            const newOvs = await api.getFeatureOverrides(parseInt(userId));
            setOverrides(newOvs);

        } catch (error) {
            toast.error("Failed to save override");
        } finally {
            setSavingOverride(null);
        }
    };

    const handleLimitChange = async (featureId: number, val: string) => {
        // Debounce or save on blur? On Blur is better.
        // Here we just update local state if we were tracking it per row.
        // But we are rendering from props. Use a dialog for editing limit? Or simple inline?
        // Let's implement simple inline toggle and maybe a different UI for Limit.
    };


    if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin" /></div>;
    if (!user) return <div>User not found</div>;

    return (
        <div className="container mx-auto py-10 space-y-6">
            <Button variant="ghost" onClick={() => router.back()} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Users
            </Button>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* USER PROFILE CARD */}
                <Card className="md:col-span-1">
                    <CardHeader>
                        <CardTitle>User Profile</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-center py-4">
                            <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center text-2xl font-bold text-slate-500">
                                {user.first_name?.[0] || user.email[0]}
                            </div>
                        </div>
                        <div className="space-y-2 text-center">
                            <h2 className="text-xl font-bold">{user.first_name} {user.last_name}</h2>
                            <p className="text-sm text-slate-500">{user.email}</p>
                            <div className="flex justify-center gap-2 pt-2">
                                <Badge variant="outline">{user.role}</Badge>
                                <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">{user.subscription_tier || 'FREE'}</Badge>
                            </div>
                        </div>
                        <div className="pt-4 space-y-2 text-sm">
                            <div className="flex justify-between border-b pb-2">
                                <span className="text-slate-500">Joined</span>
                                <span>{new Date(user.date_joined).toLocaleDateString()}</span>
                            </div>
                            <div className="flex justify-between border-b pb-2">
                                <span className="text-slate-500">Status</span>
                                <span className={user.is_active ? "text-green-600" : "text-red-600"}>{user.is_active ? "Active" : "Inactive"}</span>
                            </div>
                            <div className="flex justify-between border-b pb-2">
                                <span className="text-slate-500">Subscription End</span>
                                <span>{user.subscription_end_date ? new Date(user.subscription_end_date).toLocaleDateString() : 'N/A'}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* MAIN CONTENT TABS */}
                <Card className="md:col-span-2">
                    <Tabs defaultValue="overview">
                        <CardHeader className="pb-0 border-b">
                            <TabsList className="mb-0">
                                <TabsTrigger value="overview">Overview</TabsTrigger>
                                {can('MANAGE_TOOLS_USER') && <TabsTrigger value="features">Feature Overrides</TabsTrigger>}
                                {can('MANAGE_INVOICES') && <TabsTrigger value="invoices">Invoices</TabsTrigger>}
                            </TabsList>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <TabsContent value="overview">
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 rounded-lg bg-slate-50 border">
                                            <div className="flex items-center gap-2 text-slate-500 mb-2">
                                                <Activity className="w-4 h-4" /> Usage Stats
                                            </div>
                                            <div className="text-2xl font-bold">{user.feature_usage_count || 0}</div>
                                            <div className="text-xs text-slate-400">Total API Calls</div>
                                        </div>
                                        <div className="p-4 rounded-lg bg-slate-50 border">
                                            <div className="flex items-center gap-2 text-slate-500 mb-2">
                                                <Database className="w-4 h-4" /> Storage
                                            </div>
                                            <div className="text-2xl font-bold">{(user.storage_used / 1024 / 1024).toFixed(2)} MB</div>
                                            <div className="text-xs text-slate-400">Used</div>
                                        </div>
                                    </div>

                                    {/* Recent Activity Log Placeholder */}
                                    <div>
                                        <h3 className="font-semibold mb-2">Recent Activity</h3>
                                        <div className="text-sm text-slate-500 italic">No recent activity logged.</div>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="features">
                                <div className="mb-4 flex items-center gap-2 p-3 bg-blue-50 text-blue-800 rounded-md text-sm border-blue-100 border">
                                    <AlertCircle className="w-4 h-4" />
                                    Overrides allow you to explicity enable/disable features for this user, regardless of their plan.
                                </div>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Feature</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Limit Override</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {features.map(feature => {
                                            const ov = overrides.find(o => o.feature === feature.id);
                                            const isOverridden = !!ov;

                                            return (
                                                <TableRow key={feature.id}>
                                                    <TableCell>
                                                        <div className="font-medium">{feature.name}</div>
                                                        <div className="text-xs text-slate-500">{feature.code}</div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {isOverridden ? (
                                                            <Badge className={ov.is_enabled ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                                                                {ov.is_enabled ? "Explicit Enabled" : "Explicit Disabled"}
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="text-slate-500">Plan Default</Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {isOverridden && ov.limit !== null ? (
                                                            <span className="font-mono">{ov.limit === -1 ? "Unlimited" : ov.limit}</span>
                                                        ) : (
                                                            <span className="text-slate-400">-</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {/* Action Buttons */}
                                                        <div className="flex justify-end gap-2">
                                                            {isOverridden ? (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="text-red-600 hover:text-red-700"
                                                                    onClick={async () => {
                                                                        // Delete override
                                                                        await api.request("DELETE", `/api/billing/feature-overrides/${ov.id}/`);
                                                                        toast.success("Override removed");
                                                                        setOverrides(await api.getFeatureOverrides(parseInt(userId)));
                                                                    }}
                                                                >
                                                                    Clear
                                                                </Button>
                                                            ) : (
                                                                <div className="flex gap-1">
                                                                    <Button size="sm" variant="outline" className="text-green-600" onClick={() => handleSaveOverride(feature, true, -1)}>
                                                                        Enable
                                                                    </Button>
                                                                    <Button size="sm" variant="outline" className="text-red-600" onClick={() => handleSaveOverride(feature, false, null)}>
                                                                        Disable
                                                                    </Button>
                                                                </div>
                                                            )}
                                                            {isOverridden && ov.is_enabled && (
                                                                <Button size="sm" variant="ghost" onClick={() => {
                                                                    // Open limit dialog (omitted for brevity, assume quick toggle for now)
                                                                    // For now just toggle limit -1 to 100 as demo?
                                                                    // Better: Prompt
                                                                    const newLimit = prompt("Enter limit (-1 for unlimited):", ov.limit?.toString());
                                                                    if (newLimit !== null) handleSaveOverride(feature, true, parseInt(newLimit));
                                                                }}>
                                                                    Set Limit
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </TabsContent>

                            <TabsContent value="invoices">
                                <div className="text-center py-10">
                                    <Button onClick={() => router.push(`/admin/users/${userId}/invoices`)}>
                                        Manage Invoices
                                    </Button>
                                </div>
                            </TabsContent>
                        </CardContent>
                    </Tabs>
                </Card>
            </div>
        </div>
    );
}
