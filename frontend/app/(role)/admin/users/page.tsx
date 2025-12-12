"use client";

import { useEffect, useState } from "react";
import { api } from "@/app/lib/api";
import {
    Search,
    Filter,
    MoreHorizontal,
    Shield,
    Trash2,
    UserX,
    UserCheck,
    Mail
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/app/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu"; // Assuming these exist, otherwise I'll use standard select
import { Badge } from "@/app/components/ui/badge";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function AdminUsersPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const data = await api.getUsers();
            setUsers(data);
        } catch (error) {
            toast.error("Failed to load users");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this user? This cannot be undone.")) return;
        try {
            await api.deleteUser(id);
            toast.success("User deleted successfully");
            fetchUsers();
        } catch (error: any) {
            toast.error(error.message || "Failed to delete user");
        }
    };

    const handleRoleUpdate = async (id: number, newRole: string) => {
        try {
            await api.updateUserRole(id, newRole);
            toast.success("User role updated");
            fetchUsers();
        } catch (error: any) {
            toast.error(error.message || "Failed to update role");
        }
    };

    const filteredUsers = users.filter(user =>
        user.email.toLowerCase().includes(search.toLowerCase()) ||
        (user.first_name && user.first_name.toLowerCase().includes(search.toLowerCase())) ||
        (user.last_name && user.last_name.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
        >
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">User Management</h1>
                    <p className="text-slate-500">Manage user access and roles.</p>
                </div>
                <Button onClick={fetchUsers}>Refresh</Button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center gap-4 bg-slate-50/50">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Search users..."
                            className="pl-9 bg-white"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" className="gap-2">
                        <Filter className="w-4 h-4" /> Filter
                    </Button>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50/50">
                            <TableHead>User</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Joined</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8">Loading users...</TableCell>
                            </TableRow>
                        ) : filteredUsers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8">No users found.</TableCell>
                            </TableRow>
                        ) : (
                            filteredUsers.map((user) => (
                                <TableRow key={user.id} className="group hover:bg-slate-50/50 transition-colors">
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 uppercase">
                                                {user.first_name?.[0] || user.email[0]}
                                            </div>
                                            <div>
                                                <div className="font-medium text-slate-900">
                                                    {user.first_name} {user.last_name}
                                                </div>
                                                <div className="text-xs text-slate-500">{user.email}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={
                                            user.role === 'SUPER_ADMIN' ? 'bg-red-50 text-red-700 border-red-200' :
                                                user.role === 'ADMIN' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                                    'bg-blue-50 text-blue-700 border-blue-200'
                                        }>
                                            {user.role}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {user.is_verified ? (
                                            <div className="flex items-center gap-1.5 text-green-600 text-xs font-medium">
                                                <UserCheck className="w-3.5 h-3.5" /> Verified
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 text-yellow-600 text-xs font-medium">
                                                <Mail className="w-3.5 h-3.5" /> Pending
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-slate-500 text-sm">
                                        {new Date(user.date_joined).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">Open menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => handleRoleUpdate(user.id, 'ADMIN')}>
                                                    <Shield className="mr-2 h-4 w-4" /> Make Admin
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleRoleUpdate(user.id, 'USER')}>
                                                    <UserX className="mr-2 h-4 w-4" /> Revoke Admin
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(user.id)}>
                                                    <Trash2 className="mr-2 h-4 w-4" /> Delete User
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </motion.div>
    );
}
