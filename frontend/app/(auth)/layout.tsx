"use client";

import { motion } from "framer-motion";
import { FaFilePdf, FaShieldHalved, FaRobot } from "react-icons/fa6";
import Link from "next/link"; // Import Link for the logo

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen w-full grid lg:grid-cols-2 bg-white overflow-hidden">
            {/* Left Column: Form Area */}
            <div className="flex flex-col items-center justify-center p-8 md:p-12 lg:p-16 relative">
                <div className="w-full max-w-md space-y-8 relative z-10">
                    {/* Logo for Mobile/Desktop (Visible here as per design) */}
                    <div className="text-center mb-8">
                        <Link href="/" className="inline-block hover:opacity-80 transition-opacity">
                            <span className="text-4xl font-bold font-caveat select-none">
                                <span className="text-[#FF0000]">18+</span>
                                <span className="text-slate-900"> PDF</span>
                            </span>
                        </Link>
                    </div>

                    {children}
                </div>
            </div>

            {/* Right Column: Brand Feature Showcase (Hidden on mobile) */}
            <div className="hidden lg:flex relative bg-slate-50 items-center justify-center p-16 overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#01B0F1_1px,transparent_1px)] [background-size:20px_20px]"></div>
                </div>

                <div className="relative z-10 max-w-lg text-center">
                    {/* Floating Icons Animation */}
                    <div className="relative w-64 h-64 mx-auto mb-12">
                        <motion.div
                            className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-20 bg-white rounded-2xl shadow-xl flex items-center justify-center text-red-500 z-20"
                            animate={{ y: [0, -10, 0] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        >
                            <FaFilePdf className="w-10 h-10" />
                        </motion.div>
                        <motion.div
                            className="absolute bottom-4 left-0 w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center text-blue-500"
                            animate={{ y: [0, 15, 0] }}
                            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                        >
                            <FaShieldHalved className="w-8 h-8" />
                        </motion.div>
                        <motion.div
                            className="absolute bottom-4 right-0 w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center text-purple-500"
                            animate={{ y: [0, 10, 0] }}
                            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                        >
                            <FaRobot className="w-8 h-8" />
                        </motion.div>
                        <motion.div
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl -z-10"
                        />
                    </div>

                    <h2 className="text-4xl font-bold font-caveat text-slate-900 mb-6">
                        Log in to your <br />
                        <span className="text-[#01B0F1]">Smart Workspace</span>
                    </h2>
                    <p className="text-slate-600 text-lg leading-relaxed">
                        Access your tools, manage documents, and get your work sorted in seconds.
                        One account, infinite possibilities.
                    </p>

                    <div className="mt-12 flex items-center justify-center gap-2 text-sm text-slate-400 font-medium">
                        <span>Trusted by Legends</span>
                        <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
                        <span>Since 2024</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
