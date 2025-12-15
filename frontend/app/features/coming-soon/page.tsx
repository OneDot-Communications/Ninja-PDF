"use client";

import { useSearchParams } from "next/navigation";
import { Button } from "@/app/components/ui/button";
import Link from "next/link";
import { Hammer } from "lucide-react";

export default function FeatureComingSoonPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center bg-slate-50">
            <div className="max-w-md space-y-6">
                <div className="mx-auto w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                    <Hammer className="w-10 h-10" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Under Construction</h1>
                    <p className="text-slate-500 mt-2">
                        This feature is currently being built by our team. Check back soon for updates!
                    </p>
                </div>
                <Link href="/dashboard">
                    <Button>Return to Dashboard</Button>
                </Link>
            </div>
        </div>
    );
}
