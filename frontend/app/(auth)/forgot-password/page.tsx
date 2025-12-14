"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { api } from "@/app/lib/api";
import { Button } from "@/app/components/ui/button";
import { Label } from "@/app/components/ui/label";

const ForgotPasswordPage = () => {
    const [email, setEmail] = useState("");
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');
        setMessage("");
        try {
            await api.requestPasswordReset(email);
            setStatus('success');
            setMessage("Password reset link sent! Please check your email inbox.");
        } catch (err: any) {
            setStatus('error');
            setMessage(err.message || "Failed to send reset link. Please try again.");
        }
    };

    if (status === 'success') {
        return (
            <div className="py-12">
                <div className="mx-auto max-w-md px-4 text-center">
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full bg-white dark:bg-gray-800 p-8 rounded-lg shadow-sm border border-slate-200 dark:border-gray-700">
                        <div className="mb-4 flex justify-center">
                            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Check your email</h2>
                        <p className="text-slate-600 dark:text-slate-300 mb-6">
                            We've sent a password reset link to <span className="font-semibold text-slate-900 dark:text-white">{email}</span>.
                        </p>
                        <Button variant="outline" className="w-full" asChild>
                            <Link href="/login">Back to Login</Link>
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
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Reset Password</h1>
                        <p className="text-slate-500 dark:text-slate-300">Enter your email to receive a reset link.</p>
                    </div>

                    {status === 'error' && (
                        <div className="mb-4 rounded bg-red-100 p-2 text-red-700 dark:bg-red-900 dark:text-red-200">{message}</div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <input
                                id="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#01B0F1] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            />
                        </div>
                        <Button className="w-full bg-[#E53935] hover:bg-[#D32F2F] text-white font-semibold h-10 rounded-md mt-2" type="submit">
                            {status === 'loading' ? "Sending..." : "Send Reset Link"}
                        </Button>
                    </form>
                    <div className="text-center text-sm text-slate-600 mt-4">
                        Remember your password?{' '}
                        <Link href="/login" className="text-indigo-600 hover:underline font-semibold">Log in</Link>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
