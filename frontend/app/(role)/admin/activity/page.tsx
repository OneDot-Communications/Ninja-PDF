"use client";
import { Activity } from "lucide-react";

export default function AdminActivityPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
                    <Activity className="w-6 h-6" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">System Activity</h1>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
                <p className="text-slate-500">Log of recent system events and user actions.</p>
                <p className="text-xs text-slate-400 mt-2">(Audit logs implementation pending)</p>
            </div>
        </div>
    );
}
