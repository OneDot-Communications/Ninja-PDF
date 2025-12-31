"use client";

import { Header } from "./header";
import { Footer } from "./footer";
import { motion } from "framer-motion";
import { ScrollReveal } from "../ui/scroll-reveal";

interface ToolShellProps {
    title: string;
    description: string;
    children: React.ReactNode;
    variant?: "default" | "editor" | "upload";
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

    if (variant === "upload") {
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
                    {/* Content Container - simplified for upload */}
                    <div className="container relative z-10 mx-auto px-4 md:px-6 py-12 md:py-20 max-w-5xl">
                        <div className="relative z-10">
                            {children}
                        </div>
                    </div>
                </main>
                <Footer />
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
                        <motion.div
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                        >
                            <div className="relative z-10">
                                <div>
                                    {children}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
