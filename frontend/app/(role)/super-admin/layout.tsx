"use client";

import { useAuth } from "@/app/context/AuthContext";
import { SharedSidebar } from "@/app/components/dashboard/SharedSidebar";
import { Toaster } from "sonner";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.replace('/login');
            } else if (user.role !== 'SUPER_ADMIN') {
                router.replace('/login'); // Strict: Only Super Admins
            } else {
                setAuthorized(true);
            }
        }
    }, [user, loading, router]);

    if (loading || !authorized) {
        return (
            <div className="flex h-screen items-center justify-center bg-white">
                <Loader2 className="h-8 w-8 animate-spin text-red-600" />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-slate-50/50">
            <SharedSidebar type="SUPER_ADMIN" className="w-72 hidden md:block fixed h-full z-20" />
            <main className="flex-1 md:ml-72 p-8 overflow-y-auto h-screen">
                <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {children}
                </div>
                <Toaster />
            </main>
        </div>
    );
}
