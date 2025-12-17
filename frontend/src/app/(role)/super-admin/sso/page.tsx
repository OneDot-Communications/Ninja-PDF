"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/services/api";
import { Key, Plus, Trash2, TestTube, Settings, Shield, Check, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface SSOProvider {
    id: number;
    name: string;
    slug: string;
    provider_type: string;
    status: string;
    entity_id: string;
    sso_url: string;
    client_id: string;
    ldap_server: string;
    auto_create_users: boolean;
    allowed_domains: string[];
    is_default: boolean;
}

const providerTypeLabels: Record<string, string> = {
    SAML: 'SAML 2.0',
    OIDC: 'OpenID Connect',
    LDAP: 'LDAP / Active Directory',
    AZURE_AD: 'Azure Active Directory',
    OKTA: 'Okta',
    GOOGLE_WORKSPACE: 'Google Workspace',
    ONELOGIN: 'OneLogin',
};

const statusColors: Record<string, string> = {
    ACTIVE: 'bg-green-500',
    INACTIVE: 'bg-slate-400',
    TESTING: 'bg-yellow-500',
};

export default function SSOManagementPage() {
    const [providers, setProviders] = useState<SSOProvider[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [testing, setTesting] = useState<number | null>(null);

    const [form, setForm] = useState({
        name: '',
        slug: '',
        provider_type: 'SAML',
        entity_id: '',
        sso_url: '',
        certificate: '',
        client_id: '',
        client_secret: '',
        authorization_endpoint: '',
        token_endpoint: '',
        ldap_server: '',
        ldap_port: 389,
        ldap_bind_dn: '',
        ldap_bind_password: '',
        ldap_base_dn: '',
        auto_create_users: true,
        allowed_domains: '',
    });

    useEffect(() => {
        loadProviders();
    }, []);

    const loadProviders = async () => {
        try {
            const data = await api.request('GET', '/auth/sso/providers/');
            setProviders(data.results || data || []);
        } catch (error) {
            toast.error("Failed to load SSO providers");
        } finally {
            setLoading(false);
        }
    };

    const createProvider = async () => {
        try {
            const payload = {
                ...form,
                allowed_domains: form.allowed_domains.split(',').map(d => d.trim()).filter(Boolean),
            };
            await api.request('POST', '/auth/sso/providers/', payload);
            toast.success("SSO provider created");
            setDialogOpen(false);
            loadProviders();
        } catch (error: any) {
            toast.error(error?.response?.data?.detail || "Failed to create provider");
        }
    };

    const testConnection = async (provider: SSOProvider) => {
        setTesting(provider.id);
        try {
            const result = await api.request('POST', `/auth/sso/providers/${provider.id}/test_connection/`);
            if (result.status === 'success') {
                toast.success(result.message);
            } else {
                toast.error(result.message);
            }
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Connection test failed");
        } finally {
            setTesting(null);
        }
    };

    const toggleProvider = async (provider: SSOProvider) => {
        try {
            await api.request('POST', `/auth/sso/providers/${provider.id}/toggle/`);
            toast.success("Provider status updated");
            loadProviders();
        } catch (error) {
            toast.error("Failed to update provider");
        }
    };

    const deleteProvider = async (id: number) => {
        if (!confirm("Delete this SSO provider?")) return;
        try {
            await api.request('DELETE', `/auth/sso/providers/${id}/`);
            toast.success("Provider deleted");
            loadProviders();
        } catch (error) {
            toast.error("Failed to delete provider");
        }
    };

    if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="container mx-auto py-10 space-y-8">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                        <Key className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">SSO / SAML Management</h1>
                        <p className="text-slate-500">Configure Single Sign-On identity providers</p>
                    </div>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button><Plus className="mr-2 h-4 w-4" /> Add SSO Provider</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Add SSO Provider</DialogTitle>
                            <DialogDescription>Configure a new identity provider for Single Sign-On</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Provider Name</Label>
                                    <Input
                                        value={form.name}
                                        onChange={e => setForm({ ...form, name: e.target.value })}
                                        placeholder="Corporate SSO"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Slug (URL-friendly)</Label>
                                    <Input
                                        value={form.slug}
                                        onChange={e => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s/g, '-') })}
                                        placeholder="corp-sso"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Provider Type</Label>
                                <Select value={form.provider_type} onValueChange={v => setForm({ ...form, provider_type: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(providerTypeLabels).map(([key, label]) => (
                                            <SelectItem key={key} value={key}>{label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* SAML Config */}
                            {['SAML', 'AZURE_AD', 'OKTA', 'ONELOGIN'].includes(form.provider_type) && (
                                <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
                                    <h4 className="font-medium">SAML Configuration</h4>
                                    <div className="space-y-2">
                                        <Label>Entity ID (Issuer)</Label>
                                        <Input
                                            value={form.entity_id}
                                            onChange={e => setForm({ ...form, entity_id: e.target.value })}
                                            placeholder="https://idp.example.com/metadata"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>SSO URL</Label>
                                        <Input
                                            value={form.sso_url}
                                            onChange={e => setForm({ ...form, sso_url: e.target.value })}
                                            placeholder="https://idp.example.com/sso"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>X.509 Certificate</Label>
                                        <Textarea
                                            value={form.certificate}
                                            onChange={e => setForm({ ...form, certificate: e.target.value })}
                                            placeholder="-----BEGIN CERTIFICATE-----..."
                                            rows={4}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* OIDC Config */}
                            {['OIDC', 'GOOGLE_WORKSPACE'].includes(form.provider_type) && (
                                <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
                                    <h4 className="font-medium">OpenID Connect Configuration</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Client ID</Label>
                                            <Input
                                                value={form.client_id}
                                                onChange={e => setForm({ ...form, client_id: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Client Secret</Label>
                                            <Input
                                                type="password"
                                                value={form.client_secret}
                                                onChange={e => setForm({ ...form, client_secret: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Authorization Endpoint</Label>
                                        <Input
                                            value={form.authorization_endpoint}
                                            onChange={e => setForm({ ...form, authorization_endpoint: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Token Endpoint</Label>
                                        <Input
                                            value={form.token_endpoint}
                                            onChange={e => setForm({ ...form, token_endpoint: e.target.value })}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* LDAP Config */}
                            {form.provider_type === 'LDAP' && (
                                <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
                                    <h4 className="font-medium">LDAP Configuration</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>LDAP Server</Label>
                                            <Input
                                                value={form.ldap_server}
                                                onChange={e => setForm({ ...form, ldap_server: e.target.value })}
                                                placeholder="ldap.example.com"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Port</Label>
                                            <Input
                                                type="number"
                                                value={form.ldap_port}
                                                onChange={e => setForm({ ...form, ldap_port: parseInt(e.target.value) })}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Bind DN</Label>
                                        <Input
                                            value={form.ldap_bind_dn}
                                            onChange={e => setForm({ ...form, ldap_bind_dn: e.target.value })}
                                            placeholder="cn=admin,dc=example,dc=com"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Base DN</Label>
                                        <Input
                                            value={form.ldap_base_dn}
                                            onChange={e => setForm({ ...form, ldap_base_dn: e.target.value })}
                                            placeholder="ou=users,dc=example,dc=com"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label>Allowed Email Domains (comma-separated)</Label>
                                <Input
                                    value={form.allowed_domains}
                                    onChange={e => setForm({ ...form, allowed_domains: e.target.value })}
                                    placeholder="company.com, subsidiary.com"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="auto_create"
                                    checked={form.auto_create_users}
                                    onChange={e => setForm({ ...form, auto_create_users: e.target.checked })}
                                />
                                <Label htmlFor="auto_create">Auto-create users on first SSO login</Label>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                            <Button onClick={createProvider}>Create Provider</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                {providers.map(provider => (
                    <Card key={provider.id}>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Shield className="h-5 w-5 text-indigo-600" />
                                    <CardTitle className="text-lg">{provider.name}</CardTitle>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge className={statusColors[provider.status]}>{provider.status}</Badge>
                                    {provider.is_default && <Badge variant="outline">Default</Badge>}
                                </div>
                            </div>
                            <CardDescription>{providerTypeLabels[provider.provider_type]}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="text-sm text-slate-500 space-y-1">
                                {provider.entity_id && <div><span className="font-medium">Entity ID:</span> {provider.entity_id}</div>}
                                {provider.sso_url && <div><span className="font-medium">SSO URL:</span> {provider.sso_url}</div>}
                                {provider.client_id && <div><span className="font-medium">Client ID:</span> {provider.client_id}</div>}
                                {provider.ldap_server && <div><span className="font-medium">LDAP:</span> {provider.ldap_server}</div>}
                                {provider.allowed_domains?.length > 0 && (
                                    <div><span className="font-medium">Domains:</span> {provider.allowed_domains.join(', ')}</div>
                                )}
                            </div>
                            <div className="flex gap-2 pt-2 border-t">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => testConnection(provider)}
                                    disabled={testing === provider.id}
                                >
                                    {testing === provider.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube className="h-4 w-4 mr-1" />}
                                    Test
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => toggleProvider(provider)}
                                >
                                    {provider.status === 'ACTIVE' ? <XCircle className="h-4 w-4 mr-1" /> : <Check className="h-4 w-4 mr-1" />}
                                    {provider.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-500"
                                    onClick={() => deleteProvider(provider.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {providers.length === 0 && (
                <Card className="p-12 text-center">
                    <Key className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                    <h3 className="text-lg font-medium text-slate-900">No SSO Providers Configured</h3>
                    <p className="text-slate-500 mt-1">Add a SAML, OIDC, or LDAP provider to enable SSO for your organization.</p>
                </Card>
            )}
        </div>
    );
}
