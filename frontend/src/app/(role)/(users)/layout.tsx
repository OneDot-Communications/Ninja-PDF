"use client";

import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/layout/header";
import { Toaster } from "sonner";
import { useAuth } from "@/lib/context/AuthContext";
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
        <div className="flex flex-col min-h-screen bg-muted/20">
            {/* Header at the top, full width, sticky */}
            <Header />

            <div className="flex flex-1 relative">
                {/* Sidebar on the left, sticky below header */}
                {/* Header is h-16 (64px). We position sidebar top-16 and height calc(100vh - 4rem) */}
                <div className="hidden md:block w-64 fixed top-16 left-0 bottom-0 z-20">
                    <Sidebar />
                </div>

                {/* Main content on the right, offset by sidebar width */}
                <main className="flex-1 md:ml-64 p-8 overflow-y-auto">
                    <div className="max-w-6xl mx-auto space-y-8 pb-20">
                        {children}
                    </div>
                </main>
            </div>
            <Toaster />
        </div>
    );
}

