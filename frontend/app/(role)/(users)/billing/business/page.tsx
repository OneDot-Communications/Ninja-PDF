"use client";

import { useEffect, useState } from "react";
import { api } from "@/app/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function BusinessDetailsPage() {
    const [formData, setFormData] = useState({
        company_name: "",
        billing_address: "",
        tax_id: "",
        billing_email: "",
        phone_number: ""
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        api.getBusinessDetails()
            .then(data => setFormData(data))
            .catch(err => console.log("No business details yet")) // silent fail if empty
            .finally(() => setLoading(false));
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.updateBusinessDetails(formData);
            toast.success("Business details saved");
        } catch (error) {
            toast.error("Failed to save details");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-6 max-w-2xl">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Business Details</h1>
                <p className="text-muted-foreground mt-1">Manage your company information for invoices.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Company Information</CardTitle>
                    <CardDescription>This information will appear on your invoices.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Company Name</Label>
                        <Input
                            value={formData.company_name}
                            onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                            placeholder="Acme Corp"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Tax ID / VAT Number</Label>
                        <Input
                            value={formData.tax_id}
                            onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                            placeholder="US123456789"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Billing Address</Label>
                        <textarea
                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={formData.billing_address}
                            onChange={(e) => setFormData({ ...formData, billing_address: e.target.value })}
                            placeholder="123 Business Rd, Suite 100, City, Country"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Billing Email</Label>
                            <Input
                                type="email"
                                value={formData.billing_email}
                                onChange={(e) => setFormData({ ...formData, billing_email: e.target.value })}
                                placeholder="billing@acme.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Phone Number</Label>
                            <Input
                                value={formData.phone_number}
                                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                                placeholder="+1 234 567 8900"
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                        <Button onClick={handleSave} disabled={saving}>
                            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Save Changes
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
