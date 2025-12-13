"use client";

import { Sidebar } from "@/app/components/dashboard/Sidebar";
import { Toaster } from "sonner";
import { useAuth } from "@/app/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export default function UserDashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.replace('/login');
            } else {
                setAuthorized(true);
            }
        }
    }, [user, loading, router]);

    if (loading || !authorized) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-muted/20">
            <Sidebar />
            <main className="flex-1 p-8 overflow-y-auto h-screen">
                <div className="max-w-6xl mx-auto space-y-8 pb-20">
                    {children}
                </div>
                <Toaster />
            </main>
        </div>
    );
}

