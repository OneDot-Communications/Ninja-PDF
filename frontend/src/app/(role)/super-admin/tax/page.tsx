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
import { Loader2, Plus, Pencil, Trash2, Percent, Globe } from "lucide-react";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface TaxRule {
    id: number;
    country_code: string;
    region_code: string;
    tax_name: string;
    tax_rate: number;
    tax_type: string;
    is_active: boolean;
}

interface TaxExemption {
    id: number;
    user_email: string;
    business_name: string;
    tax_id: string;
    exemption_type: string;
    status: string;
    verified_at: string | null;
}

export default function TaxManagementPage() {
    const [taxRules, setTaxRules] = useState<TaxRule[]>([]);
    const [exemptions, setExemptions] = useState<TaxExemption[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);
    const [isExemptionDialogOpen, setIsExemptionDialogOpen] = useState(false);
    const [editingRule, setEditingRule] = useState<TaxRule | null>(null);
    const [ruleForm, setRuleForm] = useState({
        country_code: "",
        region_code: "",
        tax_name: "",
        tax_rate: "",
        tax_type: "VAT",
        is_active: true
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [rulesRes, exemptionsRes] = await Promise.all([
                api.get("/subscriptions/tax-rules/"),
                api.get("/subscriptions/tax-exemptions/")
            ]);
            setTaxRules(rulesRes?.results || rulesRes || []);
            setExemptions(exemptionsRes?.results || exemptionsRes || []);
        } catch (error) {
            toast.error("Failed to load tax data");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveRule = async () => {
        try {
            const data = {
                ...ruleForm,
                tax_rate: parseFloat(ruleForm.tax_rate)
            };

            if (editingRule) {
                await api.put(`/subscriptions/tax-rules/${editingRule.id}/`, data);
                toast.success("Tax rule updated");
            } else {
                await api.post("/subscriptions/tax-rules/", data);
                toast.success("Tax rule created");
            }
            setIsRuleDialogOpen(false);
            setEditingRule(null);
            setRuleForm({ country_code: "", region_code: "", tax_name: "", tax_rate: "", tax_type: "VAT", is_active: true });
            loadData();
        } catch (error) {
            toast.error("Failed to save tax rule");
        }
    };

    const handleDeleteRule = async (id: number) => {
        if (!confirm("Delete this tax rule?")) return;
        try {
            await api.delete(`/subscriptions/tax-rules/${id}/`);
            toast.success("Tax rule deleted");
            loadData();
        } catch (error) {
            toast.error("Failed to delete tax rule");
        }
    };

    const handleVerifyExemption = async (id: number) => {
        try {
            await api.post(`/subscriptions/tax-exemptions/${id}/verify/`);
            toast.success("Exemption verified");
            loadData();
        } catch (error) {
            toast.error("Failed to verify exemption");
        }
    };

    const handleRejectExemption = async (id: number) => {
        try {
            await api.post(`/subscriptions/tax-exemptions/${id}/reject/`);
            toast.success("Exemption rejected");
            loadData();
        } catch (error) {
            toast.error("Failed to reject exemption");
        }
    };

    const openEditRule = (rule: TaxRule) => {
        setEditingRule(rule);
        setRuleForm({
            country_code: rule.country_code,
            region_code: rule.region_code || "",
            tax_name: rule.tax_name,
            tax_rate: rule.tax_rate.toString(),
            tax_type: rule.tax_type,
            is_active: rule.is_active
        });
        setIsRuleDialogOpen(true);
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Tax Management</h1>
                    <p className="text-muted-foreground">Configure tax rates and manage exemptions</p>
                </div>
            </div>

            <Tabs defaultValue="rules">
                <TabsList>
                    <TabsTrigger value="rules">Tax Rules</TabsTrigger>
                    <TabsTrigger value="exemptions">Exemptions</TabsTrigger>
                </TabsList>

                <TabsContent value="rules" className="space-y-4">
                    <div className="flex justify-end">
                        <Button onClick={() => { setEditingRule(null); setIsRuleDialogOpen(true); }}>
                            <Plus className="h-4 w-4 mr-2" /> Add Tax Rule
                        </Button>
                    </div>

                    <Card>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Country</TableHead>
                                        <TableHead>Region</TableHead>
                                        <TableHead>Tax Name</TableHead>
                                        <TableHead>Rate</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-8">
                                                <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                            </TableCell>
                                        </TableRow>
                                    ) : taxRules.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                                No tax rules configured
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        taxRules.map((rule) => (
                                            <TableRow key={rule.id}>
                                                <TableCell className="font-medium">{rule.country_code}</TableCell>
                                                <TableCell>{rule.region_code || "-"}</TableCell>
                                                <TableCell>{rule.tax_name}</TableCell>
                                                <TableCell>{rule.tax_rate}%</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{rule.tax_type}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={rule.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>
                                                        {rule.is_active ? "Active" : "Inactive"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex gap-2 justify-end">
                                                        <Button variant="ghost" size="icon" onClick={() => openEditRule(rule)}>
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteRule(rule.id)}>
                                                            <Trash2 className="h-4 w-4 text-red-500" />
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
                </TabsContent>

                <TabsContent value="exemptions" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Tax Exemption Requests</CardTitle>
                            <CardDescription>Review and verify business tax exemption applications</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>User</TableHead>
                                        <TableHead>Business</TableHead>
                                        <TableHead>Tax ID</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Status</TableHead>
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
                                    ) : exemptions.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                No exemption requests
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        exemptions.map((ex) => (
                                            <TableRow key={ex.id}>
                                                <TableCell>{ex.user_email}</TableCell>
                                                <TableCell className="font-medium">{ex.business_name}</TableCell>
                                                <TableCell>{ex.tax_id}</TableCell>
                                                <TableCell>{ex.exemption_type}</TableCell>
                                                <TableCell>
                                                    <Badge className={
                                                        ex.status === 'VERIFIED' ? "bg-green-100 text-green-700" :
                                                            ex.status === 'REJECTED' ? "bg-red-100 text-red-700" :
                                                                "bg-yellow-100 text-yellow-700"
                                                    }>
                                                        {ex.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {ex.status === 'PENDING' && (
                                                        <div className="flex gap-2 justify-end">
                                                            <Button size="sm" onClick={() => handleVerifyExemption(ex.id)}>
                                                                Verify
                                                            </Button>
                                                            <Button variant="destructive" size="sm" onClick={() => handleRejectExemption(ex.id)}>
                                                                Reject
                                                            </Button>
                                                        </div>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Tax Rule Dialog */}
            <Dialog open={isRuleDialogOpen} onOpenChange={setIsRuleDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingRule ? "Edit Tax Rule" : "Add Tax Rule"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Country Code</Label>
                                <Input
                                    placeholder="US, GB, IN..."
                                    value={ruleForm.country_code}
                                    onChange={(e) => setRuleForm(f => ({ ...f, country_code: e.target.value.toUpperCase() }))}
                                />
                            </div>
                            <div>
                                <Label>Region Code (optional)</Label>
                                <Input
                                    placeholder="CA, NY..."
                                    value={ruleForm.region_code}
                                    onChange={(e) => setRuleForm(f => ({ ...f, region_code: e.target.value.toUpperCase() }))}
                                />
                            </div>
                        </div>
                        <div>
                            <Label>Tax Name</Label>
                            <Input
                                placeholder="VAT, GST, Sales Tax..."
                                value={ruleForm.tax_name}
                                onChange={(e) => setRuleForm(f => ({ ...f, tax_name: e.target.value }))}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Tax Rate (%)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="18.00"
                                    value={ruleForm.tax_rate}
                                    onChange={(e) => setRuleForm(f => ({ ...f, tax_rate: e.target.value }))}
                                />
                            </div>
                            <div>
                                <Label>Tax Type</Label>
                                <Select value={ruleForm.tax_type} onValueChange={(v) => setRuleForm(f => ({ ...f, tax_type: v }))}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="VAT">VAT</SelectItem>
                                        <SelectItem value="GST">GST</SelectItem>
                                        <SelectItem value="SALES_TAX">Sales Tax</SelectItem>
                                        <SelectItem value="OTHER">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch
                                checked={ruleForm.is_active}
                                onCheckedChange={(c) => setRuleForm(f => ({ ...f, is_active: c }))}
                            />
                            <Label>Active</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRuleDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveRule}>{editingRule ? "Update" : "Create"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
