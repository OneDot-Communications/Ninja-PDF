// frontend/app/(auth)/signup/page.tsx

"use client";

import React, { useState, Suspense } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import GoogleLoginButton from "@/app/components/ui/GoogleLoginButton";
import { Button } from "@/app/components/ui/button";
import { Label } from "@/app/components/ui/label";
import { toast } from "sonner";
import { api } from "@/app/lib/api";

const SignupContent = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { signup } = useAuth();

    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [referralCode, setReferralCode] = useState<string | null>(null);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    React.useEffect(() => {
        const ref = searchParams.get('ref');
        if (ref) setReferralCode(ref);
    }, [searchParams]);

    const handleResendEmail = async () => {
        try {
            await api.resendVerificationEmail(email);
            toast.success("Verification email resent!", { description: "Check your inbox (and spam folder)." });
        } catch (error) {
            console.error("Resend failed", error);
            toast.error("Failed to resend email", { description: "Please try again later." });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            setLoading(false);
            return;
        }

        try {
            await signup(email, password, confirmPassword, firstName, lastName, referralCode || undefined);
            setSuccess(true);
            toast.success("Account created successfully!");
        } catch (err: any) {
            const msg = err.body?.error?.message || err.message || "Signup failed";
            setError(msg);
            toast.error("Signup failed", { description: msg });
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="py-12">
                <div className="mx-auto max-w-md px-4 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full bg-white dark:bg-gray-800 p-8 rounded-lg shadow-sm border border-slate-200 dark:border-gray-700"
                    >
                        <div className="mb-4 flex justify-center">
                            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Check your email</h2>
                        <p className="text-slate-600 dark:text-slate-300 mb-6">
                            We've sent a verification link to <span className="font-semibold text-slate-900 dark:text-white">{email}</span>. Please click the link to activate your account.
                        </p>
                        <p className="text-sm text-slate-500 mb-6">
                            Didn't receive the email? <button onClick={handleResendEmail} className="text-indigo-600 hover:underline">Click to resend</button>
                        </p>
                        <Button variant="outline" className="w-full" onClick={() => router.push('/login')}>
                            Back to Login
                        </Button>
                    </motion.div>
                </div>
            </div>
        );
    }

    return (
        <div className="py-12">
            <div className="mx-auto max-w-md px-4">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Create Your Account</h1>
                        <p className="text-slate-500 dark:text-slate-300">Start your free account.</p>
                        {referralCode && (
                            <div className="mt-4 p-2 bg-green-50 text-green-700 text-sm rounded border border-green-200 inline-block px-4">
                                🎉 Referral code applied successfully!
                            </div>
                        )}
                    </div>
                    <div className="mb-6">
                        <div className="w-full">
                            <GoogleLoginButton />
                        </div>
                    </div>

                    <div className="relative mb-6">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-slate-200" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white px-2 text-slate-400">Or sign up with email</span>
                        </div>
                    </div>

                    {error && (
                        <div className="mb-4 rounded bg-red-100 p-2 text-red-700 dark:bg-red-900 dark:text-red-200">{error}</div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="first_name">First name</Label>
                            <input
                                id="first_name"
                                type="text"
                                required
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                placeholder="John"
                                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#01B0F1] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="last_name">Last name</Label>
                            <input
                                id="last_name"
                                type="text"
                                required
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                placeholder="Doe"
                                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#01B0F1] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <input
                                id="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="boss@example.com"
                                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#01B0F1] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <input
                                id="password"
                                type="password"
                                required
                                minLength={8}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#01B0F1] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm Password</Label>
                            <input
                                id="confirmPassword"
                                type="password"
                                required
                                minLength={8}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#01B0F1] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            />
                        </div>
                        <Button className="w-full bg-[#E53935] hover:bg-[#D32F2F] text-white font-semibold h-10 rounded-md mt-2" type="submit">
                            {loading ? "Signing up..." : "Sign Up"}
                        </Button>
                    </form>
                    <div className="text-center text-sm text-slate-600 mt-4">
                        Already have an account?{' '}
                        <Link href="/login" className="text-red-500 hover:underline font-semibold">Log in</Link>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

const SignupPage = () => {
    return (
        <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Loading...</div>}>
            <SignupContent />
        </Suspense>
    );
};

export default SignupPage;
