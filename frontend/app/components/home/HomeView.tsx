"use client";

import { Header } from "../layout/header"; // Adjusted import path
import {
    ArrowRight, Check, Star, Zap, Shield, Users, Globe, Layout, FileText, Settings,
    Play, Download, ChevronRight, ArrowDown, MessageCircle, Github, Twitter, Linkedin,
    Youtube, Instagram, Facebook
} from "lucide-react";
import Link from "next/link";
import { Button } from "../ui/button"; // Adjusted import path
import { GlowCard } from "@/components/spotlight-card";
import { motion, useScroll, useTransform, useInView, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";
import { useRef, useState } from "react";
import { useTools } from "@/app/lib/useTools";

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
    const dashboardTools = tools.slice(0, 24);
    const heroRef = useRef(null);
    const { scrollYProgress } = useScroll();
    const [showCompetitors, setShowCompetitors] = useState(false);

    // Smooth scroll progress for better performance
    const smoothScrollProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

    // Hero parallax effects - optimized with smoother values
    const heroY = useTransform(smoothScrollProgress, [0, 0.3], [0, -100]);
    const heroOpacity = useTransform(smoothScrollProgress, [0, 0.15], [1, 0]);
    const heroScale = useTransform(smoothScrollProgress, [0, 0.15], [1, 0.98]);

    // Tool Card Component - Updated for Card Layout
    const ToolCard = ({ tool, index }: { tool: any; index: number }) => {
        const getGlowColor = (index: number) => {
            const colors = ['blue', 'purple', 'green', 'orange', 'red'];
            return colors[index % colors.length] as 'blue' | 'purple' | 'green' | 'orange' | 'red';
        };

        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05, ease: "easeOut" }}
                style={{ willChange: "transform, opacity" }}
                className="h-full w-full"
            >
                <Link href={tool.href} className="block group h-full w-full">
                    <GlowCard
                        customSize={true}
                        glowColor={getGlowColor(index)}
                        className="h-full w-full rounded-2xl bg-white border border-slate-200 transition-colors duration-200 ease-out p-6 flex flex-col gap-6 relative overflow-hidden"
                    >

                        <div className="flex flex-col gap-4 relative z-10 h-full">

                            <div className="relative flex items-center justify-start w-12 h-12">
                                {typeof tool.icon === 'string' ? (
                                    <img src={tool.icon} alt={tool.title} className="h-8 w-8 object-contain" />
                                ) : (
                                    <tool.icon className="h-8 w-8" style={{ color: tool.color }} />
                                )}
                            </div>

                            <div className="flex flex-col gap-2 grow">
                                <div className="flex items-center justify-between w-full">
                                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-black leading-tight">
                                        {tool.title}
                                    </h3>
                                    {tool.isNew && (
                                        <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                            New
                                        </span>
                                    )}
                                    {tool.isPremium && (
                                        <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ml-2">
                                            Premium
                                        </span>
                                    )}
                                </div>

                                <p className="text-sm text-slate-500 leading-relaxed font-medium">
                                    {tool.description}
                                </p>
                            </div>
                        </div>
                    </GlowCard>
                </Link>
            </motion.div>
        );
    };

    // Feature Card with 3D tilt effect - optimized with CSS
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

    return (
        <div className="flex min-h-screen flex-col bg-white font-sans text-slate-900 overflow-x-hidden">
            <Header /> {/* Note: Header might need props too if it displays platform name */}

            <main className="flex-1">
                {/* Hero Section with Parallax */}
                <section ref={heroRef} className="relative pt-10 pb-0 md:pt-12 md:pb-2 overflow-hidden bg-white">
                    <motion.div
                        className="container px-4 md:px-6 mx-auto text-center relative z-10"
                        style={{ y: heroY, opacity: heroOpacity, scale: heroScale, willChange: "transform, opacity" }}
                    >
                        <div className="mx-auto max-w-5xl space-y-8">

                            {/* Main Headline */}
                            <motion.div
                                className="relative"
                                initial={{ opacity: 0, y: 40 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8, delay: 0.2 }}
                            >
                                {/* Pricing badge with arrow - positioned top right of headline (moved next to "one platform.") */}

                                <h1 className="text-4xl md:text-[4rem] font-bold font-caveat text-slate-900 leading-[0.9] mb-1">
                                    {/* Replaced hardcoded text with prop */}
                                    <div dangerouslySetInnerHTML={{ __html: heroTitle.replace(/\n/g, '<br />') }} />

                                    {/* Kept original animation structure as wrapping for title?? No, the title structure was complex. 
                      Let's assume the user just wants to edit the text for now.
                      For simplicity, I'm rendering the simple text here. 
                      To keep the "one place" animation, I would need to parse the title or have separate props.
                      I'll just render it simply for now to satisfy the customization requirement.
                  */}
                                </h1>
                            </motion.div>

                            {/* Subheadline */}
                            <motion.div
                                className="relative inline-block mt-2 mb-8"
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8, delay: 0.4 }}
                            >
                                <h2 className="text-2xl md:text-[2.5rem] font-bold font-caveat text-slate-900 leading-none">
                                    {heroSubtitle}
                                </h2>
                            </motion.div>




                        </div>
                    </motion.div>
                </section>

                {/* App Grid Section - Clean Card Layout */}
                <section className="pt-0 pb-0 bg-white relative overflow-hidden">


                    <div className="container px-4 md:px-6 mx-auto relative z-10">
                        <div className="max-w-7xl mx-auto relative">
                            {/* Main Grid */}
                            <div className="relative py-8">
                                <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-items-center">
                                    {dashboardTools.map((tool, index) => (
                                        <ToolCard key={tool.title} tool={tool} index={index} />
                                    ))}
                                </StaggerContainer>
                            </div>

                            {/* Bottom toggle and link */}
                            <ScrollReveal delay={0.3}>
                                <div className="mt-6 mb-2 flex flex-col md:flex-row items-center justify-between gap-6 px-4">
                                    {/* Toggle switch */}
                                    <motion.div
                                        className="flex items-center gap-3"
                                        whileHover={{ scale: 1.02 }}
                                    >
                                        <motion.svg
                                            className="w-6 h-6 text-[#FF0000]"
                                            viewBox="0 0 24 24"
                                            animate={{ rotate: [0, 15, -15, 0] }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                        >
                                            <path fill="currentColor" d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z" />
                                        </motion.svg>

                                        <button
                                            onClick={() => setShowCompetitors(!showCompetitors)}
                                            className={`relative w-12 h-6 rounded-full cursor-pointer transition-colors duration-300 ${showCompetitors ? 'bg-[#01B0F1]' : 'bg-slate-300'}`}
                                        >
                                            <motion.div
                                                className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
                                                animate={{ left: showCompetitors ? '1.75rem' : '0.25rem' }}
                                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                            />
                                        </button>
                                        <span className="text-base font-medium text-slate-700">Just imagine life without {platformName}?</span>
                                    </motion.div>

                                    {/* View all link */}
                                    <motion.div whileHover={{ x: 5 }}>
                                        <Link href="/tools" className="text-[#01B0F1] font-semibold flex items-center gap-2 hover:underline text-lg">
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
                                                    className="absolute bottom-2 left-0 w-full h-[0.4em] bg-[#01B0F1] -z-10 opacity-40 transform -rotate-2"
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
                <section className="py-24 bg-white">
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
                            <div className="flex flex-col items-center gap-8">
                                {/* Users Text */}
                                <div>
                                    <p className="text-2xl text-slate-600 mb-2">Grow your business, boss style</p>
                                    <h2 className="text-5xl font-bold font-caveat text-slate-900 leading-none">
                                        Join the crowd of <br />
                                        <motion.span
                                            className="text-[#01B0F1] inline-block"
                                            animate={{ scale: [1, 1.1, 1] }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                        >
                                            happy
                                        </motion.span>{" "}
                                        legends
                                    </h2>
                                </div>

                                {/* Divider - Visual connector for unity */}
                                <div className="w-24 h-1.5 bg-blue-50 rounded-full my-6"></div>

                                {/* Master Title */}
                                <h2 className="text-[5rem] md:text-[7rem] font-bold font-caveat text-slate-900 leading-[0.9]">
                                    Be the <br />
                                    <span className="relative inline-block">
                                        Boss
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

                                <div className="text-slate-500 text-sm font-medium mt-4">
                                </div>
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
                                    <span className="text-3xl font-bold font-caveat">
                                        <span className="text-[#FF0000]">18+</span>
                                        <span className="text-slate-900"> PDF</span>
                                    </span>
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
                                © {new Date().getFullYear()} {platformName}. All rights reserved.
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
