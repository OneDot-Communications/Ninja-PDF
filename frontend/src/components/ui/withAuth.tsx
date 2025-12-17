// frontend/app/components/ui/withAuth.tsx

"use client";

import React, { useEffect, ComponentType } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";

/**
 * Higher-order component that redirects unauthenticated users to /login.
 * Usage: export default withAuth(MyProtectedPage);
 */
export function withAuth<P extends object>(WrappedComponent: ComponentType<P>) {
    const WithAuthComponent = (props: P) => {
        const router = useRouter();
        const { user, loading } = useAuth();

        useEffect(() => {
            if (!loading && !user) {
                router.push("/login");
            }
        }, [loading, user, router]);

        if (loading) {
            return (
                <div className="flex items-center justify-center min-h-screen bg-gray-900">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
                </div>
            );
        }

        if (!user) {
            return null; // Will redirect
        }

        return <WrappedComponent {...props} />;
    };

    WithAuthComponent.displayName = `withAuth(${WrappedComponent.displayName || WrappedComponent.name || "Component"})`;

    return WithAuthComponent;
}

export default withAuth;
