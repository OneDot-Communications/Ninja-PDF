"use client";

import { motion } from "framer-motion";
import { Download, Scan, PenTool, Cloud, Share2, Smartphone, Apple, Play, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/header";

export default function MobilePage() {
    const fadeIn = {
        hidden: { opacity: 0, y: 30 },
        visible: (i: number) => ({
            opacity: 1,
            y: 0,
            transition: { delay: i * 0.1, duration: 0.5 }
        })
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-[#089949]/20">
            <Header />

            <main className="relative overflow-hidden">
                {/* Hero Section */}
                <section className="pt-20 pb-16 md:pt-32 md:pb-32 px-4 relative">
                    {/* Background Blobs */}
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#01B0F1]/10 rounded-full blur-[100px] -z-10" />
                    <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#089949]/10 rounded-full blur-[100px] -z-10" />

                    <div className="container mx-auto flex flex-col md:flex-row items-center gap-12 md:gap-24">
                        {/* Text Content */}
                        <motion.div
                            initial="hidden"
                            animate="visible"
                            className="flex-1 text-center md:text-left space-y-8"
                        >
                            <motion.h1 custom={0} variants={fadeIn} className="text-5xl md:text-7xl font-bold font-caveat tracking-tight leading-none text-slate-900">
                                PDF Tools <br />
                                in your <span className="text-[#089949]">Pocket</span>.
                            </motion.h1>

                            <motion.p custom={1} variants={fadeIn} className="text-xl text-slate-600 max-w-lg mx-auto md:mx-0 leading-relaxed">
                                Scan, sign, and send in seconds. The power of 18+ PDF, optimized for your thumbs.
                            </motion.p>

                            <motion.div custom={2} variants={fadeIn} className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-4 pt-4">
                                <Button className="h-16 px-8 bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-xl hover:-translate-y-1 transition-all flex items-center gap-3">
                                    <Apple className="w-8 h-8" />
                                    <div className="text-left">
                                        <div className="text-[10px] uppercase font-bold text-slate-400 leading-none mb-1">Download on the</div>
                                        <div className="text-lg font-bold leading-none">App Store</div>
                                    </div>
                                </Button>
                                <Button className="h-16 px-8 bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-xl hover:-translate-y-1 transition-all flex items-center gap-3">
                                    <Play className="w-7 h-7 fill-white" />
                                    <div className="text-left">
                                        <div className="text-[10px] uppercase font-bold text-slate-400 leading-none mb-1">Get it on</div>
                                        <div className="text-lg font-bold leading-none">Google Play</div>
                                    </div>
                                </Button>
                            </motion.div>

                            <motion.div custom={3} variants={fadeIn} className="flex items-center justify-center md:justify-start gap-6 text-sm text-slate-500 pt-4">
                                <div className="flex items-center gap-2">
                                    <div className="flex -space-x-2">
                                        {[1, 2, 3, 4].map(i => (
                                            <div key={i} className={`w - 8 h - 8 rounded - full border - 2 border - white bg - slate - 200 z - ${10 - i} `} />
                                        ))}
                                    </div>
                                    <span>50k+ Downloads</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="font-bold text-slate-900">4.9/5</span> Rating
                                </div>
                            </motion.div>
                        </motion.div>

                        {/* Phone Mockup */}
                        <motion.div
                            initial={{ opacity: 0, x: 50, rotate: -5 }}
                            animate={{ opacity: 1, x: 0, rotate: 0 }}
                            transition={{ type: "spring", duration: 1.5 }}
                            className="flex-1 relative max-w-[300px] md:max-w-md mx-auto"
                        >
                            <div className="relative z-10 bg-slate-900 rounded-[3rem] p-3 shadow-2xl border-[8px] border-slate-800 overflow-hidden aspect-[9/19]">
                                {/* Notch */}
                                <div className="absolute top-0 inset-x-0 h-6 bg-slate-800 rounded-b-xl w-32 mx-auto z-20" />

                                {/* Screen */}
                                <div className="bg-white w-full h-full rounded-[2.2rem] overflow-hidden relative flex flex-col">
                                    {/* App Header */}
                                    <div className="pt-10 pb-4 px-6 bg-[#089949] text-white">
                                        <div className="text-xs uppercase font-bold opacity-80 mb-1">Welcome back</div>
                                        <div className="text-2xl font-bold">My Documents</div>
                                    </div>

                                    {/* App Content */}
                                    <div className="flex-1 p-4 space-y-4 bg-slate-50">
                                        {/* Scanner Card */}
                                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                                                <Scan className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900">Scan New</div>
                                                <div className="text-xs text-slate-500">Camera / Gallery</div>
                                            </div>
                                        </div>

                                        {/* Recent List */}
                                        <div className="text-sm font-bold text-slate-400 pl-2">Recent</div>
                                        {[1, 2, 3].map((i) => (
                                            <div key={i} className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3">
                                                <div className="w-10 h-12 bg-red-50 rounded-lg flex items-center justify-center text-red-400 text-[10px] font-bold">PDF</div>
                                                <div className="flex-1">
                                                    <div className="font-medium text-slate-900 text-sm">Contract_Final_v{i}.pdf</div>
                                                    <div className="text-[10px] text-slate-400">2.4 MB • Just now</div>
                                                </div>
                                            </div>
                                        ))}

                                        {/* Fab */}
                                        <div className="absolute bottom-6 right-6 w-14 h-14 bg-[#01B0F1] rounded-full shadow-lg shadow-blue-500/30 flex items-center justify-center text-white">
                                            <PenTool className="w-6 h-6" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Float Elements */}
                            <motion.div
                                animate={{ y: [0, -10, 0] }}
                                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                                className="absolute top-20 -left-12 bg-white p-3 rounded-lg shadow-xl border border-slate-100 flex items-center gap-3 z-20"
                            >
                                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                    <Check className="w-4 h-4" />
                                </div>
                                <div>
                                    <div className="text-xs font-bold">Signed!</div>
                                    <div className="text-[10px] text-slate-500">Just now</div>
                                </div>
                            </motion.div>
                        </motion.div>
                    </div>
                </section>

                {/* Features Carousel */}
                <section className="py-24 bg-white">
                    <div className="container mx-auto px-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {[
                                { icon: Scan, title: "Pocket Scanner", desc: "Turn physical docs into searchable PDFs instantly.", color: "bg-blue-500" },
                                { icon: PenTool, title: "Sign Anywhere", desc: "Draw your signature or use saved stamps.", color: "bg-purple-500" },
                                { icon: Share2, title: "Easy Share", desc: "WhatsApp, Slack, or Email directly from the app.", color: "bg-amber-500" }
                            ].map((f, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className="p-8 rounded-3xl bg-slate-50 hover:bg-white border border-transparent hover:border-slate-100 hover:shadow-xl transition-all group"
                                >
                                    <div className={`w - 14 h - 14 rounded - 2xl ${f.color} text - white flex items - center justify - center mb - 6 shadow - lg group - hover: scale - 110 transition - transform`}>
                                        <f.icon className="w-7 h-7" />
                                    </div>
                                    <h3 className="text-xl font-bold mb-2">{f.title}</h3>
                                    <p className="text-slate-500">{f.desc}</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
