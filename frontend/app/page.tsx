"use client";

import { Header } from "./components/layout/header";
import { tools } from "./lib/tools";
import {
  ArrowRight, Check, Star, Zap, Shield, Users, Globe, Layout, FileText, Settings,
  Play, Download, ChevronRight, ArrowDown, MessageCircle, Github, Twitter, Linkedin,
  Youtube, Instagram, Facebook
} from "lucide-react";
import Link from "next/link";
import { Button } from "./components/ui/button";
import { motion, useScroll, useTransform, useInView, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";
import { useRef, useState } from "react";

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

export default function Home() {
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

  // Handwritten labels for the Odoo-style grid
  const handwrittenLabels = [
    { text: "iLovePDF", position: "top-left", row: 0, col: 0 },
    { text: "Adobe", position: "top", row: 0, col: 2 },
    { text: "SmallPDF", position: "top", row: 0, col: 4 },
    { text: "PDF24", position: "top-right", row: 0, col: 5 },
    { text: "Sejda", position: "right", row: 1, col: 5 },
    { text: "PDFCandy", position: "right", row: 2, col: 5 },
    { text: "Soda PDF", position: "right", row: 3, col: 5 },
    { text: "Nitro", position: "bottom-right", row: 3, col: 4 },
    { text: "Foxit", position: "bottom", row: 3, col: 2 },
    { text: "PDFescape", position: "left", row: 2, col: 0 },
  ];

  // App Icon Component with hover animation - optimized
  const AppIcon = ({ tool, index }: { tool: typeof tools[0]; index: number }) => {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.02, ease: "easeOut" }}
        style={{ willChange: "transform, opacity" }}
      >
        <Link href={tool.href} className="group flex flex-col items-center">
          <div
            className="relative flex h-[72px] w-[72px] items-center justify-center rounded-xl bg-white mb-2 border border-slate-200 transition-all duration-200 ease-out group-hover:border-slate-300 group-hover:bg-slate-50"
          >
            <tool.icon className="h-8 w-8 transition-colors" style={{ color: tool.color }} />
            {tool.isNew && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">
                NEW
              </span>
            )}
          </div>
          <span className="text-[12px] font-medium text-center text-slate-600 group-hover:text-slate-900 transition-colors duration-150 leading-tight max-w-20">
            {tool.title.replace("PDF", "").replace(" to ", " → ").trim()}
          </span>
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
      <Header />

      <main className="flex-1">
        {/* Hero Section with Parallax */}
        <section ref={heroRef} className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden bg-white">
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

                <h1 className="text-6xl md:text-[7rem] font-bold font-caveat text-slate-900 leading-[0.9] mb-6">
                  All your PDF tools on <br className="hidden md:block" />
                  <motion.span
                    className="relative inline-block whitespace-nowrap"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                  >
                    <span className="relative z-10">one platform.</span>
                    <motion.div
                      className="absolute top-2 -right-32 md:-right-48 lg:-right-64 hidden sm:block"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.2 }}
                    >
                      <div className="relative">
                        <svg className="absolute -left-16 top-4 w-12 h-10 text-[#714B67]" viewBox="0 0 50 40">
                          <path d="M45,20 C35,15 25,25 8,18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          <path d="M15,12 L6,18 L15,25" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <div className="font-caveat text-[#714B67] text-xl md:text-2xl leading-tight text-left transform rotate-6">
                          <div>0.00 Rs / month</div>
                          <div>for ALL tools</div>
                        </div>
                      </div>
                    </motion.div>
                    <motion.div
                      className="absolute -bottom-4 left-0 w-full h-[0.5em] text-[#FFC107] -z-10 opacity-60"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.8, delay: 0.8 }}
                    >
                      <svg viewBox="0 0 300 20" className="w-full h-full" preserveAspectRatio="none">
                        <path d="M0,10 Q150,20 300,10" fill="none" stroke="currentColor" strokeWidth="15" />
                      </svg>
                    </motion.div>
                  </motion.span>
                </h1>
              </motion.div>

              {/* Subheadline */}
              <motion.div
                className="relative inline-block mt-8"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                <h2 className="text-4xl md:text-[4rem] font-bold font-caveat text-slate-900 leading-none">
                  Simple, efficient, yet{" "}
                  <motion.span
                    className="relative inline-block text-[#017E84]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.8 }}
                  >
                    free!
                    <motion.div
                      className="absolute top-full left-0 w-full"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.6, delay: 1 }}
                    >
                      <svg viewBox="0 0 100 10" className="w-full h-4 text-[#017E84]" preserveAspectRatio="none">
                        <path d="M0,5 Q50,10 100,5" fill="none" stroke="currentColor" strokeWidth="3" />
                      </svg>
                    </motion.div>
                  </motion.span>
                </h2>
              </motion.div>

              {/* CTA Buttons */}
              <motion.div
                className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-12"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
              >
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button className="h-[50px] px-8 text-base rounded bg-[#714B67] hover:bg-[#5d3d54] text-white font-semibold shadow-sm">
                    Start now - It&apos;s free
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button variant="outline" className="h-[50px] px-8 text-base rounded border-slate-200 bg-slate-50 hover:bg-slate-100 text-[#714B67] font-semibold shadow-sm">
                    Explore Tools
                  </Button>
                </motion.div>
              </motion.div>

              {/* Scroll indicator */}
              <motion.div
                className="pt-16"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 }}
              >
                <motion.div
                  animate={{ y: [0, 10, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="flex flex-col items-center text-slate-400"
                >
                  <span className="text-sm mb-2">Scroll to explore</span>
                  <ArrowDown className="w-5 h-5" />
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        </section>

        {/* App Grid Section - Odoo Style with Handwritten Labels */}
        <section className="py-20 bg-linear-to-b from-slate-50 to-white relative overflow-hidden">
          {/* Background curved shape */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200%] h-[600px] bg-slate-50 rounded-b-[100%]"></div>
          </div>

          <div className="container px-4 md:px-6 mx-auto relative z-10">
            <div className="max-w-5xl mx-auto relative">
              {/* Main Grid with Handwritten Labels */}
              <div className="relative py-16">

                {/* Handwritten labels around the grid */}
                {/* Arrow marker definition - hand-drawn style */}
                <svg className="absolute w-0 h-0">
                  <defs>
                    <marker id="arrowhead-sketch" markerWidth="12" markerHeight="10" refX="10" refY="5" orient="auto">
                      <path d="M0,1 Q3,5 0,9 L10,5 Z" fill="#714B67" />
                    </marker>
                  </defs>
                </svg>

                {/* Top row labels - only show when toggle is ON */}
                {showCompetitors && (
                  <motion.div
                    className="absolute -top-20 left-[8%] font-caveat text-xl md:text-2xl text-[#714B67]"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <span className="inline-block transform -rotate-6">iLovePDF</span>
                    <svg className="absolute top-7 left-6 w-12 h-20 text-[#714B67]" viewBox="0 0 40 70">
                      <path d="M5,5 C10,20 8,35 20,55" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <path d="M12,48 L20,58 L24,46" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </motion.div>
                )}

                {showCompetitors && (
                  <motion.div
                    className="absolute -top-20 left-[28%] font-caveat text-xl md:text-2xl text-[#714B67]"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <span className="inline-block transform rotate-3">Adobe</span>
                    <svg className="absolute top-6 left-3 w-10 h-20 text-[#714B67]" viewBox="0 0 35 70">
                      <path d="M18,5 C15,25 20,40 18,58" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <path d="M12,50 L18,62 L24,50" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </motion.div>
                )}

                {showCompetitors && (
                  <motion.div
                    className="absolute -top-20 left-[50%] font-caveat text-xl md:text-2xl text-[#714B67]"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                  >
                    <span className="inline-block transform -rotate-3">SmallPDF</span>
                    <svg className="absolute top-6 left-5 w-10 h-20 text-[#714B67]" viewBox="0 0 35 70">
                      <path d="M20,5 C12,18 25,32 15,58" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <path d="M8,50 L14,62 L22,52" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </motion.div>
                )}

                {showCompetitors && (
                  <motion.div
                    className="absolute -top-20 right-[8%] font-caveat text-xl md:text-2xl text-[#714B67]"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <span className="inline-block transform rotate-6">PDF24</span>
                    <svg className="absolute top-6 left-2 w-10 h-20 text-[#714B67]" viewBox="0 0 35 70">
                      <path d="M15,5 C22,20 10,38 18,58" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <path d="M10,50 L18,62 L24,48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </motion.div>
                )}

                {/* Right side labels */}
                {showCompetitors && (
                  <motion.div
                    className="absolute top-[15%] -right-28 md:-right-36 font-caveat text-xl md:text-2xl text-[#714B67]"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.45 }}
                  >
                    <svg className="absolute top-1 -left-16 w-16 h-8 text-[#714B67]" viewBox="0 0 60 30">
                      <path d="M55,15 C40,12 25,18 8,15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <path d="M15,8 L5,15 L15,22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="inline-block transform rotate-6">Sejda</span>
                  </motion.div>
                )}

                {showCompetitors && (
                  <motion.div
                    className="absolute top-[38%] -right-32 md:-right-40 font-caveat text-xl md:text-2xl text-[#714B67]"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <svg className="absolute top-1 -left-16 w-16 h-8 text-[#714B67]" viewBox="0 0 60 30">
                      <path d="M55,18 C42,8 28,22 8,12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <path d="M16,5 L5,12 L14,20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="inline-block transform -rotate-3">PDFCandy</span>
                  </motion.div>
                )}

                {showCompetitors && (
                  <motion.div
                    className="absolute top-[60%] -right-28 md:-right-36 font-caveat text-xl md:text-2xl text-[#714B67]"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.55 }}
                  >
                    <svg className="absolute top-1 -left-16 w-16 h-8 text-[#714B67]" viewBox="0 0 60 30">
                      <path d="M55,12 C38,20 22,8 8,18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <path d="M15,10 L5,18 L16,24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="inline-block transform rotate-4">Soda PDF</span>
                  </motion.div>
                )}

                {/* Bottom labels */}
                {showCompetitors && (
                  <motion.div
                    className="absolute -bottom-16 right-[20%] font-caveat text-xl md:text-2xl text-[#714B67]"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    <svg className="absolute -top-16 left-3 w-10 h-16 text-[#714B67]" viewBox="0 0 35 60">
                      <path d="M18,55 C22,40 12,25 18,8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <path d="M10,16 L18,5 L26,16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="inline-block transform rotate-3">Nitro</span>
                  </motion.div>
                )}

                {showCompetitors && (
                  <motion.div
                    className="absolute -bottom-16 left-[35%] font-caveat text-xl md:text-2xl text-[#714B67]"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.65 }}
                  >
                    <svg className="absolute -top-16 left-2 w-10 h-16 text-[#714B67]" viewBox="0 0 35 60">
                      <path d="M15,55 C8,38 25,28 15,8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <path d="M8,16 L15,5 L22,16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="inline-block transform -rotate-4">Foxit</span>
                  </motion.div>
                )}

                {/* Left side labels */}
                {showCompetitors && (
                  <motion.div
                    className="absolute top-[50%] -left-32 md:-left-40 font-caveat text-xl md:text-2xl text-[#714B67]"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 }}
                  >
                    <span className="inline-block transform rotate-6">PDFescape</span>
                    <svg className="absolute top-0 -right-16 w-16 h-8 text-[#714B67]" viewBox="0 0 60 30">
                      <path d="M5,15 C20,8 35,22 52,12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <path d="M45,5 L55,12 L45,20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </motion.div>
                )}

                {showCompetitors && (
                  <motion.div
                    className="absolute top-[22%] -left-32 md:-left-40 font-caveat text-xl md:text-2xl text-[#714B67]"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.75 }}
                  >
                    <span className="inline-block transform -rotate-4">PDF Expert</span>
                    <svg className="absolute top-0 -right-16 w-16 h-8 text-[#714B67]" viewBox="0 0 60 30">
                      <path d="M5,18 C22,8 38,22 52,15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <path d="M44,8 L55,15 L44,22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </motion.div>
                )}

                {/* The actual grid */}
                <StaggerContainer className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-x-6 gap-y-8 justify-items-center px-8 md:px-16">
                  {dashboardTools.map((tool, index) => (
                    <AppIcon key={tool.title} tool={tool} index={index} />
                  ))}
                </StaggerContainer>
              </div>

              {/* Bottom toggle and link */}
              <ScrollReveal delay={0.3}>
                <div className="mt-12 flex flex-col md:flex-row items-center justify-between gap-6 px-4">
                  {/* Toggle switch */}
                  <motion.div
                    className="flex items-center gap-3"
                    whileHover={{ scale: 1.02 }}
                  >
                    {/* Decorative sparkle */}
                    <motion.svg
                      className="w-6 h-6 text-[#017E84]"
                      viewBox="0 0 24 24"
                      animate={{ rotate: [0, 15, -15, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <path fill="currentColor" d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z" />
                    </motion.svg>

                    <button
                      onClick={() => setShowCompetitors(!showCompetitors)}
                      className={`relative w-12 h-6 rounded-full cursor-pointer transition-colors duration-300 ${showCompetitors ? 'bg-[#714B67]' : 'bg-slate-300'}`}
                    >
                      <motion.div
                        className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
                        animate={{ left: showCompetitors ? '1.75rem' : '0.25rem' }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    </button>
                    <span className="text-base font-medium text-slate-700">Imagine without 18+ PDF</span>
                  </motion.div>

                  {/* View all link */}
                  <motion.div whileHover={{ x: 5 }}>
                    <Link href="/tools" className="text-[#017E84] font-semibold flex items-center gap-2 hover:underline text-lg">
                      View all Tools <ArrowRight className="w-5 h-5" />
                    </Link>
                  </motion.div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* Level Up Section */}
        <section className="py-24 bg-white overflow-hidden">
          <div className="container px-4 mx-auto">
            <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                <ScrollReveal direction="left">
                  <div className="text-left">
                    <h2 className="text-5xl md:text-[4.5rem] font-bold font-caveat text-slate-900 leading-none mb-8">
                      Level up <br />
                      your quality of{" "}
                      <span className="relative inline-block">
                        work
                        <motion.div
                          className="absolute bottom-2 left-0 w-full h-[0.4em] bg-[#4ADE80] -z-10 opacity-40 transform -rotate-2"
                          initial={{ scaleX: 0 }}
                          whileInView={{ scaleX: 1 }}
                          transition={{ duration: 0.8 }}
                          viewport={{ once: true }}
                        />
                      </span>
                    </h2>
                    <p className="text-xl text-slate-600 leading-relaxed mb-8">
                      Transform your document workflow with tools designed for professionals.
                      Fast, reliable, and always free.
                    </p>
                    <div className="flex flex-wrap gap-4">
                      {["Lightning fast", "Secure & private", "No registration"].map((item, i) => (
                        <motion.div
                          key={item}
                          className="flex items-center gap-2 text-slate-700"
                          initial={{ opacity: 0, x: -20 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.15 }}
                          viewport={{ once: true }}
                        >
                          <div className="w-5 h-5 rounded-full bg-[#4ADE80] flex items-center justify-center">
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
                  Optimized for{" "}
                  <span className="relative inline-block">
                    productivity
                    <motion.div
                      className="absolute bottom-4 left-0 w-full h-[0.4em] bg-[#FCD34D] -z-10 opacity-50 transform rotate-1"
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
                  <span className="font-semibold">Experience true speed,</span> reduced clicks, <br />
                  smart processing, and a fast UI.
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
                  All the tech <br />
                  in one platform
                </h2>
              </div>
            </ScrollReveal>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
              <FeatureCard
                title="Convert"
                description="PDF to Word, Excel & more"
                image="https://illustrations.popsy.co/blue/digital-nomad.svg"
                bgColor="bg-blue-50"
                borderColor="border-blue-100"
                delay={0}
              />
              <FeatureCard
                title="Edit"
                description="Add text, images & shapes"
                image="https://illustrations.popsy.co/violet/graphic-design.svg"
                bgColor="bg-purple-50"
                borderColor="border-purple-100"
                delay={0.1}
              />
              <FeatureCard
                title="Sign"
                description="E-signatures made easy"
                image="https://illustrations.popsy.co/green/working-vacation.svg"
                bgColor="bg-green-50"
                borderColor="border-green-100"
                delay={0.2}
              />
              <FeatureCard
                title="Protect"
                description="Password & encryption"
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
                    PDF{" "}
                    <span className="relative inline-block">
                      software
                      <div className="absolute inset-0 bg-[#E0E7FF] -z-10 transform -rotate-2 scale-110 rounded-lg opacity-50"></div>
                    </span>{" "}
                    <br />
                    done{" "}
                    <span className="relative inline-block">
                      right
                      <motion.div
                        className="absolute bottom-2 left-0 w-full h-2 bg-[#714B67] rounded-full"
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
                    <h3 className="text-2xl font-semibold text-slate-900 mb-4">100% Free & Secure</h3>
                    <p className="text-lg text-slate-600 mb-8">
                      We believe in accessible tools for everyone. No hidden fees, no credit cards.
                    </p>
                    <Button className="bg-[#714B67] hover:bg-[#5d3d54] text-white">
                      Read our Privacy Policy
                    </Button>
                  </motion.div>
                </StaggerItem>

                <StaggerItem>
                  <motion.div
                    className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 h-full"
                    whileHover={{ y: -5, boxShadow: "0 20px 40px rgba(0,0,0,0.1)" }}
                  >
                    <h3 className="text-2xl font-semibold text-slate-900 mb-4">No Installation</h3>
                    <p className="text-lg text-slate-600 mb-8">
                      Works in your browser. Compatible with Windows, Mac, Linux, and mobile.
                    </p>
                    <Button variant="outline" className="text-[#714B67] border-[#714B67]">
                      Supported Browsers
                    </Button>
                  </motion.div>
                </StaggerItem>
              </StaggerContainer>
            </div>
          </div>
        </section>

        {/* Users Section */}
        <section className="py-32 bg-white relative">
          <div className="container px-4 mx-auto text-center">
            <ScaleOnScroll>
              <motion.div
                className="inline-block relative"
                whileHover={{ scale: 1.02 }}
              >
                <p className="text-2xl text-slate-600 mb-2">who grow their business with 18+ PDF</p>
                <h2 className="text-6xl font-bold font-caveat text-slate-900 leading-none">
                  Join thousands of <br />
                  <motion.span
                    className="text-[#F59E0B]"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    happy
                  </motion.span>{" "}
                  users
                </h2>
              </motion.div>
            </ScaleOnScroll>
          </div>
        </section>

        {/* Unleash Section */}
        <section className="py-32 bg-white overflow-hidden">
          <div className="container px-4 mx-auto text-center relative">
            <ScaleOnScroll>
              <h2 className="text-[6rem] md:text-[8rem] font-bold font-caveat text-slate-900 leading-[0.8] mb-8">
                <motion.span
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  viewport={{ once: true }}
                  className="block"
                >
                  Master
                </motion.span>
                <motion.span
                  className="relative inline-block"
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  viewport={{ once: true }}
                >
                  your documents
                  <motion.div
                    className="absolute -top-8 -right-12 text-[#FFC107]"
                    animate={{ rotate: [0, 15, 0], scale: [1, 1.2, 1] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    <svg width="60" height="60" viewBox="0 0 50 50">
                      <path d="M25,0 L30,20 L50,25 L30,30 L25,50 L20,30 L0,25 L20,20 Z" fill="currentColor" />
                    </svg>
                  </motion.div>
                </motion.span>
              </h2>
            </ScaleOnScroll>

            <motion.div
              className="flex flex-col items-center gap-4"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              viewport={{ once: true }}
            >
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button className="h-[60px] px-10 text-xl rounded bg-[#714B67] hover:bg-[#5d3d54] text-white font-semibold shadow-lg">
                  Get Started Free
                </Button>
              </motion.div>
              <div className="text-slate-500 text-sm">
                No registration required • Instant access
              </div>
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-[#252733] text-white py-16">
          <div className="container px-4 mx-auto">
            <StaggerContainer className="grid grid-cols-1 md:grid-cols-4 gap-12" staggerDelay={0.1}>
              {[
                { title: "Community", links: ["Tutorials", "Documentation", "Forum"] },
                { title: "Open Source", links: ["Download", "Github", "Runbot"] },
                { title: "Services", links: ["Hosting", "Support", "Upgrade"] },
                { title: "About us", links: ["Our company", "Contact us", "Jobs"] }
              ].map((section) => (
                <StaggerItem key={section.title}>
                  <div>
                    <h3 className="font-semibold text-lg mb-6">{section.title}</h3>
                    <ul className="space-y-3 text-slate-400">
                      {section.links.map((link) => (
                        <li key={link}>
                          <Link href="#" className="hover:text-white transition-colors">{link}</Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>

            <motion.div
              className="border-t border-slate-700 mt-16 pt-8 flex flex-col md:flex-row justify-between items-center gap-4"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              viewport={{ once: true }}
            >
              <div className="text-slate-400 text-sm">
                Website made with <span className="text-white font-semibold">18+ PDF</span>
              </div>
              <div className="flex gap-4">
                {[Facebook, Twitter, Linkedin, Github, Instagram].map((Icon, i) => (
                  <motion.div
                    key={i}
                    whileHover={{ scale: 1.2, y: -2 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Link href="#" className="text-slate-400 hover:text-white">
                      <Icon className="w-5 h-5" />
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </footer>
      </main>
    </div>
  );
}
