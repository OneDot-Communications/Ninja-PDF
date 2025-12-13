"use client";
import { CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";

export default function AdminSubscriptionsPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                    <CreditCard className="w-6 h-6" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Subscriptions</h1>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle>Plans Overview</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-slate-500">Manage pricing tiers and features here.</p>
                        <div className="mt-4 p-4 bg-slate-50 rounded border border-dashed border-slate-300 text-center text-sm text-slate-400">
                            Subscription management list coming soon.
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
