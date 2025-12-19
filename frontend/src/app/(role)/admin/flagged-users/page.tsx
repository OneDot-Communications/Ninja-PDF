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
import { Loader2, Search, Flag, CheckCircle, AlertTriangle, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface FlaggedUser {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    is_flagged: boolean;
    flagged_reason: string;
    flagged_at: string;
    flagged_by_email: string;
    subscription_tier: string;
    date_joined: string;
}

export default function FlaggedUsersPage() {
    const [users, setUsers] = useState<FlaggedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selectedUser, setSelectedUser] = useState<FlaggedUser | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [isFlagDialogOpen, setIsFlagDialogOpen] = useState(false);
    const [flagReason, setFlagReason] = useState("");

    useEffect(() => {
        loadFlaggedUsers();
    }, []);

    const loadFlaggedUsers = async () => {
        setLoading(true);
        try {
            const response = await api.get("/accounts/admin/flagged-users/");
            const data = response?.results || response || [];
            setUsers(Array.isArray(data) ? data : []);
        } catch (error) {
            toast.error("Failed to load flagged users");
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };

    const handleUnflag = async (userId: number) => {
        try {
            await api.post(`/accounts/admin/users/${userId}/unflag/`);
            toast.success("User unflagged successfully");
            loadFlaggedUsers();
            setIsDetailOpen(false);
        } catch (error) {
            toast.error("Failed to unflag user");
        }
    };

    const handleFlag = async () => {
        if (!selectedUser || !flagReason) return;
        try {
            await api.post(`/accounts/admin/users/${selectedUser.id}/flag/`, {
                reason: flagReason
            });
            toast.success("User flagged");
            setIsFlagDialogOpen(false);
            setFlagReason("");
            loadFlaggedUsers();
        } catch (error) {
            toast.error("Failed to flag user");
        }
    };

    const filteredUsers = users.filter(user => {
        if (!search) return true;
        return user.email.toLowerCase().includes(search.toLowerCase()) ||
            user.first_name?.toLowerCase().includes(search.toLowerCase()) ||
            user.last_name?.toLowerCase().includes(search.toLowerCase());
    });

    const TierBadge = ({ tier }: { tier: string }) => {
        const colors: { [key: string]: string } = {
            FREE: "bg-gray-100 text-gray-700",
            PRO: "bg-blue-100 text-blue-700",
            PREMIUM: "bg-purple-100 text-purple-700",
            ENTERPRISE: "bg-orange-100 text-orange-700"
        };
        return <Badge className={colors[tier] || colors.FREE}>{tier}</Badge>;
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Flagged Users</h1>
                    <p className="text-muted-foreground">Review accounts flagged for suspicious activity</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <span>{users.length} flagged accounts</span>
                </div>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Flagged</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{users.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Flagged Today</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {users.filter(u => {
                                const d = new Date(u.flagged_at);
                                const today = new Date();
                                return d.toDateString() === today.toDateString();
                            }).length}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">{users.length}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search by email or name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* Flagged Users Table */}
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Tier</TableHead>
                                <TableHead>Flagged Reason</TableHead>
                                <TableHead>Flagged At</TableHead>
                                <TableHead>Flagged By</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                    </TableCell>
                                </TableRow>
                            ) : filteredUsers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                                        No flagged users
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredUsers.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarFallback>{user.email[0].toUpperCase()}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <div className="font-medium">{user.first_name} {user.last_name}</div>
                                                    <div className="text-sm text-muted-foreground">{user.email}</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <TierBadge tier={user.subscription_tier} />
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm line-clamp-2 max-w-xs">{user.flagged_reason}</span>
                                        </TableCell>
                                        <TableCell>{new Date(user.flagged_at).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {user.flagged_by_email || "System"}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex gap-2 justify-end">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        setSelectedUser(user);
                                                        setIsDetailOpen(true);
                                                    }}
                                                >
                                                    <Eye className="h-4 w-4 mr-1" /> Review
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleUnflag(user.id)}
                                                >
                                                    <CheckCircle className="h-4 w-4 mr-1" /> Clear
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

            {/* User Detail Dialog */}
            <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Review Flagged User</DialogTitle>
                    </DialogHeader>
                    {selectedUser && (
                        <div className="space-y-4 py-4">
                            <div className="flex items-center gap-4">
                                <Avatar className="h-16 w-16">
                                    <AvatarFallback className="text-xl">{selectedUser.email[0].toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <h3 className="font-semibold text-lg">
                                        {selectedUser.first_name} {selectedUser.last_name}
                                    </h3>
                                    <p className="text-muted-foreground">{selectedUser.email}</p>
                                    <TierBadge tier={selectedUser.subscription_tier} />
                                </div>
                            </div>

                            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <div className="flex items-start gap-2">
                                    <Flag className="h-4 w-4 text-yellow-600 mt-0.5" />
                                    <div>
                                        <h4 className="font-medium text-yellow-800">Flag Reason</h4>
                                        <p className="text-sm text-yellow-700 mt-1">{selectedUser.flagged_reason}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-muted-foreground">Flagged At</span>
                                    <p className="font-medium">{new Date(selectedUser.flagged_at).toLocaleString()}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Flagged By</span>
                                    <p className="font-medium">{selectedUser.flagged_by_email || "System (Auto)"}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Joined</span>
                                    <p className="font-medium">{new Date(selectedUser.date_joined).toLocaleDateString()}</p>
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDetailOpen(false)}>Close</Button>
                        <Button variant="destructive">Suspend Account</Button>
                        <Button onClick={() => selectedUser && handleUnflag(selectedUser.id)}>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Clear Flag
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
