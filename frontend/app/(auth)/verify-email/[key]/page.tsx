"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { api } from "@/app/lib/api";
import { Button } from "@/app/components/ui/button";

const VerifyEmailPage = () => {
    const router = useRouter();
    const params = useParams();
    const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
    const [message, setMessage] = useState("Verifying your email...");

    useEffect(() => {
        const verify = async () => {
            const key = params?.key as string;
            if (!key) {
                setStatus('error');
                setMessage("Invalid verification link.");
                return;
            }

            try {
                await api.request("POST", "/api/auth/registration/verify-email/", { key });
                setStatus('success');
                setMessage("Email verified successfully!");
            } catch (error: any) {
                setStatus('error');
                setMessage(error.message || "Verification failed. The link may be expired.");
            }
        };

        verify();
    }, [params]);

    return (
        <div className="py-12">
            <div className="mx-auto max-w-md px-4 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full bg-white dark:bg-gray-800 p-8 rounded-lg shadow-sm border border-slate-200 dark:border-gray-700"
                >
                    <div className="mb-6 flex justify-center">
                        {status === 'verifying' && (
                            <div className="h-12 w-12 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
                        )}
                        {status === 'success' && (
                            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            </div>
                        )}
                        {status === 'error' && (
                            <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </div>
                        )}
                    </div>

                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                        {status === 'verifying' ? 'Verifying...' : status === 'success' ? 'Email Verified' : 'Verification Failed'}
                    </h2>

                    <p className="text-slate-600 dark:text-slate-300 mb-8">
                        {message}
                    </p>

                    {status === 'success' && (
                        <Button className="w-full bg-[#E53935] hover:bg-[#D32F2F] text-white" onClick={() => router.push('/login')}>
                            Continue to Login
                        </Button>
                    )}

                    {status === 'error' && (
                        <Button variant="outline" className="w-full" onClick={() => router.push('/login')}>
                            Back to Login
                        </Button>
                    )}
                </motion.div>
            </div>
        </div>
    );
};

export default VerifyEmailPage;
