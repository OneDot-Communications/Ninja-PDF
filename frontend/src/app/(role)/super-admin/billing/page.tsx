"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/services/api";
import { Button } from "@/components/ui/button";
import { Loader2, Save, Building, CreditCard, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface BillingConfig {
    id: number;
    company_name: string;
    company_address: string;
    company_email: string;
    company_phone: string;
    tax_id: string;
    default_currency: string;
    invoice_prefix: string;
    invoice_footer: string;
    payment_terms_days: number;
    auto_generate_invoices: boolean;
    send_invoice_emails: boolean;
    stripe_enabled: boolean;
    razorpay_enabled: boolean;
    paypal_enabled: boolean;
}

export default function BillingConfigPage() {
    const [config, setConfig] = useState<BillingConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        setLoading(true);
        try {
            const response = await api.get("/subscriptions/billing-config/");
            const data = response?.results?.[0] || response?.[0] || response;
            setConfig(data);
        } catch (error) {
            // Initialize with defaults if not found
            setConfig({
                id: 0,
                company_name: "",
                company_address: "",
                company_email: "",
                company_phone: "",
                tax_id: "",
                default_currency: "INR",
                invoice_prefix: "INV",
                invoice_footer: "",
                payment_terms_days: 30,
                auto_generate_invoices: true,
                send_invoice_emails: true,
                stripe_enabled: true,
                razorpay_enabled: false,
                paypal_enabled: false,
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!config) return;
        setSaving(true);
        try {
            if (config.id) {
                await api.put(`/subscriptions/billing-config/${config.id}/`, config);
            } else {
                const newConfig = await api.post("/subscriptions/billing-config/", config);
                setConfig(newConfig);
            }
            toast.success("Billing configuration saved");
        } catch (error) {
            toast.error("Failed to save configuration");
        } finally {
            setSaving(false);
        }
    };

    const updateConfig = (field: keyof BillingConfig, value: any) => {
        setConfig(prev => prev ? { ...prev, [field]: value } : prev);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Billing Configuration</h1>
                    <p className="text-muted-foreground">Configure company info, invoices, and payment gateways</p>
                </div>
                <Button onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Save Changes
                </Button>
            </div>

            <Tabs defaultValue="company">
                <TabsList>
                    <TabsTrigger value="company">
                        <Building className="h-4 w-4 mr-2" /> Company Info
                    </TabsTrigger>
                    <TabsTrigger value="invoices">
                        <FileText className="h-4 w-4 mr-2" /> Invoices
                    </TabsTrigger>
                    <TabsTrigger value="payments">
                        <CreditCard className="h-4 w-4 mr-2" /> Payment Gateways
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="company" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Company Information</CardTitle>
                            <CardDescription>Details shown on invoices and receipts</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Company Name</Label>
                                    <Input
                                        value={config?.company_name || ""}
                                        onChange={(e) => updateConfig("company_name", e.target.value)}
                                        placeholder="NinjaPDF Inc."
                                    />
                                </div>
                                <div>
                                    <Label>Tax ID / VAT Number</Label>
                                    <Input
                                        value={config?.tax_id || ""}
                                        onChange={(e) => updateConfig("tax_id", e.target.value)}
                                        placeholder="XX-XXXXXXX"
                                    />
                                </div>
                            </div>
                            <div>
                                <Label>Company Address</Label>
                                <Textarea
                                    value={config?.company_address || ""}
                                    onChange={(e) => updateConfig("company_address", e.target.value)}
                                    placeholder="123 Business Street, City, Country"
                                    rows={3}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Email</Label>
                                    <Input
                                        type="email"
                                        value={config?.company_email || ""}
                                        onChange={(e) => updateConfig("company_email", e.target.value)}
                                        placeholder="billing@ninjapdf.com"
                                    />
                                </div>
                                <div>
                                    <Label>Phone</Label>
                                    <Input
                                        value={config?.company_phone || ""}
                                        onChange={(e) => updateConfig("company_phone", e.target.value)}
                                        placeholder="+1 234 567 8900"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="invoices" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Invoice Settings</CardTitle>
                            <CardDescription>Configure how invoices are generated and sent</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <Label>Invoice Prefix</Label>
                                    <Input
                                        value={config?.invoice_prefix || ""}
                                        onChange={(e) => updateConfig("invoice_prefix", e.target.value)}
                                        placeholder="INV"
                                    />
                                </div>
                                <div>
                                    <Label>Default Currency</Label>
                                    <Select
                                        value={config?.default_currency || "INR"}
                                        onValueChange={(v) => updateConfig("default_currency", v)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                                            <SelectItem value="USD">USD - US Dollar</SelectItem>
                                            <SelectItem value="EUR">EUR - Euro</SelectItem>
                                            <SelectItem value="GBP">GBP - British Pound</SelectItem>
                                            <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                                            <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Payment Terms (days)</Label>
                                    <Input
                                        type="number"
                                        value={config?.payment_terms_days || 30}
                                        onChange={(e) => updateConfig("payment_terms_days", parseInt(e.target.value))}
                                    />
                                </div>
                            </div>
                            <div>
                                <Label>Invoice Footer Text</Label>
                                <Textarea
                                    value={config?.invoice_footer || ""}
                                    onChange={(e) => updateConfig("invoice_footer", e.target.value)}
                                    placeholder="Thank you for your business!"
                                    rows={2}
                                />
                            </div>
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label>Auto-generate Invoices</Label>
                                        <p className="text-sm text-muted-foreground">Automatically create invoices for subscriptions</p>
                                    </div>
                                    <Switch
                                        checked={config?.auto_generate_invoices || false}
                                        onCheckedChange={(c) => updateConfig("auto_generate_invoices", c)}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label>Send Invoice Emails</Label>
                                        <p className="text-sm text-muted-foreground">Email invoices to customers automatically</p>
                                    </div>
                                    <Switch
                                        checked={config?.send_invoice_emails || false}
                                        onCheckedChange={(c) => updateConfig("send_invoice_emails", c)}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="payments" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Payment Gateways</CardTitle>
                            <CardDescription>Enable or disable payment providers</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                        <span className="text-2xl font-bold text-purple-600">S</span>
                                    </div>
                                    <div>
                                        <h3 className="font-medium">Stripe</h3>
                                        <p className="text-sm text-muted-foreground">Credit cards, Apple Pay, Google Pay</p>
                                    </div>
                                </div>
                                <Switch
                                    checked={config?.stripe_enabled || false}
                                    onCheckedChange={(c) => updateConfig("stripe_enabled", c)}
                                />
                            </div>

                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                        <span className="text-2xl font-bold text-blue-600">R</span>
                                    </div>
                                    <div>
                                        <h3 className="font-medium">Razorpay</h3>
                                        <p className="text-sm text-muted-foreground">UPI, Netbanking, Cards (India)</p>
                                    </div>
                                </div>
                                <Switch
                                    checked={config?.razorpay_enabled || false}
                                    onCheckedChange={(c) => updateConfig("razorpay_enabled", c)}
                                />
                            </div>

                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                                        <span className="text-2xl font-bold text-yellow-600">P</span>
                                    </div>
                                    <div>
                                        <h3 className="font-medium">PayPal</h3>
                                        <p className="text-sm text-muted-foreground">PayPal balance, cards</p>
                                    </div>
                                </div>
                                <Switch
                                    checked={config?.paypal_enabled || false}
                                    onCheckedChange={(c) => updateConfig("paypal_enabled", c)}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
