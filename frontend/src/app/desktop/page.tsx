"use client";

import { motion } from "framer-motion";
import { Download, Zap, Shield, Layers, Command, Monitor, Laptop, Check, ArrowRight, Github } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Header } from "@/app/components/layout/header";

export default function DesktopPage() {
    // Animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.5 }
        }
    };

    const features = [
        {
            icon: Zap,
            title: "Blazing Fast",
            description: "Native C++ engine. No upload, no download. Instant processing.",
            color: "text-amber-500",
            bg: "bg-amber-500/10"
        },
        {
            icon: Shield,
            title: "Local & Private",
            description: "Files never leave your machine. Your data, your rules.",
            color: "text-green-500",
            bg: "bg-green-500/10"
        },
        {
            icon: Layers,
            title: "Batch Master",
            description: "Process 1000s of files in seconds. Drag, drop, done.",
            color: "text-blue-500",
            bg: "bg-blue-500/10"
        },
        {
            icon: Command,
            title: "Pro Shortcuts",
            description: "Keyboard first design. Command palette for power users.",
            color: "text-purple-500",
            bg: "bg-purple-500/10"
        }
    ];

    return (
        <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-[#01B0F1]/20">
            <Header />

            <main className="relative overflow-hidden">
                {/* Background Decor */}
                <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-br from-blue-50 via-white to-white -z-10" />
                <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-blue-100/30 rounded-full blur-[100px] -z-10 animate-pulse" />

                {/* Hero Section */}
                <section className="pt-20 pb-16 md:pt-32 md:pb-24">
                    <div className="container mx-auto px-4">
                        <motion.div
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            className="max-w-4xl mx-auto text-center space-y-8"
                        >
                            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-[#01B0F1] font-medium text-sm">
                                <Zap className="w-4 h-4 fill-current" />
                                <span>v2.4.0 is now available</span>
                            </motion.div>

                            <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl font-bold font-caveat tracking-tight leading-none text-slate-900">
                                The <span className="text-[#01B0F1]">Powerhouse</span> <br />
                                on your Desktop.
                            </motion.h1>

                            <motion.p variants={itemVariants} className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
                                Forget internet speed limits. Get the full power of 18+ PDF directly on your machine.
                                <br className="hidden md:block" />
                                <span className="font-semibold text-slate-900">Offline. Unlimited. Forever Free.</span>
                            </motion.p>

                            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                                <Button className="h-14 px-8 text-lg bg-[#01B0F1] hover:bg-[#0091d4] text-white shadow-xl shadow-blue-200/50 transition-all hover:-translate-y-1">
                                    <Download className="w-5 h-5 mr-2" />
                                    Download for macOS
                                </Button>
                                <Button variant="outline" className="h-14 px-8 text-lg border-slate-200 hover:border-blue-200 hover:bg-blue-50 text-slate-600 hover:text-blue-600 transition-all">
                                    <Monitor className="w-5 h-5 mr-2" />
                                    Windows
                                </Button>
                            </motion.div>

                            <motion.p variants={itemVariants} className="text-sm text-slate-400">
                                Supports macOS 12+ (Intel & Apple Silicon) and Windows 10/11
                            </motion.p>
                        </motion.div>
                    </div>
                </section>

                {/* App Showcase / Mockup Area */}
                <section className="pb-32">
                    <div className="container mx-auto px-4">
                        <motion.div
                            initial={{ opacity: 0, y: 100, rotateX: 20 }}
                            whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                            transition={{ type: "spring", stiffness: 50, damping: 20 }}
                            viewport={{ once: true, margin: "-100px" }}
                            className="max-w-6xl mx-auto"
                            style={{ perspective: "1000px" }}
                        >
                            {/* Window Frame Mockup */}
                            <div className="rounded-2xl border border-slate-200 bg-white/50 backdrop-blur-xl shadow-2xl overflow-hidden aspect-[16/10] relative group hover:shadow-[0_0_50px_rgba(1,176,241,0.15)] transition-shadow duration-500">
                                {/* Window Title Bar */}
                                <div className="h-10 bg-white border-b border-slate-100 flex items-center px-4 gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-400/80" />
                                    <div className="w-3 h-3 rounded-full bg-amber-400/80" />
                                    <div className="w-3 h-3 rounded-full bg-green-400/80" />
                                    <div className="ml-4 text-xs font-medium text-slate-400 flex items-center gap-1.5 bg-slate-50 px-3 py-1 rounded-sm border border-slate-100">
                                        <Layers className="w-3 h-3" />
                                        18+ PDF - Pro
                                    </div>
                                </div>

                                {/* Window Content (Simulated Interface) */}
                                <div className="flex h-full">
                                    {/* Sidebar */}
                                    <div className="w-64 bg-slate-50 border-r border-slate-100 p-6 space-y-6 hidden md:block">
                                        <div className="space-y-1">
                                            <div className="h-8 w-full bg-blue-100/50 rounded-lg" />
                                            <div className="h-8 w-3/4 bg-slate-200/50 rounded-lg" />
                                            <div className="h-8 w-5/6 bg-slate-200/50 rounded-lg" />
                                        </div>
                                        <div className="h-px bg-slate-200 w-full" />
                                        <div className="space-y-2">
                                            {[1, 2, 3, 4].map(i => (
                                                <div key={i} className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 shadow-sm" />
                                                    <div className="h-2 w-20 bg-slate-200 rounded-full" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Main Area */}
                                    <div className="flex-1 p-8 bg-white relative">
                                        {/* Drop Zone */}
                                        <div className="absolute inset-8 border-2 border-dashed border-blue-200 rounded-xl bg-blue-50/20 flex flex-col items-center justify-center gap-4 group-hover:bg-blue-50/50 group-hover:border-[#01B0F1] transition-colors duration-300">
                                            <div className="w-20 h-20 rounded-2xl bg-white shadow-lg flex items-center justify-center text-[#01B0F1] group-hover:scale-110 transition-transform duration-300">
                                                <Layers className="w-10 h-10" />
                                            </div>
                                            <div className="text-center">
                                                <h3 className="text-xl font-bold text-slate-800">Drop files here</h3>
                                                <p className="text-slate-400">to merge, compress, or convert</p>
                                            </div>
                                        </div>

                                        {/* Floating Elements */}
                                        <motion.div
                                            className="absolute top-12 right-12 bg-white p-4 rounded-xl shadow-xl border border-slate-100 z-10 w-64"
                                            initial={{ x: 20, opacity: 0 }}
                                            whileInView={{ x: 0, opacity: 1 }}
                                            transition={{ delay: 0.5 }}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-bold text-slate-900">Compression</span>
                                                <span className="text-xs text-green-500 font-bold">-85%</span>
                                            </div>
                                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <motion.div
                                                    className="h-full bg-green-500"
                                                    initial={{ width: 0 }}
                                                    whileInView={{ width: "85%" }}
                                                    transition={{ delay: 0.8, duration: 1 }}
                                                />
                                            </div>
                                        </motion.div>

                                        <motion.div
                                            className="absolute bottom-12 left-12 bg-[#01B0F1] text-white p-4 rounded-xl shadow-xl shadow-blue-500/20 z-10 flex items-center gap-3"
                                            initial={{ y: 20, opacity: 0 }}
                                            whileInView={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 0.7 }}
                                        >
                                            <Check className="w-5 h-5" />
                                            <div className="text-sm font-semibold">Ready to process</div>
                                        </motion.div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* Features Grid */}
                <section className="pb-32 bg-slate-50/50 py-24">
                    <div className="container mx-auto px-4">
                        <div className="text-center max-w-3xl mx-auto mb-16">
                            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6 font-caveat">Why go Desktop?</h2>
                            <p className="text-lg text-slate-600">Sometimes the browser just isn't enough. For heavy duty work, you need heavy duty tools.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            {features.map((feature, i) => (
                                <motion.div
                                    key={feature.title}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    viewport={{ once: true }}
                                    className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
                                >
                                    <div className={`w-14 h-14 rounded-xl ${feature.bg} ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                                        <feature.icon className="w-7 h-7" />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                                    <p className="text-slate-500 leading-relaxed text-sm">
                                        {feature.description}
                                    </p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* System Requirements */}
                <section className="py-24 bg-white">
                    <div className="container mx-auto px-4 max-w-4xl">
                        <div className="bg-slate-900 text-white rounded-3xl p-8 md:p-12 overflow-hidden relative">
                            {/* Abstract bg */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px]" />
                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/20 rounded-full blur-[80px]" />

                            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
                                <div className="flex-1 space-y-6">
                                    <h3 className="text-3xl font-bold font-caveat">System Requirements</h3>
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                                            <Laptop className="w-6 h-6 text-blue-400" />
                                            <div>
                                                <div className="font-semibold">macOS</div>
                                                <div className="text-sm text-slate-400">12.0 (Monterey) or later</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                                            <Monitor className="w-6 h-6 text-blue-400" />
                                            <div>
                                                <div className="font-semibold">Windows</div>
                                                <div className="text-sm text-slate-400">10 (64-bit) or 11</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex-1 text-center md:text-right">
                                    <div className="text-[5rem] font-bold text-transparent bg-clip-text bg-gradient-to-br from-blue-400 to-cyan-300 leading-none">
                                        20MB
                                    </div>
                                    <p className="text-slate-400 mt-2">Tiny footprint. Massive power.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Bottom CTA */}
                <section className="py-24 text-center">
                    <div className="container mx-auto px-4">
                        <h2 className="text-4xl md:text-5xl font-bold font-caveat text-slate-900 mb-8">Ready to supercharge?</h2>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Button size="lg" className="h-14 px-10 text-lg bg-[#01B0F1] hover:bg-[#0091d4] text-white rounded-full">
                                Download Now
                            </Button>
                            <Button size="lg" variant="ghost" className="h-14 px-10 text-lg text-slate-600 hover:text-slate-900">
                                <Github className="w-5 h-5 mr-2" />
                                View Source
                            </Button>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
