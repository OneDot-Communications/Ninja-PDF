"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/services/api";
import { Shield, Users, Crown, User, Filter, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Permission {
    id: number;
    code: string;
    name: string;
    description: string;
    category: 'TOOL' | 'PERMISSION' | 'SYSTEM_CONFIG';
    permission_id: number;
}

interface RolePermission {
    role: string;
    feature: Permission;
}

export default function RBACPermissionsPage() {
    const [allFeatures, setAllFeatures] = useState<Permission[]>([]);
    const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [features, permissions] = await Promise.all([
                api.getFeatures(),
                api.request('GET', '/api/billing/features/role_permissions/').catch(() => []),
            ]);
            // Filter to only show PERMISSION and SYSTEM_CONFIG categories (not TOOL)
            const rbacPermissions = features.filter((f: Permission) =>
                f.category === 'PERMISSION' || f.category === 'SYSTEM_CONFIG'
            );
            setAllFeatures(rbacPermissions);
            setRolePermissions(permissions || []);
        } catch (error) {
            toast.error("Failed to load permissions");
        } finally {
            setLoading(false);
        }
    };

    // Group permissions by category
    const groupByCategory = (permissions: Permission[]) => {
        const groups: Record<string, Permission[]> = {
            'Account & Identity': [],
            'Subscription & Pricing': [],
            'Tool System': [],
            'File & Storage': [],
            'API & Integration': [],
            'Security & Compliance': [],
            'Analytics': [],
            'User Management': [],
            'Support': [],
            'Content': [],
            'Reporting': [],
            'Other': [],
        };

        permissions.forEach(p => {
            const code = p.code || '';
            if (code.includes('ADMIN') || code.includes('USER') || code.includes('ROLE') || code.includes('ACCOUNT') || code.includes('MFA') || code.includes('PASSWORD') || code.includes('LOGOUT')) {
                groups['Account & Identity'].push(p);
            } else if (code.includes('PLAN') || code.includes('PRICE') || code.includes('TRIAL') || code.includes('COUPON') || code.includes('TAX') || code.includes('PROMO')) {
                groups['Subscription & Pricing'].push(p);
            } else if (code.includes('TOOL') || code.includes('BATCH') || code.includes('OCR') || code.includes('EDIT') || code.includes('WATERMARK') || code.includes('QUALITY') || code.includes('ADS')) {
                groups['Tool System'].push(p);
            } else if (code.includes('FILE') || code.includes('STORAGE') || code.includes('DELETE') || code.includes('ENCRYPT') || code.includes('VIRUS') || code.includes('RETENTION')) {
                groups['File & Storage'].push(p);
            } else if (code.includes('API') || code.includes('CLOUD') || code.includes('INTEGRATION')) {
                groups['API & Integration'].push(p);
            } else if (code.includes('AUDIT') || code.includes('IP') || code.includes('DDOS') || code.includes('ABUSE') || code.includes('GDPR') || code.includes('CONSENT') || code.includes('EXPORT')) {
                groups['Security & Compliance'].push(p);
            } else if (code.includes('VIEW') || code.includes('MONITOR') || code.includes('ANALYTICS') || code.includes('DAU') || code.includes('CHURN') || code.includes('CONVERSION')) {
                groups['Analytics'].push(p);
            } else if (code.includes('SUSPEND') || code.includes('REACTIVATE') || code.includes('UPGRADE') || code.includes('DOWNGRADE') || code.includes('VERIFY') || code.includes('USAGE')) {
                groups['User Management'].push(p);
            } else if (code.includes('TICKET') || code.includes('JOB') || code.includes('BILLING') || code.includes('SUB') || code.includes('ASSIST')) {
                groups['Support'].push(p);
            } else if (code.includes('FAQ') || code.includes('TUTORIAL') || code.includes('ANNOUNCEMENT')) {
                groups['Content'].push(p);
            } else if (code.includes('REPORT') || code.includes('GEN_')) {
                groups['Reporting'].push(p);
            } else {
                groups['Other'].push(p);
            }
        });

        // Remove empty groups
        return Object.fromEntries(Object.entries(groups).filter(([_, v]) => v.length > 0));
    };

    // Filter by search
    const filteredFeatures = allFeatures.filter(f =>
        f.name.toLowerCase().includes(search.toLowerCase()) ||
        f.code.toLowerCase().includes(search.toLowerCase())
    );

    // Get permissions by range for each role
    const superAdminPerms = filteredFeatures.filter(f => f.permission_id && f.permission_id <= 107);
    const adminPerms = filteredFeatures.filter(f => f.permission_id && f.permission_id >= 108 && f.permission_id <= 145);
    const userPerms = filteredFeatures.filter(f => f.permission_id && f.permission_id >= 146);

    if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="animate-spin" /></div>;

    const CategorySection = ({ permissions, color }: { permissions: Permission[], color: string }) => {
        const groups = groupByCategory(permissions);
        return (
            <div className="space-y-6">
                {Object.entries(groups).map(([category, perms]) => (
                    <Card key={category}>
                        <CardHeader className="py-3">
                            <CardTitle className="text-lg">{category}</CardTitle>
                            <CardDescription>{perms.length} permissions</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                {perms.map(p => (
                                    <div key={p.id} className={`p-3 rounded-lg border ${color} text-sm`}>
                                        <div className="font-medium">{p.name}</div>
                                        <code className="text-xs text-slate-400">{p.code}</code>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                        <Shield className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">RBAC Permissions</h1>
                        <p className="text-slate-500">Role-based access control - {allFeatures.length} permissions defined</p>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <Card className="border-purple-200 bg-purple-50">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <Crown className="w-8 h-8 text-purple-600" />
                            <div>
                                <p className="text-2xl font-bold text-purple-700">{superAdminPerms.length}</p>
                                <p className="text-sm text-purple-600">Super Admin</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <Users className="w-8 h-8 text-blue-600" />
                            <div>
                                <p className="text-2xl font-bold text-blue-700">{adminPerms.length}</p>
                                <p className="text-sm text-blue-600">Admin</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-green-200 bg-green-50">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <User className="w-8 h-8 text-green-600" />
                            <div>
                                <p className="text-2xl font-bold text-green-700">{userPerms.length}</p>
                                <p className="text-sm text-green-600">User</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                    className="pl-10"
                    placeholder="Search permissions..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            {/* Tabs by Role */}
            <Tabs defaultValue="super-admin" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="super-admin" className="gap-2">
                        <Crown className="w-4 h-4" /> Super Admin
                    </TabsTrigger>
                    <TabsTrigger value="admin" className="gap-2">
                        <Users className="w-4 h-4" /> Admin
                    </TabsTrigger>
                    <TabsTrigger value="user" className="gap-2">
                        <User className="w-4 h-4" /> User
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="super-admin">
                    <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                        <p className="text-purple-800">
                            <strong>Super Admin</strong> has full system access including creating/managing other admins,
                            payment gateways, global tool control, security settings, and GDPR compliance.
                        </p>
                    </div>
                    <CategorySection permissions={superAdminPerms} color="bg-purple-50 border-purple-200" />
                </TabsContent>

                <TabsContent value="admin">
                    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-blue-800">
                            <strong>Admin</strong> can manage users, view analytics, handle support tickets,
                            manage content, and generate reports. Tool tier changes require Super Admin approval.
                        </p>
                    </div>
                    <CategorySection permissions={adminPerms} color="bg-blue-50 border-blue-200" />
                </TabsContent>

                <TabsContent value="user">
                    <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-green-800">
                            <strong>User</strong> has basic account management permissions.
                            PDF tool access is determined by their subscription plan (Free/Premium/Enterprise).
                        </p>
                    </div>
                    <CategorySection permissions={userPerms} color="bg-green-50 border-green-200" />
                </TabsContent>
            </Tabs>
        </div>
    );
}
