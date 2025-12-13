"use client";

import { useState, useEffect } from "react";
import { api } from "@/app/lib/api";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/app/components/ui/table";
import { Badge } from "@/app/components/ui/badge";
import { Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export default function SuperAdminAdminsPage() {
    const [admins, setAdmins] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAdmins();
    }, []);

    const loadAdmins = async () => {
        try {
            // Reusing getUsers but we might want a filter param in API ideally.
            // For now, filtering client side effectively for the view
            const data = await api.getUsers();
            // Filter only ADMIN and SUPER_ADMIN
            const filtered = data.filter((u: any) => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN');
            setAdmins(filtered);
        } catch (error) {
            toast.error("Failed to load admins");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Administrators</h1>
                    <p className="text-slate-500">List of all system managers and owners.</p>
                </div>
            </div>

            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Admin</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Since</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={3} className="h-24 text-center">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
                                </TableCell>
                            </TableRow>
                        ) : admins.map((admin) => (
                            <TableRow key={admin.id}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-semibold text-slate-600">
                                            {admin.first_name?.[0] || admin.email[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-900">{admin.first_name} {admin.last_name}</p>
                                            <p className="text-xs text-slate-500">{admin.email}</p>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge className={admin.role === 'SUPER_ADMIN' ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}>
                                        {admin.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-xs text-slate-500">
                                    {new Date(admin.date_joined).toLocaleDateString()}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
