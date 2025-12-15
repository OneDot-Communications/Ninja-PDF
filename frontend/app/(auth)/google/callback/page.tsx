"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";

const GoogleCallbackContent = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { googleLogin } = useAuth();
    const [status, setStatus] = useState("Authenticating...");

    useEffect(() => {
        const code = searchParams.get("code");
        const error = searchParams.get("error");

        if (error) {
            setStatus("Authentication failed. Please try again.");
            setTimeout(() => router.push("/login"), 3000);
            return;
        }

        if (code) {
            handleGoogleLogin(code);
        } else {
            setStatus("No authentication code found.");
            setTimeout(() => router.push("/login"), 3000);
        }
    }, [searchParams]);

    const handleGoogleLogin = async (code: string) => {
        try {
            await googleLogin(code);
            router.push("/"); // Redirect to dashboard on success
        } catch (err) {
            console.error("Google login error:", err);
            setStatus("Login failed. Please try again.");
            setTimeout(() => router.push("/login"), 3000);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="text-center">
                <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent mx-auto"></div>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">{status}</h2>
            </div>
        </div>
    );
};

const GoogleCallbackPage = () => {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-center">
                    <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent mx-auto"></div>
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Loading...</h2>
                </div>
            </div>
        }>
            <GoogleCallbackContent />
        </Suspense>
    );
};

export default GoogleCallbackPage;
