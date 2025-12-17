"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function BusinessDetailsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [details, setDetails] = useState({
        company_name: "",
        tax_id: "",
        billing_address: "",
        billing_email: ""
    });

    useEffect(() => {
        api.getBusinessDetails()
            .then(data => {
                if (data) setDetails({
                    company_name: data.company_name || "",
                    tax_id: data.tax_id || "",
                    billing_address: data.billing_address || "",
                    billing_email: data.billing_email || ""
                });
            })
            .catch(() => { }) // Silently fail if no details yet
            .finally(() => setLoading(false));
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.updateBusinessDetails(details);
            toast.success("Business details saved");
        } catch (error) {
            toast.error("Failed to save details");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Business Details</h1>
                    <p className="text-muted-foreground">These details will appear on your invoices.</p>
                </div>
                <div className="border rounded-lg p-6 space-y-4">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                    <Skeleton className="h-10 w-32 mt-4" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Business Details</h1>
                <p className="text-muted-foreground">These details will appear on your invoices.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Company Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="company">Company Name</Label>
                        <Input
                            id="company"
                            value={details.company_name}
                            onChange={(e) => setDetails({ ...details, company_name: e.target.value })}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="tax" className="flex items-center gap-2">
                            Tax ID / VAT Number
                            <div className="group relative">
                                <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                                <div className="absolute left-0 bottom-full mb-2 w-56 p-2 bg-slate-900 text-white text-xs rounded shadow-lg hidden group-hover:block z-50 pointer-events-none">
                                    Enter your country-specific Tax ID (e.g., GSTIN for India, VAT for EU).
                                </div>
                            </div>
                        </Label>
                        <Input
                            id="tax"
                            value={details.tax_id}
                            onChange={(e) => setDetails({ ...details, tax_id: e.target.value })}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="address">Billing Address</Label>
                        <Input
                            id="address"
                            value={details.billing_address}
                            onChange={(e) => setDetails({ ...details, billing_address: e.target.value })}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="email">Billing Email</Label>
                        <Input
                            id="email"
                            type="email"
                            value={details.billing_email}
                            onChange={(e) => setDetails({ ...details, billing_email: e.target.value })}
                        />
                    </div>
                    <Button onClick={handleSave} disabled={saving} className="mt-2">
                        {saving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                        Save Details
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
