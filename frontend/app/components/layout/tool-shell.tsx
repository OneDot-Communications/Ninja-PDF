"use client";

import { Header } from "./header";
import { Footer } from "./footer";
import { motion } from "framer-motion";
import { ScrollReveal } from "../ui/scroll-reveal";

interface ToolShellProps {
    title: string;
    description: string;
    children: React.ReactNode;
    variant?: "default" | "editor";
}

export function ToolShell({ title, description, children, variant = "default" }: ToolShellProps) {
    if (variant === "editor") {
        return (
            <div className="flex min-h-screen flex-col bg-slate-50">
                <Header />
                <main className="flex-1 flex flex-col relative">
                    {children}
                </main>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col bg-slate-50 selection:bg-[#714B67] selection:text-white">
            <Header />

            <main className="flex-1 relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 z-0 opacity-[0.03]"
                    style={{
                        backgroundImage: `radial-gradient(#714B67 1px, transparent 1px)`,
                        backgroundSize: '24px 24px'
                    }}
                />

                {/* Content Container */}
                <div className="container relative z-10 mx-auto px-4 md:px-6 py-12 md:py-20 max-w-5xl">

                    {/* Header Section */}
                    <div className="text-center mb-12 space-y-4">
                        <motion.h1
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 200, damping: 20 }}
                            className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight relative inline-block"
                        >
                            <span className="relative z-10">{title}</span>
                            <motion.div
                                className="absolute -bottom-2 left-0 w-full h-[0.4em] bg-[#FFC107] -z-10 opacity-50"
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: 1 }}
                                transition={{ duration: 0.8, delay: 0.6, ease: "circOut" }}
                                style={{ originX: 0 }}
                            />
                        </motion.h1>
                        <motion.p
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.1, duration: 0.5 }}
                            className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed"
                        >
                            {description}
                        </motion.p>
                    </div>

                    {/* Main Tool Card - Floating Animation */}
                    <div className="relative">
                        {/* Annotation Arrow & Text */}
                        <motion.div
                            initial={{ opacity: 0, x: 20, rotate: 10 }}
                            animate={{ opacity: 1, x: 0, rotate: 0 }}
                            transition={{ delay: 0.8, duration: 0.6, type: "spring" }}
                            className="absolute -top-12 -right-4 md:-right-12 z-20 hidden md:block pointer-events-none"
                        >
                            <div className="relative">
                                <svg
                                    className="w-16 h-12 text-[#714B67] transform rotate-12"
                                    viewBox="0 0 50 40"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path d="M48,10 C35,25 20,5 5,30" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                    <path d="M12,25 L5,30 L15,35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                <div className="absolute -top-8 -left-20 w-32 font-caveat text-xl text-[#714B67] transform -rotate-12 text-center">
                                    100% Free & Secure
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                        >
                            <motion.div
                                animate={{ y: [0, -8, 0] }}
                                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                                className="relative z-10"
                            >
                                <div>
                                    {children}
                                </div>
                            </motion.div>
                        </motion.div>
                    </div>

                    {/* Interactive Background Elements (subtle blobs) */}
                    <div className="absolute top-0 -left-64 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
                    <div className="absolute top-0 -right-64 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
                </div>
            </main>

            <Footer />
        </div>
    );
}
