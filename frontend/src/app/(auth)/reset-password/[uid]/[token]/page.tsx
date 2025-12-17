"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/app/lib/api";
import { Button } from "@/app/components/ui/button";
import { Label } from "@/app/components/ui/label";

const ResetPasswordPage = () => {
    const router = useRouter();
    const params = useParams();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const uid = params?.uid as string;
        const token = params?.token as string;

        if (!uid || !token) {
            setStatus('error');
            setMessage("Invalid reset link.");
            return;
        }

        if (password !== confirmPassword) {
            setStatus('error');
            setMessage("Passwords do not match.");
            return;
        }

        setStatus('loading');
        setMessage("");
        try {
            await api.resetPasswordConfirm(uid, token, password, confirmPassword);
            setStatus('success');
            setMessage("Password reset successfully! You can now login with your new password.");
            setTimeout(() => router.push('/login'), 3000);
        } catch (err: any) {
            setStatus('error');
            setMessage(err.message || "Failed to reset password. The link may be expired.");
        }
    };

    if (status === 'success') {
        return (
            <div className="py-12">
                <div className="mx-auto max-w-md px-4 text-center">
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full bg-white dark:bg-gray-800 p-8 rounded-lg shadow-sm border border-slate-200 dark:border-gray-700">
                        <div className="mb-4 flex justify-center">
                            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Password Reset</h2>
                        <p className="text-slate-600 dark:text-slate-300 mb-6">
                            {message}
                        </p>
                        <Button className="w-full bg-[#E53935] hover:bg-[#D32F2F] text-white" onClick={() => router.push('/login')}>
                            Go to Login
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
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Set New Password</h1>
                        <p className="text-slate-500 dark:text-slate-300">Enter your new password below.</p>
                    </div>

                    {status === 'error' && (
                        <div className="mb-4 rounded bg-red-100 p-2 text-red-700 dark:bg-red-900 dark:text-red-200">{message}</div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="password">New Password</Label>
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
                            {status === 'loading' ? "Resetting..." : "Reset Password"}
                        </Button>
                    </form>
                </motion.div>
            </div>
        </div>
    );
};

export default ResetPasswordPage;
