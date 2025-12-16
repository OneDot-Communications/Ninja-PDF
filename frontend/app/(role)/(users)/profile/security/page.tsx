"use client";

import { useState, useEffect } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Switch } from "@/app/components/ui/switch";
import { Shield, Key, Smartphone, Lock } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/app/lib/api";

export default function SecurityPage() {
    const [loading, setLoading] = useState(false);
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
    const [statusLoading, setStatusLoading] = useState(true);
    const [twoFactorSetup, setTwoFactorSetup] = useState<any>(null);
    const [twoFactorToken, setTwoFactorToken] = useState("");
    const [setupLoading, setSetupLoading] = useState(false);
    const [showSecret, setShowSecret] = useState(false);

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    useEffect(() => {
        loadTwoFactorStatus();
    }, []);

    const loadTwoFactorStatus = async () => {
        try {
            const data = await api.getTwoFactorStatus();
            setTwoFactorEnabled(data.enabled);
        } catch (error) {
            // If user is unauthenticated, this endpoint will return a 401 with
            // message 'Authentication credentials were not provided.' — treat
            // that as "not enabled / not logged in" and avoid noisy console
            // errors in normal unauthenticated browsing.
            const msg = (error as any)?.message || '';
            if (typeof msg === 'string' && msg.includes('Authentication credentials')) {
                setTwoFactorEnabled(false);
                return;
            }
            console.error("Failed to load 2FA status", error);
        } finally {
            setStatusLoading(false);
        }
    };

    const handleEnableTwoFactor = async () => {
        setSetupLoading(true);
        try {
            const data = await api.setupTwoFactor();
            setTwoFactorSetup(data);
        } catch (error: any) {
            toast.error(error.message || "Failed to setup 2FA");
        } finally {
            setSetupLoading(false);
        }
    };

    const handleConfirmTwoFactor = async () => {
        if (!twoFactorToken) {
            toast.error("Please enter the 6-digit code");
            return;
        }
        setSetupLoading(true);
        try {
            await api.enableTwoFactor(twoFactorToken);
            toast.success("2FA enabled successfully");
            setTwoFactorSetup(null);
            setTwoFactorToken("");
            await loadTwoFactorStatus(); // Refresh status
        } catch (error: any) {
            toast.error(error.message || "Invalid code");
        } finally {
            setSetupLoading(false);
        }
    };

    const handleDisableTwoFactor = async () => {
        setSetupLoading(true);
        try {
            await api.disableTwoFactor();
            toast.success("2FA disabled");
            await loadTwoFactorStatus(); // Refresh status
        } catch (error: any) {
            toast.error(error.message || "Failed to disable 2FA");
        } finally {
            setSetupLoading(false);
        }
    };

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
                            {statusLoading ? (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-2">
                                            <Skeleton className="h-4 w-32" />
                                            <Skeleton className="h-3 w-48" />
                                        </div>
                                    </div>
                                    <Skeleton className="h-10 w-full" />
                                </div>
                            ) : twoFactorEnabled ? (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-green-600">
                                        <Lock className="w-4 h-4" />
                                        <span className="text-sm font-medium">2FA is enabled</span>
                                    </div>
                                    <Button
                                        variant="outline"
                                        onClick={handleDisableTwoFactor}
                                        disabled={setupLoading}
                                        className="w-full"
                                    >
                                        {setupLoading ? "Disabling..." : "Disable 2FA"}
                                    </Button>
                                </div>
                            ) : twoFactorSetup ? (
                                <div className="space-y-4">
                                    <div className="bg-slate-50 p-4 rounded-lg border">
                                        <p className="mb-2 font-semibold text-sm">Scan this QR Code</p>
                                        <div className="w-32 h-32 bg-white border mx-auto mb-2 flex items-center justify-center">
                                            <img src={twoFactorSetup.qr_code} alt="QR Code" className="w-full h-full" />
                                        </div>
                                        <p className="text-xs text-center text-slate-600">Use Google Authenticator or Authy to scan.</p>
                                        <div className="flex items-center justify-center gap-2 mt-2">
                                            <div className="text-xs text-slate-500">Secret: </div>
                                            <div className="text-xs font-mono text-slate-700 bg-white px-2 py-1 rounded">
                                                {showSecret ? twoFactorSetup.secret : '••••••••••••'}
                                            </div>
                                            <div>
                                                <button
                                                    type="button"
                                                    className="text-xs text-[#01B0F1] hover:underline"
                                                    onClick={() => {
                                                        if (showSecret) setShowSecret(false);
                                                        else {
                                                            setShowSecret(true);
                                                        }
                                                    }}
                                                >
                                                    {showSecret ? 'Hide' : 'Show'}
                                                </button>
                                            </div>
                                            <div>
                                                <button
                                                    type="button"
                                                    className="text-xs text-[#01B0F1] hover:underline"
                                                    onClick={() => navigator.clipboard?.writeText(twoFactorSetup.secret)}
                                                >
                                                    Copy
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    {twoFactorSetup.backup_codes && (
                                        <div className="bg-white border rounded p-3">
                                            <p className="font-semibold text-sm mb-2">Backup codes (store them securely)</p>
                                            <p className="text-xs text-slate-600 mb-2">These codes are shown only once. Each code can be used one time to recover access.</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                {twoFactorSetup.backup_codes.map((c: string) => (
                                                    <div key={c} className="text-xs font-mono bg-slate-100 px-2 py-1 rounded flex items-center justify-between">
                                                        <span>{c}</span>
                                                        <button onClick={() => navigator.clipboard?.writeText(c)} className="text-xs text-[#01B0F1] ml-2">Copy</button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <div className="space-y-2">
                                        <Label htmlFor="token">Enter 6-digit code</Label>
                                        <Input
                                            id="token"
                                            type="text"
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            placeholder="000000"
                                            value={twoFactorToken}
                                            onChange={(e) => setTwoFactorToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                            maxLength={6}
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            onClick={handleConfirmTwoFactor}
                                            disabled={setupLoading || twoFactorToken.length !== 6}
                                            className="flex-1"
                                        >
                                            {setupLoading ? "Enabling..." : "Enable 2FA"}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => setTwoFactorSetup(null)}
                                            disabled={setupLoading}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label className="text-base">Enable 2FA</Label>
                                            <p className="text-xs text-muted-foreground">
                                                Secure your account with authenticator app.
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        onClick={handleEnableTwoFactor}
                                        disabled={setupLoading}
                                        className="w-full"
                                    >
                                        {setupLoading ? "Setting up..." : "Enable 2FA"}
                                    </Button>
                                </div>
                            )}
                            {twoFactorEnabled && (
                                <div className="mt-4">
                                    <Button
                                        variant="ghost"
                                        onClick={async () => {
                                            const password = window.prompt('Enter your current password to regenerate backup codes');
                                            if (!password) return;
                                            try {
                                                const res = await api.regenerateTwoFactorBackupCodes(password);
                                                // show codes in a toast or modal - use simple alert for now
                                                alert('New backup codes:\n' + res.backup_codes.join('\n'));
                                            } catch (err: any) {
                                                toast.error(err.message || 'Failed to regenerate backup codes');
                                            }
                                        }}
                                    >
                                        Regenerate Backup Codes
                                    </Button>
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
            const msg = (error as any)?.message || '';
            // Suppress 401 errors to avoid console noise when session expires or during initial load check
            if (typeof msg === 'string' && msg.includes('Authentication credentials')) {
                return;
            }
            console.error("Failed to load sessions", error);
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

    const handleRevokeAll = async () => {
        try {
            await api.revokeAllOtherSessions();
            toast.success("All other sessions logged out");
            loadSessions();
        } catch (error) {
            toast.error("Failed to revoke other sessions");
        }
    };

    if (loading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-white">
                        <div className="flex items-center gap-3">
                            <Skeleton className="w-8 h-8 rounded" />
                            <div className="space-y-1">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-3 w-48" />
                            </div>
                        </div>
                        <Skeleton className="h-8 w-16" />
                    </div>
                ))}
            </div>
        );
    }

    if (sessions.length === 0) return <div className="text-sm text-slate-500">No active sessions found.</div>;

    const currentSessionId = sessions.find(s => s.is_current)?.id;
    const hasOtherSessions = sessions.length > 1;

    return (
        <div className="space-y-4">
            {hasOtherSessions && (
                <div className="flex justify-end border-b pb-4 mb-2">
                    <Button variant="outline" size="sm" onClick={handleRevokeAll} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                        Logout of all other devices
                    </Button>
                </div>
            )}
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
