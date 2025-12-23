"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { api } from "@/lib/services/api";
import { useRouter } from "next/navigation";

const ForgotPasswordPage = () => {
    const [email, setEmail] = useState("");
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState("");
    const router = useRouter();

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
            <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="w-full"
            >
                    <div className="mb-8 flex justify-center">
                        <div className="h-16 w-16 rounded-full bg-[#226DB4]/10 flex items-center justify-center">
                            <svg className="w-8 h-8 text-[#226DB4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>
                    </div>
                    <h2 className="text-[32px] font-medium text-black/71 text-center mb-4 font-['Poppins']">Check your email</h2>
                    <p className="text-[#8D8D8D] text-center mb-8 font-['Poppins']">
                        We've sent a password reset link to <span className="font-semibold text-black/74">{email}</span>.
                    </p>
                    <button
                        onClick={() => router.push('/login')}
                        className="w-full h-[52px] bg-[#226DB4] hover:bg-[#1a5a99] text-white font-medium text-base rounded-[10px] shadow-[0px_4px_19px_rgba(119,147,65,0.3)] transition-colors font-['Poppins']"
                    >
                        Back to Login
                    </button>
                </motion.div>
        );
    }

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.4 }}
            className="w-full"
        >
                {/* Logo */}
                <Link href="/" className="block mb-6">
                    <img 
                        src="/pages/auth/18+logo.png" 
                        alt="Ninja PDF" 
                        className="h-[45px] w-[84px] object-cover"
                    />
                </Link>

                {/* Top section with greeting and sign up link */}
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <p className="text-[20px] font-bold text-black/74 font-['Poppins'] leading-[30px]">
                            Hey Bro,<br />Short memory!
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-[16px] text-[#8D8D8D] font-['Poppins'] leading-[24px]">
                            No Account ?<br />
                            <Link href="/signup" className="text-[#8D8D8D] hover:text-[#226DB4] transition-colors">
                                Sign up
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Main heading */}
                <h1 className="text-[32px] font-medium text-black/71 mb-12 font-['Poppins'] leading-[48px]">
                    Forget Password
                </h1>

                {/* Error message */}
                {status === 'error' && (
                    <div className="mb-4 rounded-[9px] bg-red-100 p-3 text-red-700 text-sm font-['Poppins']">
                        {message}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Email input */}
                    <div className="space-y-3">
                        <label htmlFor="email" className="block text-[16px] font-normal text-black font-['Poppins'] leading-[24px]">
                            Enter your username or email address
                        </label>
                        <input
                            id="email"
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Username or email address"
                            className="w-full h-[50px] px-5 bg-white border border-[#01B0F1] rounded-[9px] text-[14px] font-light text-[#808080] placeholder:text-[#808080] font-['Poppins'] focus:outline-none focus:ring-2 focus:ring-[#01B0F1]/30 transition-all"
                        />
                    </div>

                    {/* Submit button */}
                    <button
                        type="submit"
                        disabled={status === 'loading'}
                        className="w-full h-[52px] bg-[#226DB4] hover:bg-[#1a5a99] disabled:bg-[#226DB4]/60 text-white font-medium text-base rounded-[10px] shadow-[0px_4px_19px_rgba(119,147,65,0.3)] transition-colors font-['Poppins']"
                    >
                        {status === 'loading' ? 'Sending...' : 'Forget Password'}
                    </button>
                </form>

                {/* Back to Home button */}
                <button
                    onClick={() => router.push('/')}
                    className="w-full h-[49px] mt-4 bg-[rgba(150,139,254,0.21)] hover:bg-[rgba(150,139,254,0.3)] text-black/81 font-normal text-base rounded-[9px] transition-colors font-['Poppins']"
                >
                    Back to Home
                </button>
            </motion.div>
    );
};

export default ForgotPasswordPage;
