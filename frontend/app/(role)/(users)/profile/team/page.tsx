"use client";

import { useState, useEffect } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/app/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/app/components/ui/table";
import { Badge } from "@/app/components/ui/badge";
import { Plus, Users, Mail, Trash2, MoreHorizontal, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/app/lib/api";
import { useAuth } from "@/app/context/AuthContext";

export default function TeamPage() {
    const { user } = useAuth();
    const [teams, setTeams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [inviteOpen, setInviteOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState("MEMBER");
    const [sendingInvite, setSendingInvite] = useState(false);
    const [activeTeam, setActiveTeam] = useState<any>(null);

    const fetchTeams = async () => {
        try {
            setLoading(true);
            const data = await api.getTeams();
            setTeams(data);
            if (data.length > 0) setActiveTeam(data[0]);
        } catch (error) {
            toast.error("Failed to load teams");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTeams();
    }, []);

    const handleCreateTeam = async () => {
        const name = prompt("Enter team name:");
        if (!name) return;
        try {
            await api.createTeam({ name });
            toast.success("Team created");
            fetchTeams();
        } catch (error) {
            toast.error("Failed to create team");
        }
    };

    const handleInvite = async () => {
        if (!activeTeam) return;
        setSendingInvite(true);
        try {
            await api.inviteTeamMember(activeTeam.id, inviteEmail, inviteRole);
            toast.success("Invitation sent");
            setInviteOpen(false);
            setInviteEmail("");
            fetchTeams(); // Refresh to see members if they joined immediately (rare in invites but good for update)
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Failed to send invite");
        } finally {
            setSendingInvite(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Team Management</h2>
                    <p className="text-muted-foreground">Collaborate with your organization members.</p>
                </div>
                <Button onClick={handleCreateTeam}>
                    <Plus className="w-4 h-4 mr-2" /> Create New Team
                </Button>
            </div>

            {loading ? (
                <div>Loading teams...</div>
            ) : teams.length === 0 ? (
                <Card className="text-center py-12">
                    <CardContent>
                        <Users className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                        <h3 className="text-lg font-medium text-slate-900">No teams yet</h3>
                        <p className="text-slate-500 mb-6">Create a team to start collaborating.</p>
                        <Button onClick={handleCreateTeam}>Create Team</Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-6 md:grid-cols-[250px_1fr]">
                    {/* Team Selector Sidebar */}
                    <div className="space-y-4">
                        {teams.map(team => (
                            <div
                                key={team.id}
                                className={`p-3 rounded-lg border cursor-pointer transition-colors ${activeTeam?.id === team.id ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-200' : 'bg-white hover:bg-slate-50'}`}
                                onClick={() => setActiveTeam(team)}
                            >
                                <h4 className="font-semibold text-slate-900">{team.name}</h4>
                                <div className="flex items-center text-xs text-slate-500 mt-1">
                                    <Users className="w-3 h-3 mr-1" />
                                    {team.member_count} members
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Active Team Details */}
                    {activeTeam && (
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>{activeTeam.name}</CardTitle>
                                    <CardDescription>
                                        Owner: {activeTeam.owner_details?.first_name} {activeTeam.owner_details?.last_name}
                                    </CardDescription>
                                </div>
                                <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                                    <DialogTrigger asChild>
                                        <Button size="sm">
                                            <UserPlus className="w-4 h-4 mr-2" /> Invite Member
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Invite to {activeTeam.name}</DialogTitle>
                                            <DialogDescription>
                                                Send an invitation email to add a new member.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4 py-4">
                                            <div className="space-y-2">
                                                <Label>Email Address</Label>
                                                <Input
                                                    placeholder="colleague@company.com"
                                                    value={inviteEmail}
                                                    onChange={(e) => setInviteEmail(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Role</Label>
                                                <select
                                                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                                                    value={inviteRole}
                                                    onChange={(e) => setInviteRole(e.target.value)}
                                                >
                                                    <option value="MEMBER">Member</option>
                                                    <option value="ADMIN">Admin</option>
                                                    <option value="VIEWER">Viewer</option>
                                                </select>
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
                                            <Button onClick={handleInvite} disabled={sendingInvite}>
                                                {sendingInvite ? "Sending..." : "Send Invite"}
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Member</TableHead>
                                            <TableHead>Role</TableHead>
                                            <TableHead>Joined</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {activeTeam.memberships?.map((member: any) => (
                                            <TableRow key={member.id}>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-8 w-8">
                                                            <AvatarImage src="" />
                                                            <AvatarFallback className="bg-slate-100">{member.user_details?.first_name?.[0] || 'U'}</AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <div className="font-medium text-sm">{member.user_details?.first_name} {member.user_details?.last_name}</div>
                                                            <div className="text-xs text-slate-500">{member.user_details?.email}</div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={member.role === 'ADMIN' ? 'default' : 'secondary'}>
                                                        {member.role}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-xs text-slate-500">
                                                    {new Date(member.joined_at).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500">
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}
