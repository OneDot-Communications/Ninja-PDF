// frontend/app/(auth)/login/page.tsx

"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import GoogleLoginButton from "@/app/components/ui/GoogleLoginButton";
import { Button } from "@/app/components/ui/button";
import { Label } from "@/app/components/ui/label";
import { FaFacebook } from "react-icons/fa";

const LoginPage = () => {
    const router = useRouter();
    const { login, refreshUser, user } = useAuth();
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
            await login(email, password);
            // Ensure we have the latest user object
            const refreshed = await refreshUser();
            if (refreshed && (!refreshed.first_name || refreshed.first_name.trim() === '')) {
                router.push('/profile/complete');
            } else {
                router.push('/');
            }
        } catch (err: any) {
            setError(err.message || "Login failed");
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
                        <p className="text-slate-500 dark:text-slate-300">Please enter your details.</p>
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

                    <div className="my-6 flex gap-4 mb-6">
                        <Button variant="outline" className="w-full flex items-center gap-2 border-slate-200 text-slate-700 hover:bg-slate-50 h-10">
                            <FaFacebook className="text-[#1877F2]" /> Facebook
                        </Button>
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
