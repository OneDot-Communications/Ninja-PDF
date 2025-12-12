// frontend/app/(auth)/verify-otp/page.tsx

"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { Button } from "@/app/components/ui/button";
import { Label } from "@/app/components/ui/label";

const VerifyOtpPage = () => {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const { verifyOtp } = useAuth();
    const [otp, setOtp] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        // Read query params on client only (avoid using next/navigation hooks that require suspense)
        try {
            const params = new URLSearchParams(window.location.search);
            const e = params.get("email") || "";
            setEmail(e);
            if (!e) {
                router.push("/auth/signup");
            }
        } catch (err) {
            // If something goes wrong, redirect to signup as a safe fallback
            router.push("/auth/signup");
        }
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            await verifyOtp(email, otp);
            // After successful verification, redirect to login (user is now verified)
            router.push("/login");
        } catch (err: any) {
            setError(err.message || "Verification failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="py-12">
            <div className="mx-auto max-w-md px-4">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Verify Your Email</h1>
                        <p className="text-slate-500 dark:text-slate-300">Enter the OTP sent to your email.</p>
                    </div>
                    {error && (
                        <div className="mb-4 rounded bg-red-100 p-2 text-red-700 dark:bg-red-900 dark:text-red-200">
                            {error}
                        </div>
                    )}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="otp">OTP Code</Label>
                            <input
                                type="text"
                                id="otp"
                                required
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#01B0F1] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            />
                        </div>
                        <Button className="w-full bg-[#E53935] hover:bg-[#D32F2F] text-white font-semibold h-10 rounded-md" type="submit">
                            {loading ? "Verifying..." : "Verify OTP"}
                        </Button>
                    </form>
                    <p className="mt-4 text-center text-sm text-slate-600 dark:text-gray-400">
                        Didn\'t receive the code?{' '}
                        <Link href="/signup" className="text-red-500 hover:underline font-semibold">Resend</Link>
                    </p>
                </motion.div>
            </div>
        </div>
    );
};

export default VerifyOtpPage;
