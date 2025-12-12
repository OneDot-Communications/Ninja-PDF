"use client";
import { Settings } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";

export default function AdminSettingsPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                    <Settings className="w-6 h-6" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Settings</h1>
            </div>

            <div className="max-w-xl space-y-6 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="space-y-2">
                    <Label>Platform Name</Label>
                    <Input defaultValue="18+ PDF" />
                </div>
                <div className="space-y-2">
                    <Label>Support Email</Label>
                    <Input defaultValue="support@18pluspdf.com" />
                </div>
                <Button>Save Changes</Button>
            </div>
        </div>
    );
}
