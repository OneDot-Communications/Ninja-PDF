"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Toaster } from "sonner";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { FaArrowLeft } from "react-icons/fa";

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const isSignup = pathname === '/signup';
    const isForgotPassword = pathname === '/forgot-password';
    const isResetPassword = pathname === '/reset-password';
    
    return (
        <div className="min-h-screen w-full bg-[#ffffff] overflow-hidden relative">
            <Toaster />
            
            {/* Back to Home - Top Left Corner */}
            <div className="absolute top-6 left-6 z-30">
                <Link href="/" className="inline-flex items-center gap-2 text-[#226db4] hover:text-[#1a5690] transition-colors font-['Poppins',sans-serif] text-sm font-medium">
                    <FaArrowLeft className="w-4 h-4" />
                    Back to Home
                </Link>
            </div>
            
            {/* Main Container */}
            <div className="flex flex-col lg:flex-row min-h-screen">
                {/* Left Section: Illustration and Text (Hidden on mobile) */}
                <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center px-16 py-20">
                    {/* Illustration */}
                    <div className="relative w-full max-w-[444px] h-[449px] mb-12">
                        <Image
                            src={isForgotPassword ? "/pages/auth/forgot password.png" : (isSignup ? "/pages/auth/signup.png" : "/pages/auth/login.png")}
                            alt={isForgotPassword ? "Forgot Password Illustration" : (isSignup ? "Signup Illustration" : "Login Illustration")}
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                    
                    {/* Text Below Illustration */}
                    <div className="absolute bottom-32 left-1/2 -translate-x-1/2 text-center">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className="space-y-2"
                        >
                            {isForgotPassword ? (
                                <>
                                    <h2 className="text-[40px] leading-[48px] font-bold text-[#0F172B] font-['Caveat',sans-serif]">
                                        Memory slipped,
                                    </h2>
                                    <h2 className="text-[40px] leading-[48px] font-bold text-[#226db4] font-['Caveat',sans-serif]">
                                        Get back in....!
                                    </h2>
                                </>
                            ) : pathname === '/reset-password' ? (
                                <>
                                    <h2 className="text-[40px] leading-[48px] font-bold text-[#0F172B] font-['Caveat',sans-serif]">
                                        This time,
                                    </h2>
                                    <h2 className="text-[40px] leading-[48px] font-bold text-[#226db4] font-['Caveat',sans-serif]">
                                        don't forget.....!
                                    </h2>
                                </>
                            ) : isSignup ? (
                                <>
                                    <h2 className="text-[40px] leading-[48px] font-bold text-[#0F172B] font-['Caveat',sans-serif]">
                                        Are you tourist?,
                                    </h2>
                                    <h2 className="text-[40px] leading-[48px] font-bold text-[#226db4] font-['Caveat',sans-serif]">
                                        Create account....!
                                    </h2>
                                </>
                            ) : (
                                <>
                                    <h2 className="text-[40px] leading-[48px] font-bold text-[#01B0F1] font-['Caveat',sans-serif]">
                                        No hand-holding,
                                    </h2>
                                    <h2 className="text-[40px] leading-[48px] font-bold text-[#226db4] font-['Caveat',sans-serif]">
                                        Come In...!
                                    </h2>
                                </>
                            )}
                        </motion.div>
                    </div>
                </div>

                {/* Right Section: Form Card */}
                <div className="flex-1 flex items-center justify-center px-4 py-8 lg:px-8 relative">
                    {/* Form Card */}
                    <div className="w-full max-w-[530px] relative z-10">

                        {/* Card Container */}
                        <div className="bg-[#ffffff] rounded-[40px] shadow-[0px_4px_35px_0px_rgba(0,0,0,0.08)] p-10 lg:p-14" style={{ opacity: 0.85 }}>
                            {children}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
