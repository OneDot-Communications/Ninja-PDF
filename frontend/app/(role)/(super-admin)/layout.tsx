"use client";

import { useAuth } from "@/app/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { SharedSidebar } from "@/app/components/dashboard/SharedSidebar";
import { Header } from "@/app/components/dashboard/Header";

export default function SuperAdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push("/login?redirect=/super-admin");
            } else if (user.role !== "SUPER_ADMIN") {
                router.push("/dashboard"); // or /403
            }
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
            </div>
        );
    }

    if (!user || user.role !== "SUPER_ADMIN") {
        return null; // Return null while redirecting
    }

    return (
        <div className="flex min-h-screen bg-slate-50">
            <SharedSidebar type="SUPER_ADMIN" className="w-72 hidden md:block fixed h-full z-20" />
            <main className="flex-1 md:ml-72 flex flex-col min-h-screen">
                <Header role="SUPER_ADMIN" />
                <div className="flex-1 p-8 overflow-y-auto">
                    <div className="max-w-7xl mx-auto space-y-8 pb-20">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}
