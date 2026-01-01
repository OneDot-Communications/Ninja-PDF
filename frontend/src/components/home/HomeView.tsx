"use client";

import { Header } from "../layout/header"; // Adjusted import path
import {
    ArrowRight, Check, Star, Zap, Shield, Users, User, Heart, Globe, Layout, FileText, Settings,
    ChevronRight, Twitter, Linkedin
} from "lucide-react";
import Link from "next/link";
import { Button } from "../ui/button"; // Adjusted import path
import { GlowCard } from "@/components/home/spotlight-card";
import { motion, useInView } from "framer-motion";
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
    >
        {children}
    </motion.div>
);

// Scale on scroll component - optimized with spring
const ScaleOnScroll = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, amount: 0.3 });

    return (
        <motion.div
            ref={ref}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={isInView ? { scale: 1, opacity: 1 } : {}}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className={className}
        >
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

// Split descriptions for styled rendering
const getSplitDescription = (toolTitle: string, fullDescription: string) => {
    const splits: Record<string, { normal: string; italic: string }> = {
        "Merge PDF": { normal: "Merging PDFs is easy,", italic: "merging plans… not always." },
        "Split PDF": { normal: "Breaking pages apart is fine", italic: "breaking hearts is not." },
        "Compress PDF": { normal: "Making PDFs lighter", italic: "because life is heavy enough." },
        "PDF to Word": { normal: "PDFs open up in Word;", italic: "hearts don't open that easily." },
        "PDF to PowerPoint": { normal: "Turn your PDF files into", italic: "easy to edit PPT and PPTX slideshows." },
        "PDF to Excel": { normal: "Extracting data is easy,", italic: "extracting feelings isn't." },
        "Word to PDF": { normal: "Converting Word is simple,", italic: "converting emotions is not." },
        "PowerPoint to PDF": { normal: "Converting slides is simple,", italic: "converting feelings is not." },
        "Excel to PDF": { normal: "Excel has formulas;", italic: "PDF has its life together." },
        "Edit PDF": { normal: "Editing PDFs made easy", italic: "unlike editing your past decisions." },
        "PDF to JPG": { normal: "Convert to JPG so your file loads", italic: "before you lose patience." },
        "JPG to PDF": { normal: "One click and your JPG puts on its", italic: "\"I'm important\" outfit." },
        "Sign PDF": { normal: "PDFs can be signed in seconds;", italic: "life decisions take forever." },
        "Watermark": { normal: "Put a watermark on it", italic: "like a tattoo, but for documents." },
        "Rotate PDF": { normal: "Fix that sideways PDF", italic: "before your neck files a complaint." },
        "Unlock PDF": { normal: "Your PDF is locked", italic: "probably for no good reason. Fix that." },
        "Protect PDF": { normal: "Guard your document", italic: "because trust issues apply to files too." },
        "Organize PDF": { normal: "Organize your PDF because", italic: "smth'ng in your life should be in order." },
        "PDF to PDF/A": { normal: "Convert to PDF/A because", italic: "even files need to get their life together." },
        "Repair PDF": { normal: "PDFs break too luckily,", italic: "theirs is easier to fix." },
        "Page Numbers": { normal: "Add page numbers into PDFs", italic: "with ease." },
        "Scan to PDF": { normal: "Scan to PDF because", italic: "your papers deserve a digital retirement plan." },
        "OCR PDF": { normal: "Make your PDF readable;", italic: "it's been ignoring you long enough." },
        "Compare PDF": { normal: "Compare two PDFs and finally prove", italic: "you weren't imagining things." },
        "Redact PDF": { normal: "Redact text and graphics to", italic: "permanently remove sensitive information." },
        "Crop PDF": { normal: "Crop margins of PDF documents", italic: "or select specific areas." },
        "HTML to PDF": { normal: "Convert webpages in", italic: "HTML to PDF." },
        "Create Workflow": { normal: "Design your own PDF assembly line", italic: "because doing it manually is for chumps." },
        "Metadata Cleaner": { normal: "Remove hidden metadata and personal information", italic: "from your PDF files." }
    };

    return splits[toolTitle] || { normal: fullDescription, italic: "" };
};

// Tool Card Component - Moved outside
const ToolCard = ({ tool, index }: { tool: any; index: number }) => {
    const wittyDescription = toolOverrides[tool.title] || tool.description;
    const splitDesc = getSplitDescription(tool.title, wittyDescription);
    const [isLiked, setIsLiked] = useState(false);

    const handleLike = (e: React.MouseEvent) => {
        e.preventDefault(); // Prevent navigation
        setIsLiked(!isLiked);
    };

    return (
        <div
            className="w-[311.12px] h-[190.4px] flex-shrink-0"
        >
            <Link href={tool.href} className="block group w-full h-full">
                <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col h-full relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                    {/* Like button at top right */}
                    <button
                        onClick={handleLike}
                        className="absolute top-3 right-3 z-20 p-1 rounded-full hover:bg-slate-50 transition-colors"
                    >
                        <Heart className={cn(
                            "w-4 h-4 transition-colors",
                            isLiked ? "text-red-500 fill-red-500" : "text-slate-300"
                        )} />
                    </button>

                    <div className="flex flex-col gap-0 relative z-10 flex-grow h-full justify-between">
                        <div className="flex flex-row items-center gap-4">
                            <div className="relative flex items-center justify-center w-12 h-12 flex-shrink-0">
                                {typeof tool.icon === 'string' ? (
                                    <img
                                        src={tool.icon}
                                        alt={tool.title}
                                        className="h-full w-full object-contain"
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
                            <span className="opacity-75">{splitDesc.normal}</span>
                            {splitDesc.italic && (
                                <>
                                    {" "}
                                    <span className="italic">{splitDesc.italic}</span>
                                </>
                            )}
                        </p>
                    </div>

                    {/* Footer Stats */}
                    <div className="pt-3 border-t border-slate-50 flex items-center justify-end text-[11px] text-slate-400 font-medium mt-auto leading-[1]">
                        <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            <span>0</span>
                        </div>
                    </div>
                </div>
            </Link>
        </div>
    );
};

// Skeleton loading card for tools
const ToolCardSkeleton = () => (
    <div className="w-[311.12px] h-[190.4px] flex-shrink-0">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col h-full relative overflow-hidden">
            <div className="flex flex-col gap-0 relative z-10 flex-grow h-full justify-between">
                <div className="flex flex-row items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-slate-100 animate-pulse flex-shrink-0" />
                    <div className="h-6 w-32 bg-slate-100 rounded animate-pulse" />
                </div>
                <div className="space-y-2 mt-3">
                    <div className="h-4 w-full bg-slate-100 rounded animate-pulse" />
                    <div className="h-4 w-3/4 bg-slate-100 rounded animate-pulse" />
                </div>
            </div>
            <div className="pt-3 border-t border-slate-50 flex items-center justify-end mt-auto">
                <div className="h-3 w-8 bg-slate-100 rounded animate-pulse" />
            </div>
        </div>
    </div>
);

// Skeleton for hero section
const HeroSkeleton = () => (
    <div className="flex flex-col gap-3 items-center justify-start relative max-w-5xl mx-auto px-4" role="status" aria-label="Loading content">
        {/* Hero Title Skeleton - matches the two-line layout */}
        <div className="flex flex-col items-center justify-start relative w-full">
            <div className="h-16 md:h-20 w-full max-w-[500px] bg-slate-200 rounded-lg animate-pulse mb-2" aria-hidden="true"></div>
            <div className="h-16 md:h-20 w-full max-w-[300px] bg-slate-200 rounded-lg animate-pulse" aria-hidden="true"></div>
        </div>

        {/* Hero Subtitle Skeleton - matches the two-part layout */}
        <div className="flex flex-wrap gap-2 items-center justify-center relative mt-2">
            <div className="h-10 md:h-12 w-40 md:w-48 bg-slate-200 rounded-lg animate-pulse" aria-hidden="true"></div>
            <div className="h-10 md:h-12 w-32 md:w-40 bg-slate-200 rounded-lg animate-pulse" aria-hidden="true"></div>
        </div>

        {/* CTA Button Skeleton */}
        <div className="h-12 w-32 bg-slate-200 rounded-lg animate-pulse mt-3" aria-hidden="true"></div>
        <span className="sr-only">Loading content...</span>
    </div>
);

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
    previewMode?: boolean; // optional flag for preview mode
    primaryColor?: string; // hero highlight color
    highlightHeight?: number; // height in em for the paint highlight
    loading?: boolean; // show skeleton while loading branding
    // Add other customizable props here
}

export function HomeView({
    heroTitle = "All your PDF headache in one place.",
    heroSubtitle = "Simple, super, and totally free!",
    platformName = "18+ PDF",
    primaryColor = "#01B0F1",
    highlightHeight = 1.05,
    loading = false,
    previewMode = false
}: HomeViewProps) {
    const { tools, loading: toolsLoading } = useTools();
    // Filter out internal/admin tools (Category 'Other') and then slice
    const dashboardTools = tools.filter(t => t.category !== "Other").slice(0, 30);
    const heroRef = useRef(null);
    const [showCompetitors, setShowCompetitors] = useState(false);

    // Effective highlight settings (can be controlled from super-admin)
    const effectiveHighlightHeight = typeof highlightHeight === 'number' ? highlightHeight : 1.05; // em
    const highlightFill = primaryColor || '#AEEBFF';
    const highlightShadow = primaryColor || '#01B0F1';

    return (
        <div className="flex min-h-screen flex-col bg-white font-sans text-slate-900">
            <Header /> {/* Note: Header might need props too if it displays platform name */}

            <main className="flex-1">
                {/* Hero Section - Centered Layout */}
                <section ref={heroRef} className="relative pt-4 pb-4 md:pt-6 md:pb-6 overflow-visible">

                    <div className="container px-4 mx-auto relative z-10">
                        {loading ? (
                            <HeroSkeleton />
                        ) : (
                            <>
                                {/* Rotated Badge with Arrow - Positioned independent of text content */}
                                <motion.div
                                    className="absolute top-20 right-28 xl:right-34 2xl:right-44 z-20"
                                    initial={{ opacity: 0, scale: 0.8, rotate: 15 }}
                                    animate={{ opacity: 1, scale: 1, rotate: 5 }}
                                    transition={{ delay: 0.5, type: "spring" }}
                                >
                                </motion.div>

                                <div className="flex flex-col gap-3 items-center justify-start relative max-w-5xl mx-auto">
                                    {/* Main Headline with "one place." decoration */}
                                    <motion.div
                                        className="flex flex-col items-center justify-start relative w-full"
                                        initial={{ opacity: 0, y: 40 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.8, delay: 0.2 }}
                                    >
                                        {/* Split hero title to put "one place" on second line with paint-style highlight */}
                                        <h1 className="text-slate-900 text-center font-caveat text-5xl md:text-[5rem] leading-[0.95] font-bold">
                                            {(() => {
                                                const regex = /(one place\.?)/i;
                                                const m = heroTitle.match(regex);
                                                if (!heroTitle) return null;

                                                if (m) {
                                                    const highlight = m[0];
                                                    const before = heroTitle.replace(regex, '').trim();
                                                    return (
                                                        <>
                                                            <span>{before}</span>
                                                            <br />
                                                            <span className="relative inline-block">
                                                                {/* Paint-like rounded rect behind the text */}
                                                                <motion.svg
                                                                    className="absolute left-0 right-0 top-1/2 -translate-y-1/2 -z-10 w-full"
                                                                    viewBox="0 0 100 20"
                                                                    preserveAspectRatio="none"
                                                                    initial={{ scaleX: 0 }}
                                                                    whileInView={{ scaleX: 1 }}
                                                                    transition={{ duration: 0.6, ease: 'easeOut' }}
                                                                    viewport={{ once: true }}
                                                                    style={{ transformOrigin: 'left', height: `${effectiveHighlightHeight}em` }}
                                                                >
                                                                    {/* Paint-like stroke path to create rounded, slightly irregular edges */}
                                                                    <path d="M2 10 C12 4 26 2 40 3 C54 4 68 6 82 5 C90 4 95 2 100 3 L100 17 C95 18 90 19 82 18 C68 17 54 15 40 16 C26 17 12 19 2 13 Z" fill={highlightFill} />
                                                                    {/* Soft shadow below for depth */}
                                                                    <path d="M2 11 C12 5 26 3 40 4 C54 5 68 7 82 6 C90 5 95 3 100 4 L100 18 C95 19 90 20 82 19 C68 18 54 16 40 17 C26 18 12 20 2 14 Z" fill={highlightShadow} opacity="0.12" />
                                                                </motion.svg>

                                                                <span className="relative z-10 text-slate-900">{highlight}</span>
                                                            </span>
                                                        </>
                                                    );
                                                }

                                                // fallback - render full title normally
                                                return <span>{heroTitle}</span>;
                                            })()}
                                        </h1>
                                    </motion.div>



                                    {/* Subheadline with mixed colors */}
                                    <motion.div
                                        className="flex flex-wrap gap-2 items-center justify-center relative mt-2"
                                        initial={{ opacity: 0, y: 30 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.8, delay: 0.4 }}
                                    >
                                        <h2 className="text-slate-900 text-center font-caveat text-3xl md:text-[3rem] font-bold leading-none">
                                            {heroSubtitle.split('totally free!')[0] || "Simple, super, and"}
                                        </h2>
                                        <div className="relative inline-block">
                                            <h2 className="text-[#EAB308] text-center font-caveat text-3xl md:text-[3rem] font-bold leading-none">
                                                {heroSubtitle.includes('totally free!') ? 'totally free!' : 'totally free!'}
                                            </h2>
                                            {/* Decorative underline for "totally free!" - bolder */}
                                            <div className="absolute left-0 right-0 -bottom-1 h-2">
                                                <svg width="100%" height="8" viewBox="0 0 200 8" fill="none" preserveAspectRatio="none">
                                                    <path d="M2 4C50 2 100 6 150 3C170 2 180 5 198 4" stroke="#EAB308" strokeWidth="4" strokeLinecap="round" />
                                                </svg>
                                            </div>
                                        </div>
                                    </motion.div>

                                    {/* CTA Button - Straight */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.8, delay: 0.6 }}
                                        className="mt-3"
                                    >
                                        <Button className="bg-red-500 hover:bg-red-600 text-white font-bold px-8 py-3 rounded-lg text-base md:text-lg shadow-lg">
                                            Start now its free!
                                        </Button>
                                    </motion.div>
                                </div>
                            </>
                        )}
                    </div>
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
                                        {toolsLoading ? (
                                            // Show skeleton cards while loading
                                            Array.from({ length: 12 }).map((_, i) => (
                                                <ToolCardSkeleton key={i} />
                                            ))
                                        ) : (
                                            dashboardTools.map((tool, index) => (
                                                <ToolCard key={tool.title} tool={tool} index={index} />
                                            ))
                                        )}
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

                {/* Level Up section removed per design request */}

                {/* Productivity section removed per request */}

                {/* Tech Platform section removed per request */}

                {/* Enterprise section removed per request */}

                {/* Unified Bottom Section */}
                <section className="py-12 bg-white overflow-hidden">
                    <div className="container px-4 mx-auto text-center relative">
                        <ScaleOnScroll>
                            <div className="max-w-4xl mx-auto text-center">
                                {/* Intro text - similar to other sections */}
                                <p className="text-2xl md:text-3xl font-light text-slate-600 leading-relaxed mb-4">
                                    Grow your business, boss style
                                </p>
                                <h3 className="text-4xl md:text-5xl font-bold font-caveat text-slate-800 leading-none mb-6">
                                    <span>Join the crowd of </span>
                                    <span className="relative inline-block">
                                        <span className="text-[#01B0F1]">happy</span>
                                        <motion.div
                                            className="absolute bottom-1 left-0 w-full h-[0.15em] bg-[#4383BF] -z-10 opacity-60 transform -rotate-1"
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
                <footer className="bg-[#EFF7FF] border-t border-slate-100 pt-20 pb-12">
                    <div className="container px-4 mx-auto">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
                            {/* Brand Column */}
                            <div className="col-span-1 md:col-span-1">
                                <Link href="/" className="flex items-center mb-6">
                                    <img src="/pages/auth/18+christmas_logo.png" alt="18+ PDF" className="h-20 w-auto" />
                                </Link> 
                                <p className="text-slate-500 mb-6 leading-relaxed">
                                    Just finish work, and chill. No tension.
                                </p>
                                <div className="flex gap-4">
                                    {[Twitter, Linkedin].map((Icon, i) => (
                                        <motion.div key={i} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                                            <Link href="#" className="text-slate-400 hover:text-[#4383BF] transition-colors">
                                                <Icon className="w-5 h-5" />
                                            </Link>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>

                            {/* Links Columns */}
                            <div className="col-span-1 md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-8">
                                <div>
                                    <h3 className="font-bold text-lg mb-6 text-[#4383BF]">Company</h3>
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
                                        {["Twitter", "Vercel"].map((link) => (
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
                                Made with Lust by  <span className="text-[#FF0000] font-bold">CHN Technologies</span>
                            </div>
                        </div>
                    </div>
                </footer>
            </main>
        </div>
    );
}
