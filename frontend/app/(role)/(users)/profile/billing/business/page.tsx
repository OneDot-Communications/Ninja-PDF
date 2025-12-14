"use client";

import { useEffect, useState } from "react";
import { api } from "@/app/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Button } from "@/app/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;

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
                        <Label htmlFor="tax">Tax ID / VAT Number</Label>
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
