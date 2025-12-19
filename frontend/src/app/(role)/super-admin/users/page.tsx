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
import { Loader2, Search, Shield, ShieldAlert, User, MoreVertical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function SuperAdminUsersPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [isManageOpen, setIsManageOpen] = useState(false);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async (query = "") => {
        setLoading(true);
        try {
            const data = await api.getUsers(query);
            if (data && data.results) {
                setUsers(data.results);
            } else if (Array.isArray(data)) {
                setUsers(data);
            } else {
                setUsers([]);
            }
        } catch (error) {
            toast.error("Failed to load users");
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        loadUsers(search);
    };

    const handleRoleChange = async (userId: number, newRole: string) => {
        try {
            await api.updateUserRole(userId, newRole);
            toast.success(`User role updated to ${newRole}`);
            loadUsers(search); // Refresh
            setIsManageOpen(false);
        } catch (error) {
            toast.error("Failed to update role");
        }
    };

    const StatusBadge = ({ role }: { role: string }) => {
        switch (role) {
            case 'SUPER_ADMIN':
                return <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-red-200">Super Admin</Badge>;
            case 'ADMIN':
                return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200">Admin</Badge>;
            default:
                return <Badge variant="secondary">User</Badge>;
        }
    };

    const handleImpersonate = async (userId: number) => {
        try {
            const data = await api.impersonateUser(userId);
            // Save tokens and redirect
            localStorage.setItem('access_token', data.access);
            localStorage.setItem('refresh_token', data.refresh);
            // Force reload to pick up new user context
            window.location.href = '/dashboard';
        } catch (error: any) {
            toast.error(error.message || "Impersonation failed");
        }
    };

    const handleForceLogout = async (userId: number) => {
        try {
            await api.forceLogout(userId);
            toast.success("User logged out from all devices");
        } catch (error) {
            toast.error("Failed to force logout");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">User Management</h1>
                    <p className="text-slate-500">Manage users, assign roles, and control access.</p>
                </div>
            </div>

            <div className="flex items-center gap-4 bg-white p-4 rounded-xl border shadow-sm">
                <form onSubmit={handleSearch} className="flex-1 flex items-center gap-2">
                    <Search className="w-5 h-5 text-slate-400" />
                    <Input
                        placeholder="Search by name or email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="border-none shadow-none focus-visible:ring-0"
                    />
                </form>
                <Button onClick={() => loadUsers(search)}>Search</Button>
            </div>

            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
                                </TableCell>
                            </TableRow>
                        ) : users.map((user) => (
                            <TableRow key={user.id}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-semibold text-slate-600">
                                            {user.first_name?.[0] || user.email[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-900">{user.first_name} {user.last_name}</p>
                                            <p className="text-xs text-slate-500">{user.email}</p>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <StatusBadge role={user.role} />
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200">Active</Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm">
                                                <MoreVertical className="w-4 h-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                            <DropdownMenuItem onClick={() => { setSelectedUser(user); setIsManageOpen(true); }}>
                                                Manage Roles
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            {user.role !== 'SUPER_ADMIN' && (
                                                <DropdownMenuItem onClick={() => handleImpersonate(user.id)}>
                                                    Impersonate
                                                </DropdownMenuItem>
                                            )}
                                            <DropdownMenuItem onClick={() => handleForceLogout(user.id)}>
                                                Force Logout
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem className="text-red-600">
                                                Ban User
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Manage Role: {selectedUser?.email}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-1 gap-2">
                            <Button
                                variant={selectedUser?.role === 'USER' ? "default" : "outline"}
                                className="justify-start gap-2"
                                onClick={() => handleRoleChange(selectedUser.id, 'USER')}
                            >
                                <User className="w-4 h-4" /> Demote to User
                            </Button>
                            <Button
                                variant={selectedUser?.role === 'ADMIN' ? "default" : "outline"}
                                className="justify-start gap-2"
                                onClick={() => handleRoleChange(selectedUser.id, 'ADMIN')}
                            >
                                <Shield className="w-4 h-4" /> Promote to Admin
                            </Button>
                            <Button
                                variant={selectedUser?.role === 'SUPER_ADMIN' ? "default" : "outline"}
                                className="justify-start gap-2"
                                onClick={() => handleRoleChange(selectedUser.id, 'SUPER_ADMIN')}
                            >
                                <ShieldAlert className="w-4 h-4" /> Promote to Super Admin
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
