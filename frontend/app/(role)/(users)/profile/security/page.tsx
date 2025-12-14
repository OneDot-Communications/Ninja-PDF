"use client";

import { useState, useEffect } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Switch } from "@/app/components/ui/switch";
import { Shield, Key, Smartphone, Lock } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/app/lib/api";

export default function SecurityPage() {
    const [loading, setLoading] = useState(false);
    const [twoFactor, setTwoFactor] = useState(false);

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const handlePasswordUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast.error("New passwords do not match");
            return;
        }
        setLoading(true);
        try {
            await api.changePassword({
                old_password: currentPassword,
                new_password1: newPassword,
                new_password2: confirmPassword
            });
            toast.success("Password updated successfully");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (error: any) {
            toast.error(error.message || "Failed to update password");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Security Settings</h2>
                <p className="text-muted-foreground">Manage your password and security preferences.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Key className="w-5 h-5 text-blue-600" />
                            <CardTitle>Change Password</CardTitle>
                        </div>
                        <CardDescription>Update your password associated with your account.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handlePasswordUpdate} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="current">Current Password</Label>
                                <Input
                                    id="current"
                                    type="password"
                                    required
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="new">New Password</Label>
                                <Input
                                    id="new"
                                    type="password"
                                    required
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirm">Confirm New Password</Label>
                                <Input
                                    id="confirm"
                                    type="password"
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                            </div>
                            <Button type="submit" disabled={loading} className="w-full">
                                {loading ? "Updating..." : "Update Password"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Shield className="w-5 h-5 text-green-600" />
                                <CardTitle>Two-Factor Authentication</CardTitle>
                            </div>
                            <CardDescription>Add an extra layer of security to your account.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Enable 2FA</Label>
                                    <p className="text-xs text-muted-foreground">
                                        Secure your account with authenticator app.
                                    </p>
                                </div>
                                <Switch
                                    checked={twoFactor}
                                    onCheckedChange={setTwoFactor}
                                />
                            </div>
                            {twoFactor && (
                                <div className="bg-slate-50 p-4 rounded-lg border text-sm text-slate-600">
                                    <p className="mb-2 font-semibold">Scan this QR Code</p>
                                    <div className="w-32 h-32 bg-white border mx-auto mb-2 flex items-center justify-center text-xs text-slate-300">
                                        [QR Code Placeholder]
                                    </div>
                                    <p className="text-xs text-center">Use Google Authenticator or Authy to scan.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Smartphone className="w-5 h-5 text-purple-600" />
                                <CardTitle>Active Sessions</CardTitle>
                            </div>
                            <CardDescription>Manage devices currently logged into your account.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <SessionsList />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function SessionsList() {
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSessions();
    }, []);

    const loadSessions = async () => {
        try {
            const data = await api.getSessions();
            setSessions(data);
        } catch (error) {
            console.error("Failed to load sessions");
        } finally {
            setLoading(false);
        }
    };

    const handleRevoke = async (id: string) => {
        try {
            await api.revokeSession(id);
            toast.success("Session revoked");
            loadSessions();
        } catch (error) {
            toast.error("Failed to revoke session");
        }
    };

    if (loading) return <div className="text-sm text-slate-500">Loading active sessions...</div>;

    if (sessions.length === 0) return <div className="text-sm text-slate-500">No active sessions found.</div>;

    return (
        <div className="space-y-4">
            {sessions.map((session) => (
                <div key={session.id} className={`flex items-center justify-between p-3 rounded-lg border ${session.is_current ? 'bg-slate-50 border-green-200' : 'bg-white'}`}>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 flex items-center justify-center bg-white rounded border">
                            {session.device_type === 'mobile' ? '📱' : '💻'}
                        </div>
                        <div>
                            <p className="text-sm font-medium">{session.browser} on {session.os}</p>
                            <p className="text-xs text-slate-500">
                                {session.ip_address} • {new Date(session.last_activity).toLocaleString()}
                            </p>
                        </div>
                    </div>
                    {session.is_current ? (
                        <div className="text-xs font-semibold text-green-600">Current</div>
                    ) : (
                        <Button variant="ghost" size="sm" onClick={() => handleRevoke(session.id)} className="text-red-500 hover:text-red-600">
                            Revoke
                        </Button>
                    )}
                </div>
            ))}
        </div>
    );
}
