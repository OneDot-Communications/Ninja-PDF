"use client";

import { Header } from "../layout/header"; // Adjusted import path
import {
    ArrowRight, Check, Star, Zap, Shield, Users, User, Heart, Globe, Layout, FileText, Settings,
    Play, Download, ChevronRight, ArrowDown, MessageCircle, Github, Twitter, Linkedin,
    Youtube, Instagram, Facebook
} from "lucide-react";
import Link from "next/link";
import { Button } from "../ui/button"; // Adjusted import path
import { GlowCard } from "@/components/home/spotlight-card";
import { motion, useScroll, useTransform, useInView, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";
import { useRef, useState } from "react";
import { useTools } from "@/lib/hooks/useTools";

// Scroll-triggered animation component - optimized
const ScrollReveal = ({
    children,
    className = "",
    delay = 0,
    direction = "up"
}: {
    children: React.ReactNode;
    className?: string;
    delay?: number;
    direction?: "up" | "down" | "left" | "right";
}) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-50px" });

    const directions = {
        up: { y: 40, x: 0 },
        down: { y: -40, x: 0 },
        left: { x: 40, y: 0 },
        right: { x: -40, y: 0 }
    };

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, ...directions[direction] }}
            animate={isInView ? { opacity: 1, x: 0, y: 0 } : {}}
            transition={{ duration: 0.5, delay, ease: "easeOut" }}
            className={className}
            style={{ willChange: "transform, opacity" }}
        >
            {children}
        </motion.div>
    );
};

// Staggered children animation
const StaggerContainer = ({
    children,
    className = "",
    staggerDelay = 0.1
}: {
    children: React.ReactNode;
    className?: string;
    staggerDelay?: number;
}) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, amount: 0 });

    return (
        <motion.div
            ref={ref}
            initial="visible"
            animate="visible"
            variants={{
                hidden: { opacity: 1 },
                visible: { opacity: 1, transition: { staggerChildren: staggerDelay } }
            }}
            className={className}
        >
            {children}
        </motion.div>
    );
};

const StaggerItem = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <motion.div
        variants={{
            hidden: { opacity: 0, y: 20 },
            visible: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.3, ease: "easeOut" }
            }
        }}
        className={className}
        style={{ willChange: "transform, opacity" }}
    >
        {children}
    </motion.div>
);

// Scale on scroll component - optimized with spring
const ScaleOnScroll = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => {
    const ref = useRef(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start end", "center center"]
    });

    const smoothProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });
    const scale = useTransform(smoothProgress, [0, 1], [0.9, 1]);
    const opacity = useTransform(smoothProgress, [0, 0.3], [0, 1]);

    return (
        <motion.div ref={ref} style={{ scale, opacity, willChange: "transform, opacity" }} className={className}>
            {children}
        </motion.div>
    );
};

