"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Label } from "@/app/components/ui/label";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { Switch } from "@/app/components/ui/switch";
import { toast } from "sonner";

export default function SignatureSettingsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Signature Settings</h1>
                <p className="text-muted-foreground">Configure your e-signature preferences.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>General Preferences</CardTitle>
                    <CardDescription>Manage how you send and receive signatures.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>Email Notifications</Label>
                            <p className="text-sm text-muted-foreground">Receive emails when documents are viewed or signed.</p>
                        </div>
                        <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>Auto-Reminders</Label>
                            <p className="text-sm text-muted-foreground">Automatically remind signers after 3 days.</p>
                        </div>
                        <Switch />
                    </div>
                    <div className="space-y-2">
                        <Label>Default Signature Title</Label>
                        <Input placeholder="e.g. Please sign this document" />
                    </div>
                    <Button onClick={() => toast.success("Settings saved")}>Save Changes</Button>
                </CardContent>
            </Card>
        </div>
    );
}
