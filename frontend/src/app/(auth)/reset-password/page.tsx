"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";

export default function ResetPasswordPage() {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full"
        >
            {/* Logo */}
            <div className="mb-[52px]">
                <Link href="/">
                    <img
                        src="/pages/auth/18+christmas_logo.png"
                        alt="Logo"
                        className="w-[84px] h-[45px] object-cover cursor-pointer"
                    />
                </Link>
            </div>

            {/* Heading */}
            <div className="mb-[57px]">
                <h1 className="text-[rgba(0,0,0,0.71)] font-['Poppins'] text-[32px] leading-[48px] font-medium mb-[21px]">
                    Reset Password
                </h1>
                <p className="text-[rgba(0,0,0,0.74)] font-['Poppins'] text-[20px] leading-[30px] font-bold">
                    Hey Genius, Store this in your Mind!
                </p>
            </div>

            {/* Form */}
            <div className="space-y-[25px]">
                {/* New Password Field */}
                <div className="relative">
                    <label className="text-[#000000] font-['Poppins'] text-base font-normal block mb-[6px]">
                        Enter your New Password
                    </label>
                    <div className="relative">
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="New Password"
                            className="w-full h-[49px] bg-white rounded-[9px] border border-[#01B0F1] px-[22px] text-[#808080] font-['Poppins'] text-sm font-light placeholder:text-[#808080] focus:outline-none focus:ring-1 focus:ring-[#01B0F1]"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8E8E8E] hover:text-[#226DB4] transition-colors"
                        >
                            {showPassword ? (
                                <FaEyeSlash className="w-[19px] h-[16px]" />
                            ) : (
                                <FaEye className="w-[19px] h-[16px]" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Confirm Password Field */}
                <div className="relative">
                    <label className="text-[#000000] font-['Poppins'] text-base font-normal block mb-[6px]">
                        Confirm your Password
                    </label>
                    <div className="relative">
                        <input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirm Password"
                            className="w-full h-[49px] bg-white rounded-[9px] border border-[#01B0F1] px-[22px] text-[#808080] font-['Poppins'] text-sm font-light placeholder:text-[#808080] focus:outline-none focus:ring-1 focus:ring-[#01B0F1]"
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8E8E8E] hover:text-[#226DB4] transition-colors"
                        >
                            {showConfirmPassword ? (
                                <FaEyeSlash className="w-[19px] h-[16px]" />
                            ) : (
                                <FaEye className="w-[19px] h-[16px]" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Reset Password Button */}
                <button
                    className="w-full h-[46.49px] bg-[#226DB4] rounded-[10px] text-white font-['Poppins'] text-base font-medium hover:bg-[#1a5a99] transition-colors mt-[30px]"
                    style={{ boxShadow: '0px 4px 19px rgba(119, 147, 65, 0.3)' }}
                >
                    Reset Password
                </button>

                {/* Back to Home Button */}
                <Link href="/" className="block w-full">
                    <button
                        className="w-full h-[45.68px] bg-[rgba(150,139,254,0.21)] rounded-[9px] text-[rgba(0,0,0,0.81)] font-['Poppins'] text-base font-normal hover:bg-[rgba(150,139,254,0.3)] transition-colors mt-[18px]"
                    >
                        Back to Home
                    </button>
                </Link>
            </div>
        </motion.div>
    );
}