// Tool Content Overrides
const toolOverrides: Record<string, string> = {
    "Merge PDF": "Merging PDFs is easy, merging plans… not always.",
    "Split PDF": "Breaking pages apart is fine breaking hearts is not.",
    "Compress PDF": "Making PDFs lighter—because life is heavy enough.",
    "PDF to Word": "PDFs open up in Word; hearts don’t open that easily.",
    "PDF to PowerPoint": "Turn your PDF files into easy to edit PPT and PPTX slideshows.",
    "PDF to Excel": "Extracting data is easy, extracting feelings isn’t.",
    "Word to PDF": "Converting Word is simple, converting emotions is not.",
    "PowerPoint to PDF": "Converting slides is simple, converting feelings is not.",
    "Excel to PDF": "Excel has formulas; PDF has its life together.",
    "Edit PDF": "Editing PDFs made easy—unlike editing your past decisions.",
    "PDF to JPG": "Convert to JPG so your file loads before you lose patience.",
    "JPG to PDF": "One click and your JPG puts on its “I’m important” outfit.",
    "Sign PDF": "PDFs can be signed in seconds; life decisions take forever.",
    "Watermark": "Put a watermark on it—like a tattoo, but for documents.",
    "Rotate PDF": "Fix that sideways PDF before your neck files a complaint.",
    "Unlock PDF": "Your PDF is locked—probably for no good reason. Fix that.",
    "Protect PDF": "Guard your document—because trust issues apply to files too.",
    "Organize PDF": "Organize your PDF because smth’ng in your life should be in order.",
    "PDF to PDF/A": "Convert to PDF/A because even files need to get their life together.",
    "Repair PDF": "PDFs break too luckily, theirs is easier to fix.",
    "Page Numbers": "Add page numbers into PDFs with ease.",
    "Scan to PDF": "Scan to PDF because your papers deserve a digital retirement plan.",
    "OCR PDF": "Make your PDF readable; it’s been ignoring you long enough.",
    "Compare PDF": "Compare two PDFs and finally prove you weren’t imagining things.",
    "Redact PDF": "Redact text and graphics to permanently remove sensitive information.",
    "Crop PDF": "Crop margins of PDF documents or select specific areas.",
    "HTML to PDF": "Convert webpages in HTML to PDF.",
    "Create Workflow": "Design your own PDF assembly line—because doing it manually is for chumps.",
    "Metadata Cleaner": "Remove hidden metadata and personal information from your PDF files."
};

// Tool Card Component - Moved outside
const ToolCard = ({ tool, index }: { tool: any; index: number }) => {
    const wittyDescription = toolOverrides[tool.title] || tool.description;

    return (
        <div
            className="w-[311.12px] h-[190.4px] flex-shrink-0"
        >
            <Link href={tool.href} className="block group w-full h-full">
                <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col h-full relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                    <div className="flex flex-col gap-0 relative z-10 flex-grow h-full justify-between">
                        <div className="flex flex-row items-center gap-4">
                            <div className="relative flex items-center justify-center w-12 h-12 flex-shrink-0">
                                {typeof tool.icon === 'string' ? (
                                    <img
                                        src={tool.icon}
                                        alt={tool.title}
                                        className={`h-full w-full object-contain ${['PDF to Excel', 'Excel to PDF', 'Edit PDF', 'Rotate PDF'].includes(tool.title)
                                            ? 'scale-[3]'
                                            : ['Unlock PDF', 'Protect PDF', 'Scan to PDF', 'OCR PDF'].includes(tool.title)
                                                ? 'scale-[2]'
                                                : ''
                                            }`}
                                    />
                                ) : tool.icon ? (
                                    <tool.icon className="h-full w-full" style={{ color: tool.color || '#1e293b' }} />
                                ) : (
                                    <div className="h-8 w-8 bg-slate-200 rounded-md" />
                                )}
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 leading-tight">
                                {tool.title}
                            </h3>
                        </div>

                        {/* Description */}
                        <p className="text-sm text-slate-500 leading-relaxed font-medium line-clamp-2">
                            {wittyDescription}
                        </p>
                    </div>

                    {/* Footer Stats */}
                    <div className="pt-3 border-t border-slate-50 flex items-center justify-between text-[11px] text-slate-400 font-medium mt-auto leading-[1]">
                        <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            <span>5,63,456</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Heart className="w-3 h-3 text-red-400 fill-red-400" />
                            <span>5,63,456</span>
                        </div>
                    </div>
                </div>
            </Link>
        </div>
    );
};

// Feature Card with 3D tilt effect - optimized with CSS - Moved outside
const FeatureCard = ({
    title, description, image, bgColor, borderColor, delay = 0
}: {
    title: string; description: string; image: string; bgColor: string; borderColor: string; delay?: number;
}) => (
    <ScrollReveal delay={delay}>
        <div
            className="flex flex-col items-center group cursor-pointer transition-transform duration-200 ease-out hover:-translate-y-2"
        >
            <div
                className={`w-full aspect-3/4 rounded-[3rem] ${bgColor} mb-6 relative overflow-hidden border ${borderColor} flex items-center justify-center p-6 transition-transform duration-200 ease-out group-hover:scale-[1.02]`}
            >
                <img
                    src={image}
                    alt={`${title} illustration`}
                    className="w-full h-full object-contain"
                    loading="lazy"
                />
            </div>
            <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
            <p className="text-sm text-slate-500 mt-1 text-center">{description}</p>
        </div>
    </ScrollReveal>
);

