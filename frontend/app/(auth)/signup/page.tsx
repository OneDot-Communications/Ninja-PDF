// frontend/app/(auth)/signup/page.tsx

"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { Button } from "@/app/components/ui/button";
import { Label } from "@/app/components/ui/label";
import { FaFacebook } from "react-icons/fa";
import GoogleLoginButton from "@/app/components/ui/GoogleLoginButton";

const SignupPage = () => {
    const router = useRouter();
    const { signup, user } = useAuth();
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
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
            const res = await signup(email, password, firstName, lastName);
            // If backend couldn't send OTP (SMTP issue), inform the user instead of redirecting
            if (res && res.otp_sent === false) {
                setError("We couldn't send a verification email. Please try again later or contact support.");
            } else {
                // After successful signup, redirect to OTP verification page
                router.push(`/auth/verify-otp?email=${encodeURIComponent(email)}`);
            }
        } catch (err: any) {
            setError(err.message || "Signup failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="py-12">
            <div className="mx-auto max-w-md px-4">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Create Your Account</h1>
                        <p className="text-slate-500 dark:text-slate-300">Start your free account.</p>
                    </div>
                    <div className="flex gap-4 mb-6">
                        <Button variant="outline" className="w-full flex items-center gap-2 border-slate-200 text-slate-700 hover:bg-slate-50 h-10">
                            <FaFacebook className="text-[#1877F2]" /> Facebook
                        </Button>
                        <div className="w-full">
                            {/* Use the same Google button component as the login page */}
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

export default SignupPage;
