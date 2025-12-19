"use client";

import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/layout/header";
import { Toaster } from "sonner";
import { useAuth } from "@/lib/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export default function UserDashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
        if (!loading) {
            // Define protected routes that strictly require login
            const protectedPrefixes = ['/profile', '/files', '/settings', '/api-keys', '/dashboard', '/team', '/billing', '/trash'];
            const isProtected = protectedPrefixes.some(prefix => pathname?.startsWith(prefix));

            if (isProtected && !user) {
                // If trying to access a protected route without login, redirect
                router.replace('/login');
            } else {
                // Otherwise (public tool or logged in), allow access
                setAuthorized(true);
            }
        }
    }, [user, loading, router, pathname]);

    // Show loader ONLY if we are waiting for auth on a PROTECTED route
    // For public routes, we want to render immediately even if user is null
    const protectedPrefixes = ['/profile', '/files', '/settings', '/api-keys', '/dashboard', '/team', '/billing', '/trash'];
    const isProtected = pathname ? protectedPrefixes.some(prefix => pathname.startsWith(prefix)) : false;

    if (loading || (isProtected && !authorized)) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    // CRITICAL FIX: If this is a Tool Page (public), do NOT render the Dashboard Sidebar/Header.
    // The Tool Page itself uses 'ToolShell' which has its own Header/Footer.
    // If we include Sidebar/Header here, we get a "Page inside a Page" effect.
    if (!isProtected) {
        return <>{children}</>;
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