interface HomeViewProps {
    heroTitle?: string;
    heroSubtitle?: string;
    platformName?: string;
    // Add other customizable props here
}

export function HomeView({
    heroTitle = "All your PDF headache in one place.",
    heroSubtitle = "Simple, super, and totally free!",
    platformName = "18+ PDF"
}: HomeViewProps) {
    const { tools } = useTools();
    // Filter out internal/admin tools (Category 'Other') and then slice
    const dashboardTools = tools.filter(t => t.category !== "Other").slice(0, 30);
    const heroRef = useRef(null);
    const { scrollYProgress } = useScroll();
    const [showCompetitors, setShowCompetitors] = useState(false);

    // Smooth scroll progress for better performance
    const smoothScrollProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

    // Hero parallax effects - optimized with smoother values
    const heroY = useTransform(smoothScrollProgress, [0, 0.3], [0, -100]);
    const heroOpacity = useTransform(smoothScrollProgress, [0, 0.15], [1, 0]);
    const heroScale = useTransform(smoothScrollProgress, [0, 0.15], [1, 0.98]);

    return (
        <div className="flex min-h-screen flex-col bg-white font-sans text-slate-900 overflow-x-hidden">
            <Header /> {/* Note: Header might need props too if it displays platform name */}

            <main className="flex-1">
                {/* Hero Section - Centered Layout */}
                <section ref={heroRef} className="relative pt-4 pb-4 md:pt-6 md:pb-6 overflow-visible">

                    <motion.div
                        className="container px-4 mx-auto relative z-10"
                        style={{ y: heroY, opacity: heroOpacity, willChange: "transform, opacity" }}
                    >
                        {/* Rotated Badge with Arrow - Positioned independent of text content */}
                        <motion.div
                            className="absolute top-20 right-28 xl:right-34 2xl:right-44 z-20"
                            initial={{ opacity: 0, scale: 0.8, rotate: 15 }}
                            animate={{ opacity: 1, scale: 1, rotate: 5 }}
                            transition={{ delay: 0.5, type: "spring" }}
                        >
                            <div className="relative flex items-center gap-2">
                                {/* Arrow Image - pointing to the badge */}
                                <img
                                    src="/home/arrow.svg"
                                    alt="Arrow"
                                    className="w-16 h-12 mt-2 transform rotate-[-10deg]"
                                />

                                {/* Badge content - aligned right */}
                                <div className="flex flex-col items-start justify-center gap-0.5 transform rotate-[5deg]">
                                    <div className="text-[#FF0000] text-left font-caveat text-base md:text-lg leading-none font-bold whitespace-nowrap">
                                        0.00 Rs / month
                                    </div>
                                    <div className="text-[#FF0000] text-left font-caveat text-base md:text-lg leading-none font-bold whitespace-nowrap">
                                        keep your wallet safe
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        <div className="flex flex-col gap-3 items-center justify-start relative max-w-5xl mx-auto">
                            {/* Main Headline with "one place." decoration */}
                            <motion.div
                                className="flex flex-col items-center justify-start relative w-full"
                                initial={{ opacity: 0, y: 40 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8, delay: 0.2 }}
                            >
                                <h1 className="text-slate-900 text-center font-caveat text-5xl md:text-[5rem] leading-[0.95] font-bold">
                                    All your PDF headaches gone in
                                </h1>
                                <div className="flex flex-row gap-0 items-center justify-center relative -mt-1">
                                    <h1 className="text-slate-900 text-center font-caveat text-5xl md:text-[5rem] leading-[0.95] font-bold relative">
                                        one place.
                                    </h1>
                                    {/* Decorative underline for "one place." - bolder */}
                                    <div className="absolute w-[240px] h-[18px] left-1/2 -translate-x-1/2 bottom-[-8px] opacity-80">
                                        <svg width="242" height="17" viewBox="0 0 242 17" fill="none" className="w-full h-full">
                                            <path d="M2 8C50 2 100 12 120 8C140 4 180 14 240 8" stroke="#01B0F1" strokeWidth="5" strokeLinecap="round" />
                                        </svg>
                                    </div>
                                </div>
                            </motion.div>



                            {/* Subheadline with mixed colors */}
                            <motion.div
                                className="flex flex-wrap gap-2 items-center justify-center relative mt-2"
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8, delay: 0.4 }}
                            >
                                <h2 className="text-slate-900 text-center font-caveat text-3xl md:text-[3rem] font-bold leading-none">
                                    Simple, super, and
                                </h2>
                                <div className="relative inline-block">
                                    <h2 className="text-[#EAB308] text-center font-caveat text-3xl md:text-[3rem] font-bold leading-none">
                                        totally free!
                                    </h2>
                                    {/* Decorative underline for "totally free!" - bolder */}
                                    <div className="absolute left-0 right-0 -bottom-1 h-2">
                                        <svg width="100%" height="8" viewBox="0 0 200 8" fill="none" preserveAspectRatio="none">
                                            <path d="M2 4C50 2 100 6 150 3C170 2 180 5 198 4" stroke="#EAB308" strokeWidth="4" strokeLinecap="round" />
                                        </svg>
                                    </div>
                                </div>
                            </motion.div>

                            {/* CTA Button - Tilted more */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8, delay: 0.6 }}
                                className="mt-3 transform -rotate-6"
                            >
                                <Button className="bg-red-500 hover:bg-red-600 text-white font-bold px-8 py-3 rounded-lg text-base md:text-lg shadow-lg">
                                    It's Free Dude!
                                </Button>
                            </motion.div>
                        </div>
                    </motion.div>
                </section>

                {/* App Grid Section - Clean Card Layout */}
                <section className="pt-0 pb-0 relative overflow-visible">
                    {/* Background SVG - positioned behind cards */}
                    <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
                        <img
                            src="/home/bg.svg"
                            alt=""
                            className="w-full h-auto object-contain opacity-40 -mt-52"
                        />
                    </div>


                    <div className="w-full px-4 md:px-6 mx-auto relative z-10">
                        <div className="w-full max-w-[1700px] mx-auto relative">
                            {/* Tools Grid Section */}
                            <section className="py-4">
                                <div className="w-full">
                                    <div className="flex flex-wrap justify-center gap-4">
                                        {dashboardTools.map((tool, index) => (
                                            <ToolCard key={tool.title} tool={tool} index={index} />
                                        ))}
                                    </div>
                                </div>
                            </section>
                            {/* View all tools link */}
                            <ScrollReveal delay={0.3}>
                                <div className="mt-4 mb-2 flex justify-center md:justify-end px-4">
                                    <motion.div whileHover={{ x: 5 }}>
                                        <Link href="/tools" className="text-slate-600 font-semibold flex items-center gap-2 hover:underline hover:text-slate-800 text-lg transition-colors">
                                            View all Tools <ArrowRight className="w-5 h-5" />
                                        </Link>
                                    </motion.div>
                                </div>
                            </ScrollReveal>
                        </div>
                    </div>
                </section>

                {/* Level Up Section */}
                <section className="pt-4 pb-12 bg-white overflow-hidden">
                    <div className="container px-4 mx-auto">
                        <div className="max-w-6xl mx-auto">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                                <ScrollReveal direction="left">
                                    <div className="text-left">
                                        <h2 className="text-5xl md:text-[4.5rem] font-bold font-caveat text-slate-900 leading-none mb-8">
                                            Level up <br />
                                            your{" "}
                                            <span className="relative inline-block">
                                                smart work
                                                <motion.div
                                                    className="absolute bottom-2 left-0 w-full h-[0.15em] bg-[#01B0F1] -z-10 opacity-60 transform -rotate-2"
                                                    initial={{ scaleX: 0 }}
                                                    whileInView={{ scaleX: 1 }}
                                                    transition={{ duration: 0.8 }}
                                                    viewport={{ once: true }}
                                                />
                                            </span>
                                        </h2>
                                        <p className="text-xl text-slate-600 leading-relaxed mb-8">
                                            Why doing donkey work? Use smart tools.
                                            Fast, reliable, and zero tension.
                                        </p>
                                        <div className="flex flex-wrap gap-4">
                                            {["Faster than noodles", "Safe like bank locker", "No login drama"].map((item, i) => (
                                                <motion.div
                                                    key={item}
                                                    className="flex items-center gap-2 text-slate-700"
                                                    initial={{ opacity: 0, x: -20 }}
                                                    whileInView={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: i * 0.15 }}
                                                    viewport={{ once: true }}
                                                >
                                                    <div className="w-5 h-5 rounded-full bg-[#01B0F1] flex items-center justify-center">
                                                        <Check className="w-3 h-3 text-white" />
                                                    </div>
                                                    <span className="font-medium">{item}</span>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                </ScrollReveal>

                                <ScrollReveal direction="right">
                                    <div className="relative w-full max-w-lg mx-auto">
                                        <motion.img
                                            src="https://illustrations.popsy.co/violet/work-from-home.svg"
                                            alt="Document workflow illustration"
                                            className="w-full h-auto"
                                            whileHover={{ scale: 1.05, rotate: 2 }}
                                            transition={{ type: "spring", stiffness: 200 }}
                                        />
                                    </div>
                                </ScrollReveal>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Productivity Section */}
                <section className="py-24 bg-slate-50">
                    <div className="container px-4 mx-auto">
                        <ScaleOnScroll>
                            <div className="max-w-4xl mx-auto text-center mb-16">
                                <h2 className="text-6xl md:text-[5rem] font-bold font-caveat text-slate-900 leading-none mb-8">
                                    Built for{" "}
                                    <span className="relative inline-block">
                                        legends
                                        <motion.div
                                            className="absolute bottom-4 left-0 w-full h-[0.4em] bg-[#FF0000] -z-10 opacity-50 transform rotate-1"
                                            initial={{ scaleX: 0 }}
                                            whileInView={{ scaleX: 1 }}
                                            transition={{ duration: 0.8, delay: 0.3 }}
                                            viewport={{ once: true }}
                                        />
                                    </span>
                                </h2>

                                <motion.p
                                    className="text-2xl md:text-3xl font-light text-slate-700 leading-relaxed"
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                    viewport={{ once: true }}
                                >
                                    <span className="font-semibold">Don't walk, run.</span> Less clicking, <br />
                                    more chilling. UI is butter smooth.
                                </motion.p>
                            </div>
                        </ScaleOnScroll>
                    </div>
                </section>

                {/* Tech Platform Section */}
                <section className="py-24 bg-blue-50">
                    <div className="container px-4 mx-auto">
                        <ScrollReveal>
                            <div className="text-center mb-20">
                                <h2 className="text-6xl md:text-[5rem] font-bold font-caveat text-slate-900 leading-none">
                                    Everything <br />
                                    in one spot
                                </h2>
                            </div>
                        </ScrollReveal>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
                            <FeatureCard
                                title="Convert It"
                                description="PDF to Word, Excel, everything"
                                image="https://illustrations.popsy.co/blue/digital-nomad.svg"
                                bgColor="bg-blue-50"
                                borderColor="border-blue-100"
                                delay={0}
                            />
                            <FeatureCard
                                title="Style It"
                                description="Text, photo, awesome design"
                                image="https://illustrations.popsy.co/violet/graphic-design.svg"
                                bgColor="bg-purple-50"
                                borderColor="border-purple-100"
                                delay={0.1}
                            />
                            <FeatureCard
                                title="Sign It"
                                description="Digital autograph, boss style"
                                image="https://illustrations.popsy.co/green/working-vacation.svg"
                                bgColor="bg-green-50"
                                borderColor="border-green-100"
                                delay={0.2}
                            />
                            <FeatureCard
                                title="Lock It"
                                description="Password protect, full safety"
                                image="https://illustrations.popsy.co/amber/app-launch.svg"
                                bgColor="bg-orange-50"
                                borderColor="border-orange-100"
                                delay={0.3}
                            />
                        </div>
                    </div>
                </section>

                {/* Enterprise Section */}
                <section className="py-24 bg-slate-50 rounded-t-[5rem] relative">
                    <div className="container px-4 mx-auto">
                        <div className="max-w-6xl mx-auto">
                            <ScrollReveal>
                                <div className="mb-16">
                                    <h2 className="text-6xl md:text-[5rem] font-bold font-caveat text-slate-900 leading-none text-left">
                                        PDF <span className="relative inline-block">
                                            scene
                                            <div className="absolute inset-0 bg-[#E0E7FF] -z-10 transform -rotate-2 scale-110 rounded-lg opacity-50"></div>
                                        </span> <br />
                                        is <span className="relative inline-block">
                                            sorted
                                            <motion.div
                                                className="absolute bottom-2 left-0 w-full h-2 bg-[#01B0F1] rounded-full"
                                                initial={{ scaleX: 0 }}
                                                whileInView={{ scaleX: 1 }}
                                                transition={{ duration: 0.8 }}
                                                viewport={{ once: true }}
                                            />
                                        </span>.
                                    </h2>
                                </div>
                            </ScrollReveal>

                            <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-8" staggerDelay={0.15}>
                                <StaggerItem>
                                    <motion.div
                                        className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 h-full"
                                        whileHover={{ y: -5, boxShadow: "0 20px 40px rgba(0,0,0,0.1)" }}
                                    >
                                        <h3 className="text-2xl font-semibold text-slate-900 mb-4">100% Free, Promise</h3>
                                        <p className="text-lg text-slate-600 mb-8">
                                            No hidden charges, really. Keep your credit card for shopping.
                                        </p>
                                        <Button className="bg-[#01B0F1] hover:bg-[#0091d4] text-white">
                                            Check Privacy Policy
                                        </Button>
                                    </motion.div>
                                </StaggerItem>

                                <StaggerItem>
                                    <motion.div
                                        className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 h-full"
                                        whileHover={{ y: -5, boxShadow: "0 20px 40px rgba(0,0,0,0.1)" }}
                                    >
                                        <h3 className="text-2xl font-semibold text-slate-900 mb-4">No Install Headache</h3>
                                        <p className="text-lg text-slate-600 mb-8">
                                            Works in browser. Windows, Mac, phone - all good.
                                        </p>
                                        <Button variant="outline" className="text-[#01B0F1] border-[#01B0F1]">
                                            Works where?
                                        </Button>
                                    </motion.div>
                                </StaggerItem>
                            </StaggerContainer>
                        </div>
                    </div>
                </section>

                {/* Unified Bottom Section */}
                <section className="py-24 bg-white overflow-hidden">
                    <div className="container px-4 mx-auto text-center relative">
                        <ScaleOnScroll>
                            <div className="max-w-4xl mx-auto text-center">
                                {/* Intro text - similar to other sections */}
                                <p className="text-2xl md:text-3xl font-light text-slate-600 leading-relaxed mb-4">
                                    Grow your business, boss style
                                </p>
                                <h3 className="text-4xl md:text-5xl font-bold font-caveat text-slate-800 leading-none mb-12">
                                    <span>Join the crowd of </span>
                                    <span className="relative inline-block">
                                        <span className="text-[#01B0F1]">happy</span>
                                        <motion.div
                                            className="absolute bottom-1 left-0 w-full h-[0.15em] bg-[#01B0F1] -z-10 opacity-60 transform -rotate-1"
                                            initial={{ scaleX: 0 }}
                                            whileInView={{ scaleX: 1 }}
                                            transition={{ duration: 0.8 }}
                                            viewport={{ once: true }}
                                        />
                                    </span>
                                    <span> legends</span>
                                </h3>

                                {/* Master Title */}
                                <h2 className="text-6xl md:text-[7rem] font-bold font-caveat text-slate-900 leading-[0.9]">
                                    <span>Be the </span>
                                    <span className="relative inline-block">
                                        <span className="text-[#01B0F1]">Boss</span>
                                        <motion.div
                                            className="absolute -top-8 -right-12 text-[#01B0F1]"
                                            animate={{ rotate: [0, 15, 0], scale: [1, 1.2, 1] }}
                                            transition={{ duration: 3, repeat: Infinity }}
                                        >
                                            <svg width="60" height="60" viewBox="0 0 50 50">
                                                <path d="M25,0 L30,20 L50,25 L30,30 L25,50 L20,30 L0,25 L20,20 Z" fill="currentColor" />
                                            </svg>
                                        </motion.div>
                                    </span>
                                </h2>
                            </div>
                        </ScaleOnScroll>
                    </div>
                </section>

                {/* Footer - Clean White Design */}
                <footer className="bg-white border-t border-slate-100 pt-20 pb-12">
                    <div className="container px-4 mx-auto">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
                            {/* Brand Column */}
                            <div className="col-span-1 md:col-span-1">
                                <Link href="/" className="flex items-center mb-6">
                                    <img src="/logo.svg" alt="18+ PDF" className="h-12 w-auto" />
                                    <span className="text-slate-800 font-bold font-caveat text-3xl">PDF</span>
                                </Link>
                                <p className="text-slate-500 mb-6 leading-relaxed">
                                    Just finish work, and chill. No tension.
                                </p>
                                <div className="flex gap-4">
                                    {[Twitter, Github, Linkedin].map((Icon, i) => (
                                        <motion.div key={i} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                                            <Link href="#" className="text-slate-400 hover:text-[#01B0F1] transition-colors">
                                                <Icon className="w-5 h-5" />
                                            </Link>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>

                            {/* Links Columns */}
                            <div className="col-span-1 md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-8">
                                <div>
                                    <h3 className="font-bold text-lg mb-6 text-[#01B0F1]">Company</h3>
                                    <ul className="space-y-4 text-slate-600">
                                        {["About", "Contact", "Privacy Policy", "Terms"].map((link) => (
                                            <li key={link}>
                                                <Link href="#" className="hover:text-[#01B0F1] transition-colors hover:translate-x-1 inline-block duration-200">{link}</Link>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div>
                                    <h3 className="font-bold text-lg mb-6 text-[#01B0F1]">Tools</h3>
                                    <ul className="space-y-4 text-slate-600">
                                        {["Merge PDF", "Split PDF", "Compress PDF", "Convert PDF"].map((link) => (
                                            <li key={link}>
                                                <Link href="#" className="hover:text-[#01B0F1] transition-colors hover:translate-x-1 inline-block duration-200">{link}</Link>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div>
                                    <h3 className="font-bold text-lg mb-6 text-[#01B0F1]">Connect</h3>
                                    <ul className="space-y-4 text-slate-600">
                                        {["Twitter", "GitHub", "Vercel"].map((link) => (
                                            <li key={link}>
                                                <Link href="#" className="hover:text-[#01B0F1] transition-colors hover:translate-x-1 inline-block duration-200">{link}</Link>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-slate-100 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
                            <div className="text-slate-500 text-sm font-medium">
                                © {new Date().getFullYear()} 18+ PDF. All rights reserved.
                            </div>
                            <div className="text-slate-500 text-sm font-medium">
                                Website made by <span className="text-[#FF0000] font-bold">CHN Technologies</span>
                            </div>
                        </div>
                    </div>
                </footer>
            </main>
        </div>
    );
}
