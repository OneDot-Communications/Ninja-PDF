"use client";
import { FileText } from "lucide-react";

export default function AdminContentPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                    <FileText className="w-6 h-6" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Content Management</h1>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
                <p className="text-slate-500">Manage blog posts, help center articles, and page content.</p>
                <p className="text-xs text-slate-400 mt-2">(CMS integration pending)</p>
            </div>
        </div>
    );
}
