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
import Image from "next/image";

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
        <div className="w-full">
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="w-full"
            >
                    {/* Sign Up Link (Top Right) */}
                    <div className="text-right mb-6">
                        <span className="text-[#000000] font-['Poppins',sans-serif] text-base">
                            No Account ?{" "}
                        </span>
                        <Link href="/signup" className="text-[#000000] font-['Poppins',sans-serif] text-base font-semibold hover:underline">
                            Sign up
                        </Link>
                    </div>

                    {/* Logo */}
                    <div className="mb-6 flex justify-center">
                        <Image
                            src="/pages/auth/18+christmas_logo.png"
                            alt="Logo"
                            width={120}
                            height={60}
                            className="object-contain"
                        />
                    </div>

                    {/* Greeting */}
                    <div className="mb-8">
                        <p className="text-[#000000] font-['Poppins',sans-serif] text-xl mb-2 text-center">
                            <span className="font-normal">Hey Honey</span>
                            <br />
                            <span className="font-normal">Welcome back!</span>
                        </p>
                    </div>

                    {/* Sign in Title */}
                    <h1 className="text-[rgba(0,0,0,0.71)] text-left font-['Poppins',sans-serif] text-[32px] font-medium mb-8">
                        Sign in
                    </h1>

                    {error && (
                        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-red-700 text-sm">
                            {error}
                        </div>
                    )}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Email Field */}
                        <div className="space-y-2">
                            <label htmlFor="email" className="text-[#000000] font-['Poppins',sans-serif] text-base font-normal">
                                Enter your email address
                            </label>
                            <input
                                type="email"
                                id="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="bg-[#ffffff] rounded-[9px] border-solid border-[#01b0f1] border w-full h-[49px] px-5 text-[#000000] font-['Poppins',sans-serif] text-sm placeholder:text-[#808080] placeholder:font-['Poppins',sans-serif] placeholder:font-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#01b0f1] focus-visible:ring-offset-0"
                                placeholder="Email address"
                            />
                        </div>

                        {/* Password Field */}
                        <div className="space-y-2">
                            <label htmlFor="password" className="text-[#000000] font-['Poppins',sans-serif] text-base font-normal">
                                Enter your Password
                            </label>
                            <div className="relative">
                                <input
                                    type="password"
                                    id="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="bg-[#ffffff] rounded-[9px] border-solid border-[#01b0f1] border w-full h-[49px] px-5 text-[#000000] font-['Poppins',sans-serif] text-sm placeholder:text-[#808080] placeholder:font-['Poppins',sans-serif] placeholder:font-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#01b0f1] focus-visible:ring-offset-0"
                                    placeholder="Password"
                                />
                            </div>
                        </div>

                        {/* Remember Me & Forgot Password */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="remember"
                                    className="rounded border-[#cfd9e0] border w-4 h-4 text-[#01b0f1] focus:ring-[#01b0f1]"
                                />
                                <label htmlFor="remember" className="text-[#718096] font-['Poppins',sans-serif] text-[13px] font-normal">
                                    Remember me
                                </label>
                            </div>
                            <Link href="/forgot-password" className="text-[#226db4] font-['Poppins',sans-serif] text-[13px] font-normal hover:underline">
                                Forgot Password
                            </Link>
                        </div>

                        {/* Sign In Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-[#226db4] rounded-[10px] w-full h-[46.49px] shadow-[0px_4px_19px_0px_rgba(119,147,65,0.3)] text-[#ffffff] font-['Poppins',sans-serif] text-base font-medium hover:bg-[#1a5690] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? "Signing in..." : "Sign in"}
                        </button>
                    </form>

                    {requires2fa && (
                        <form onSubmit={handleSubmitOtp} className="mt-6 space-y-4">
                            <div className="mb-2 text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 p-3 rounded-lg">Two-factor authentication is required for this account. Enter your authentication token below.</div>
                            {cooldown && (
                                <div className="mb-2 text-sm text-red-700 bg-red-50 border border-red-200 p-3 rounded-lg">Too many attempts. Please wait {(Math.ceil(((cooldown || 0) - Date.now()) / 1000))}s before retrying.</div>
                            )}
                            <label htmlFor="otp" className="text-[#000000] font-['Poppins',sans-serif] text-base font-normal">Two-factor token</label>
                            <input
                                id="otp"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={otpToken}
                                onChange={(e) => setOtpToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                className="bg-[#ffffff] rounded-[9px] border-solid border-[#01b0f1] border w-full h-[49px] px-5 text-[#000000] font-['Poppins',sans-serif] text-sm placeholder:text-[#808080] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#01b0f1]"
                                placeholder="123456"
                                maxLength={6}
                            />
                            <button
                                type="submit"
                                className="bg-[#226db4] rounded-[10px] w-full h-[46.49px] shadow-[0px_4px_19px_0px_rgba(119,147,65,0.3)] text-[#ffffff] font-['Poppins',sans-serif] text-base font-medium hover:bg-[#1a5690] transition-colors"
                            >
                                Verify 2FA
                            </button>
                        </form>
                    )}

                    {/* Google Sign In Button */}
                    <div className="mt-6">
                        <GoogleLoginButton />
                    </div>
                </motion.div>
        </div>
    );
};

export default LoginPage;
