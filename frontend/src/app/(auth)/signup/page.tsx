// frontend/app/(auth)/signup/page.tsx

"use client";

import React, { useState, Suspense } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import GoogleLoginButton from "@/components/ui/GoogleLoginButton";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { api } from "@/lib/services/api";
import { Eye, EyeOff } from "lucide-react";
import Image from "next/image";

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
    const [rememberMe, setRememberMe] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
        <div className="w-full">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full">
                {/* Sign Up Link (Top Right) */}
                <div className="text-right mb-6">
                    <span className="text-[#000000] font-['Poppins',sans-serif] text-base">
                        Have an Account ?{" "}
                    </span>
                    <Link href="/login" className="text-[#000000] font-['Poppins',sans-serif] text-base font-semibold hover:underline">
                        Sign in
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
                        <span className="font-normal">Hey Tourist,</span>
                        <br />
                        <span className="font-normal">Come on!</span>
                    </p>
                </div>

                {/* Sign up title */}
                <h1 className="text-[32px] leading-[48px] font-medium text-[rgba(0,0,0,0.71)] font-['Poppins',sans-serif] mb-8">
                    Sign up
                </h1>

                {referralCode && (
                    <div className="mb-4 p-2 bg-green-50 text-green-700 text-sm rounded border border-green-200">
                        🎉 Referral code applied!
                    </div>
                )}

                {error && (
                    <div className="mb-4 rounded-lg bg-red-50 p-3 text-red-700 text-sm">{error}</div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Username / Email Row */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[16px] leading-[24px] text-[#000000] font-['Poppins',sans-serif] mb-2">
                                Enter your username or email address
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    required
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    placeholder="Username or email address"
                                    className="w-full h-[49px] bg-white border border-[#01b0f1] rounded-[9px] px-4 text-[14px] text-gray-800 placeholder:text-[#808080] placeholder:font-light placeholder:font-['Poppins',sans-serif] focus:outline-none focus:ring-2 focus:ring-[#01b0f1]/30 transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Last Name */}
                    <div>
                        <label className="block text-[16px] leading-[24px] text-[#000000] font-['Poppins',sans-serif] mb-2">
                            Enter your Last Name
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                required
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                placeholder="Last Name"
                                className="w-full h-[49px] bg-white border border-[#01b0f1] rounded-[9px] px-4 text-[14px] text-gray-800 placeholder:text-[#808080] placeholder:font-light placeholder:font-['Poppins',sans-serif] focus:outline-none focus:ring-2 focus:ring-[#01b0f1]/30 transition-all"
                            />
                        </div>
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-[16px] leading-[24px] text-[#000000] font-['Poppins',sans-serif] mb-2">
                            Enter your Email
                        </label>
                        <div className="relative">
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Email Address"
                                className="w-full h-[49px] bg-white border border-[#01b0f1] rounded-[9px] px-4 text-[14px] text-gray-800 placeholder:text-[#808080] placeholder:font-light placeholder:font-['Poppins',sans-serif] focus:outline-none focus:ring-2 focus:ring-[#01b0f1]/30 transition-all"
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block text-[16px] leading-[24px] text-[#000000] font-['Poppins',sans-serif] mb-2">
                            Enter your Password
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                required
                                minLength={8}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Password"
                                className="w-full h-[49px] bg-white border border-[#01b0f1] rounded-[9px] px-4 pr-12 text-[14px] text-gray-800 placeholder:text-[#808080] placeholder:font-light placeholder:font-['Poppins',sans-serif] focus:outline-none focus:ring-2 focus:ring-[#01b0f1]/30 transition-all"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8E8E8E] hover:text-gray-600 transition-colors"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <label className="block text-[16px] leading-[24px] text-[#000000] font-['Poppins',sans-serif] mb-2">
                            Confirm your Password
                        </label>
                        <div className="relative">
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                required
                                minLength={8}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Password"
                                className="w-full h-[49px] bg-white border border-[#01b0f1] rounded-[9px] px-4 pr-12 text-[14px] text-gray-800 placeholder:text-[#808080] placeholder:font-light placeholder:font-['Poppins',sans-serif] focus:outline-none focus:ring-2 focus:ring-[#01b0f1]/30 transition-all"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8E8E8E] hover:text-gray-600 transition-colors"
                            >
                                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {/* Remember Me Checkbox */}
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="remember"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="w-[17px] h-[17px] border border-[#CFD9E0] rounded cursor-pointer accent-[#01b0f1]"
                        />
                        <label htmlFor="remember" className="text-[13px] leading-[39px] text-[#718096] font-['Poppins',sans-serif] cursor-pointer">
                            Remember me
                        </label>
                    </div>

                    {/* Sign Up Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-[50px] bg-[#226db4] hover:bg-[#1a5a9a] text-white rounded-[10px] font-medium text-[16px] font-['Poppins',sans-serif] transition-all shadow-[0px_4px_19px_rgba(119,147,65,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Signing up..." : "Sign up"}
                    </button>
                </form>

                {/* Google Sign Up Button */}
                <div className="mt-4">
                    <GoogleLoginButton />
                </div>
            </motion.div>
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
