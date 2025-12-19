"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/services/api";
import { Shield, Plus, Trash2, Globe, Ban, CheckCircle, Clock, Filter, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface IPRule {
    id: number;
    ip_address: string;
    rule_type: 'WHITELIST' | 'BLACKLIST';
    scope: string;
    reason: string;
    expires_at: string | null;
    is_active: boolean;
    hits: number;
    created_at: string;
}

interface RateLimit {
    id: number;
    name: string;
    scope: string;
    requests_allowed: number;
    time_window: string;
    is_active: boolean;
}

interface PasswordPolicy {
    id: number;
    name: string;
    is_active: boolean;
    min_length: number;
    require_uppercase: boolean;
    require_lowercase: boolean;
    require_digit: boolean;
    require_special: boolean;
    max_failed_attempts: number;
    lockout_duration_minutes: number;
}

export default function SuperAdminSecurityPage() {
    const [ipRules, setIpRules] = useState<IPRule[]>([]);
    const [rateLimits, setRateLimits] = useState<RateLimit[]>([]);
    const [passwordPolicy, setPasswordPolicy] = useState<PasswordPolicy | null>(null);
    const [loading, setLoading] = useState(true);
    const [ipDialogOpen, setIpDialogOpen] = useState(false);
    const [rateLimitDialogOpen, setRateLimitDialogOpen] = useState(false);

    const [ipForm, setIpForm] = useState({
        ip_address: '',
        rule_type: 'BLACKLIST' as 'WHITELIST' | 'BLACKLIST',
        scope: 'GLOBAL',
        reason: '',
        expires_at: '',
    });

    const [rateLimitForm, setRateLimitForm] = useState({
        name: '',
        scope: 'GLOBAL',
        requests_allowed: 100,
        time_window: 'MINUTE',
        burst_allowed: 20,
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [ipData, rateData, policyData] = await Promise.all([
                api.request('GET', '/auth/security/ip-rules/'),
                api.request('GET', '/auth/security/rate-limits/'),
                api.request('GET', '/auth/security/password-policies/active/').catch(() => null),
            ]);
            setIpRules(ipData.results || ipData || []);
            setRateLimits(rateData.results || rateData || []);
            setPasswordPolicy(policyData);
        } catch (error) {
            toast.error("Failed to load security settings");
        } finally {
            setLoading(false);
        }
    };

    const createIPRule = async () => {
        try {
            await api.request('POST', '/auth/security/ip-rules/', {
                ...ipForm,
                expires_at: ipForm.expires_at || null,
            });
            toast.success("IP rule created");
            setIpDialogOpen(false);
            setIpForm({ ip_address: '', rule_type: 'BLACKLIST', scope: 'GLOBAL', reason: '', expires_at: '' });
            loadData();
        } catch (error: any) {
            toast.error(error?.response?.data?.detail || "Failed to create rule");
        }
    };

    const createRateLimit = async () => {
        try {
            await api.request('POST', '/auth/security/rate-limits/', rateLimitForm);
            toast.success("Rate limit created");
            setRateLimitDialogOpen(false);
            setRateLimitForm({ name: '', scope: 'GLOBAL', requests_allowed: 100, time_window: 'MINUTE', burst_allowed: 20 });
            loadData();
        } catch (error: any) {
            toast.error(error?.response?.data?.detail || "Failed to create rate limit");
        }
    };

    const toggleIPRule = async (rule: IPRule) => {
        try {
            await api.request('POST', `/auth/security/ip-rules/${rule.id}/toggle/`);
            toast.success("Rule toggled");
            loadData();
        } catch (error) {
            toast.error("Failed to toggle rule");
        }
    };

    const deleteIPRule = async (id: number) => {
        if (!confirm("Delete this IP rule?")) return;
        try {
            await api.request('DELETE', `/auth/security/ip-rules/${id}/`);
            toast.success("Rule deleted");
            loadData();
        } catch (error) {
            toast.error("Failed to delete rule");
        }
    };

    const updatePasswordPolicy = async (field: string, value: any) => {
        if (!passwordPolicy) return;
        try {
            await api.request('PATCH', `/auth/security/password-policies/${passwordPolicy.id}/`, { [field]: value });
            setPasswordPolicy(prev => prev ? { ...prev, [field]: value } : null);
            toast.success("Policy updated");
        } catch (error) {
            toast.error("Failed to update policy");
        }
    };

    if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="container mx-auto py-10 space-y-8">
            <div className="flex items-center gap-2">
                <div className="p-2 bg-red-100 rounded-lg text-red-600">
                    <Shield className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Security Settings</h1>
                    <p className="text-slate-500">Manage IP rules, rate limiting, and password policies</p>
                </div>
            </div>

            <Tabs defaultValue="ip-rules" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="ip-rules">IP Rules</TabsTrigger>
                    <TabsTrigger value="rate-limits">Rate Limiting</TabsTrigger>
                    <TabsTrigger value="password-policy">Password Policy</TabsTrigger>
                </TabsList>

                <TabsContent value="ip-rules" className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold">IP Whitelist / Blacklist</h2>
                        <Dialog open={ipDialogOpen} onOpenChange={setIpDialogOpen}>
                            <DialogTrigger asChild>
                                <Button><Plus className="mr-2 h-4 w-4" /> Add IP Rule</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Add IP Rule</DialogTitle>
                                    <DialogDescription>Create a whitelist or blacklist rule for an IP address</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label>IP Address</Label>
                                        <Input
                                            value={ipForm.ip_address}
                                            onChange={e => setIpForm({ ...ipForm, ip_address: e.target.value })}
                                            placeholder="192.168.1.100"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Rule Type</Label>
                                            <Select value={ipForm.rule_type} onValueChange={v => setIpForm({ ...ipForm, rule_type: v as any })}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="BLACKLIST">Blacklist (Block)</SelectItem>
                                                    <SelectItem value="WHITELIST">Whitelist (Allow)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Scope</Label>
                                            <Select value={ipForm.scope} onValueChange={v => setIpForm({ ...ipForm, scope: v })}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="GLOBAL">Global</SelectItem>
                                                    <SelectItem value="ADMIN">Admin Panel</SelectItem>
                                                    <SelectItem value="API">API Only</SelectItem>
                                                    <SelectItem value="AUTH">Auth Only</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Reason</Label>
                                        <Input
                                            value={ipForm.reason}
                                            onChange={e => setIpForm({ ...ipForm, reason: e.target.value })}
                                            placeholder="Suspicious activity"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Expires At (Optional)</Label>
                                        <Input
                                            type="datetime-local"
                                            value={ipForm.expires_at}
                                            onChange={e => setIpForm({ ...ipForm, expires_at: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button onClick={createIPRule}>Create Rule</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <div className="grid gap-3">
                        {ipRules.map(rule => (
                            <Card key={rule.id} className={!rule.is_active ? 'opacity-60' : ''}>
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        {rule.rule_type === 'BLACKLIST' ? (
                                            <Ban className="h-8 w-8 text-red-500" />
                                        ) : (
                                            <CheckCircle className="h-8 w-8 text-green-500" />
                                        )}
                                        <div>
                                            <code className="text-lg font-mono font-bold">{rule.ip_address}</code>
                                            <div className="flex gap-2 mt-1">
                                                <Badge variant={rule.rule_type === 'BLACKLIST' ? 'destructive' : 'default'}>
                                                    {rule.rule_type}
                                                </Badge>
                                                <Badge variant="outline">{rule.scope}</Badge>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right text-sm text-slate-500">
                                            <div>{rule.hits} hits</div>
                                            {rule.reason && <div className="truncate max-w-[200px]">{rule.reason}</div>}
                                        </div>
                                        <Button variant="ghost" size="sm" onClick={() => toggleIPRule(rule)}>
                                            {rule.is_active ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => deleteIPRule(rule.id)}>
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                        {ipRules.length === 0 && (
                            <Card className="p-8 text-center text-slate-500">
                                No IP rules configured
                            </Card>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="rate-limits" className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold">Rate Limiting Rules</h2>
                        <Dialog open={rateLimitDialogOpen} onOpenChange={setRateLimitDialogOpen}>
                            <DialogTrigger asChild>
                                <Button><Plus className="mr-2 h-4 w-4" /> Add Rate Limit</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Create Rate Limit</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label>Name</Label>
                                        <Input
                                            value={rateLimitForm.name}
                                            onChange={e => setRateLimitForm({ ...rateLimitForm, name: e.target.value })}
                                            placeholder="API Rate Limit"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Requests Allowed</Label>
                                            <Input
                                                type="number"
                                                value={rateLimitForm.requests_allowed}
                                                onChange={e => setRateLimitForm({ ...rateLimitForm, requests_allowed: parseInt(e.target.value) })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Time Window</Label>
                                            <Select value={rateLimitForm.time_window} onValueChange={v => setRateLimitForm({ ...rateLimitForm, time_window: v })}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="SECOND">Per Second</SelectItem>
                                                    <SelectItem value="MINUTE">Per Minute</SelectItem>
                                                    <SelectItem value="HOUR">Per Hour</SelectItem>
                                                    <SelectItem value="DAY">Per Day</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button onClick={createRateLimit}>Create</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                        {rateLimits.map(limit => (
                            <Card key={limit.id}>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg">{limit.name}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-blue-600">
                                        {limit.requests_allowed} / {limit.time_window}
                                    </div>
                                    <Badge variant="outline" className="mt-2">{limit.scope}</Badge>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="password-policy" className="space-y-4">
                    <h2 className="text-xl font-semibold">Password Policy</h2>
                    {passwordPolicy ? (
                        <Card>
                            <CardHeader>
                                <CardTitle>{passwordPolicy.name}</CardTitle>
                                <CardDescription>Active password requirements</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Minimum Length</Label>
                                        <Input
                                            type="number"
                                            value={passwordPolicy.min_length}
                                            onChange={e => updatePasswordPolicy('min_length', parseInt(e.target.value))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Max Failed Attempts</Label>
                                        <Input
                                            type="number"
                                            value={passwordPolicy.max_failed_attempts}
                                            onChange={e => updatePasswordPolicy('max_failed_attempts', parseInt(e.target.value))}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={passwordPolicy.require_uppercase}
                                            onChange={e => updatePasswordPolicy('require_uppercase', e.target.checked)}
                                        />
                                        <Label>Require Uppercase</Label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={passwordPolicy.require_lowercase}
                                            onChange={e => updatePasswordPolicy('require_lowercase', e.target.checked)}
                                        />
                                        <Label>Require Lowercase</Label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={passwordPolicy.require_digit}
                                            onChange={e => updatePasswordPolicy('require_digit', e.target.checked)}
                                        />
                                        <Label>Require Digit</Label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={passwordPolicy.require_special}
                                            onChange={e => updatePasswordPolicy('require_special', e.target.checked)}
                                        />
                                        <Label>Require Special Char</Label>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Lockout Duration (minutes)</Label>
                                    <Input
                                        type="number"
                                        value={passwordPolicy.lockout_duration_minutes}
                                        onChange={e => updatePasswordPolicy('lockout_duration_minutes', parseInt(e.target.value))}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="p-8 text-center">
                            <p className="text-slate-500 mb-4">No password policy configured</p>
                            <Button onClick={() => api.request('POST', '/auth/security/password-policies/', { name: 'Default Policy', is_active: true })}>
                                Create Default Policy
                            </Button>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
