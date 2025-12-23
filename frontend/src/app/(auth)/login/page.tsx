// frontend/app/(auth)/login/page.tsx

"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import GoogleLoginButton from "@/components/ui/GoogleLoginButton";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner"; // Import sonner
import { FaFacebook } from "react-icons/fa";

const LoginPage = () => {
    // ... (hooks)
    const router = useRouter();
    const { login, refreshUser, user } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [requires2fa, setRequires2fa] = useState(false);
    const [otpToken, setOtpToken] = useState('');
    const [failureCount, setFailureCount] = useState(0);
    const [cooldown, setCooldown] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);

    // Redirect if already logged in
    React.useEffect(() => {
        if (user) {
            router.replace('/');
        }
    }, [user, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const res: any = await login(email, password);
            if (res && res.requires_2fa) {
                setRequires2fa(true);
                setLoading(false);
                toast.info("Two-factor authentication required.");
                return;
            }
            // Refresh user and redirect - login already refreshes user
            toast.success("Welcome back!");
            router.push('/');
        } catch (err: any) {
            // Handle Email Not Verified (403 or 400 from AllAuth)
            if ((err.status === 403 || err.status === 400) &&
                (err.body?.error?.code === 'email_not_verified' ||
                    err.message?.toLowerCase().includes('verified') ||
                    JSON.stringify(err.body).toLowerCase().includes('verified'))) {

                const msg = "E-mail is not verified. ( verification link resent, verify )";
                setError(msg);
                toast.warning(msg);
            } else if (err.status === 423) {
                // Locked
                const msg = err.body?.error?.message || 'Account locked due to suspicious activity.';
                setError(msg);
                toast.error("Account Locked", { description: msg });
            } else {
                setError(err.message || "Login failed");
                toast.error("Login failed", { description: err.message || "Please check your credentials." });
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (cooldown && cooldown > Date.now()) {
            setError('Too many attempts. Please wait before retrying.');
            return;
        }
        setLoading(true);
        try {
            const res: any = await login(email, password, otpToken);
            if (res && res.requires_2fa) {
                setError('2FA verification failed');
                // increment failure count and apply cooldown if needed
                const fc = failureCount + 1;
                setFailureCount(fc);
                if (fc >= 5) {
                    const wait = Math.min(300, (fc - 4) * 30); // escalate to max 5 minutes
                    const until = Date.now() + wait * 1000;
                    setCooldown(until);
                    setTimeout(() => setCooldown(null), wait * 1000);
                }
                return;
            }
            router.push('/');
        } catch (err: any) {
            // Structured error parsing
            if (err && err.body && err.body.error && err.body.error.code === 'invalid_2fa') {
                setError(err.body.error.message || 'Invalid 2FA token');
                const fc = failureCount + 1;
                setFailureCount(fc);
                if (fc >= 5) {
                    const wait = Math.min(300, (fc - 4) * 30);
                    const until = Date.now() + wait * 1000;
                    setCooldown(until);
                    setTimeout(() => setCooldown(null), wait * 1000);
                }
            } else if (err && err.status === 423) {
                setError(err.body?.error?.message || 'Account locked due to suspicious activity. Contact support.');
            } else {
                setError(err.message || 'OTP verification failed');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="py-12">
            <div className="mx-auto max-w-md px-4">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="w-full"
                >
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Welcome Back</h1>
                        <p className="text-slate-500 dark:text-slate-300">Hey Honey Login In!</p>
                    </div>
                    {error && (
                        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-red-700 text-sm dark:bg-red-500/20 dark:border-red-500/50 dark:text-red-400">
                            {error}
                        </div>
                    )}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <input
                                type="email"
                                id="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#01B0F1] focus-visible:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                placeholder="you@example.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <Label htmlFor="password">Password</Label>
                                <Link href="/forgot-password" className="text-sm text-[#01B0F1] hover:underline font-medium">
                                    Forgot password?
                                </Link>
                            </div>
                            <input
                                type="password"
                                id="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#01B0F1] focus-visible:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                placeholder="••••••••"
                            />
                        </div>
                        <Button className="w-full bg-[#E53935] hover:bg-[#D32F2F] text-white font-semibold h-10 rounded-md mt-2" type="submit">
                            {loading ? "Signing in..." : "Sign In"}
                        </Button>
                    </form>

                    {requires2fa && (
                        <form onSubmit={handleSubmitOtp} className="mt-4 space-y-2">
                            <div className="mb-2 text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 p-2 rounded">Two-factor authentication is required for this account. Enter your authentication token below.</div>
                            {cooldown && (
                                <div className="mb-2 text-sm text-red-700 bg-red-50 border border-red-200 p-2 rounded">Too many attempts. Please wait {(Math.ceil(((cooldown || 0) - Date.now()) / 1000))}s before retrying.</div>
                            )}
                            <Label htmlFor="otp">Two-factor token</Label>
                            <input
                                id="otp"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={otpToken}
                                onChange={(e) => setOtpToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                                placeholder="123456"
                                maxLength={6}
                            />
                            <Button type="submit" className="w-full bg-[#E53935] hover:bg-[#D32F2F] text-white font-semibold h-10 rounded-md">
                                Verify 2FA
                            </Button>
                        </form>
                    )}

                    <div className="my-6 mb-6">
                        <div className="w-full">
                            <GoogleLoginButton />
                        </div>
                    </div>

                    <p className="mt-6 text-center text-sm text-gray-700 dark:text-gray-400">
                        Don&apos;t have an account?{" "}
                        <a href="/signup" className="text-indigo-400 hover:underline">
                            Sign up
                        </a>
                    </p>
                </motion.div>
            </div>
        </div>
    );
};

export default LoginPage;
