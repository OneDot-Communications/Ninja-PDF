"use client";

import { Header } from "./components/layout/header";
import { Footer } from "./components/layout/footer";
import { ToolCard } from "./components/ui/tool-card";
import { tools } from "./lib/tools";
import { ArrowRight, Check, Code, Globe, Lock, Shield, Zap, Server, Layout, FileText, Users, Terminal, Upload, Settings, Play, Download } from "lucide-react";
import Link from "next/link";
import { Button } from "./components/ui/button";
import { LogoCloud } from "../components/logo-cloud-3";
import RadialOrbitalTimeline from "../components/ui/radial-orbital-timeline";

export default function Home() {
  const categories = [
    "Organize PDF",
    "Optimize PDF",
    "Convert to PDF",
    "Convert from PDF",
    "Edit PDF",
    "PDF Security",
  ];

  const logos = [
    {
      src: "https://svgl.app/library/nvidia-wordmark-light.svg",
      alt: "Nvidia Logo",
    },
    {
      src: "https://svgl.app/library/supabase_wordmark_light.svg",
      alt: "Supabase Logo",
    },
    {
      src: "https://svgl.app/library/openai_wordmark_light.svg",
      alt: "OpenAI Logo",
    },
    {
      src: "https://svgl.app/library/turso-wordmark-light.svg",
      alt: "Turso Logo",
    },
    {
      src: "https://svgl.app/library/vercel_wordmark.svg",
      alt: "Vercel Logo",
    },
    {
      src: "https://svgl.app/library/github_wordmark_light.svg",
      alt: "GitHub Logo",
    },
    {
      src: "https://svgl.app/library/claude-ai-wordmark-icon_light.svg",
      alt: "Claude AI Logo",
    },
    {
      src: "https://svgl.app/library/clerk-wordmark-light.svg",
      alt: "Clerk Logo",
    },
  ];

  const timelineData = [
    {
      id: 1,
      title: "Upload PDF",
      date: "Step 1",
      content: "Upload your PDF files securely to our platform.",
      category: "Upload",
      icon: Upload,
      relatedIds: [2],
      status: "completed" as const,
      energy: 100,
    },
    {
      id: 2,
      title: "Choose Tool",
      date: "Step 2",
      content: "Select from 50+ PDF tools - merge, split, convert, compress, and more.",
      category: "Select",
      icon: Settings,
      relatedIds: [1, 3],
      status: "completed" as const,
      energy: 90,
    },
    {
      id: 3,
      title: "Configure",
      date: "Step 3",
      content: "Customize settings like quality, format, page range, and security options.",
      category: "Configure",
      icon: Code,
      relatedIds: [2, 4],
      status: "in-progress" as const,
      energy: 60,
    },
    {
      id: 4,
      title: "Process",
      date: "Step 4",
      content: "Our advanced algorithms process your PDF with lightning speed.",
      category: "Process",
      icon: Play,
      relatedIds: [3, 5],
      status: "pending" as const,
      energy: 30,
    },
    {
      id: 5,
      title: "Download",
      date: "Step 5",
      content: "Download your processed PDF instantly - 100% free and secure.",
      category: "Download",
      icon: Download,
      relatedIds: [4],
      status: "pending" as const,
      energy: 10,
    },
  ];

  return (
    <div className="flex min-h-screen flex-col font-sans text-foreground">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-background pt-20 pb-32 text-center">
          <div className="container mx-auto px-4 md:px-6">
            <h1 className="mx-auto mb-8 max-w-4xl text-5xl font-bold leading-tight tracking-tight text-foreground md:text-6xl">
              Every tool you need to work with PDFs in one place
            </h1>

            <div className="mx-auto mb-10 max-w-2xl space-y-2 text-xl text-muted-foreground">
              <p>Every tool you need to use PDFs, at your fingertips. All are 100% FREE and easy to use! Merge, split, compress, convert, rotate, unlock and watermark PDFs with just a few clicks.</p>
            </div>

            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/features">
                <Button size="lg" className="h-14 rounded-xl px-8 text-lg font-semibold">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Logo Cloud and Timeline Section */}
        <section className="relative py-16">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
              {/* Logo Cloud */}
              <div className="text-center lg:text-left">
                <div className="h-16 flex items-center justify-center lg:justify-start mb-5">
                  <h2 className="text-center font-medium text-foreground text-xl tracking-tight md:text-3xl">
                    <span className="text-muted-foreground">Trusted by experts.</span>
                    <br />
                    <span className="font-semibold">Used by the leaders.</span>
                  </h2>
                </div>
                <div className="mx-auto my-5 h-px max-w-sm bg-border mask-[linear-gradient(to_right,transparent,black,transparent)]" />

                <LogoCloud logos={logos} />

                <div className="mt-5 h-px bg-border mask-[linear-gradient(to_right,transparent,black,transparent)]" />
              </div>

              {/* Timeline */}
              <div className="text-center">
                <div className="h-16 flex items-center justify-center mb-4">
                  <h2 className="text-3xl font-bold text-foreground">
                    How It Works
                  </h2>
                </div>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
                  Transform your PDFs in just 5 simple steps. Our intuitive workflow makes PDF processing effortless.
                </p>

                <div className="flex justify-center max-h-96">
                  <RadialOrbitalTimeline timelineData={timelineData} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Tools Section */}
        <section className="bg-muted py-32">
          <div className="container mx-auto px-4 md:px-6">
            {categories.map((category) => {
              const categoryTools = tools.filter((tool) => tool.category === category);
              if (categoryTools.length === 0) return null;

              return (
                <div key={category} className="mb-16">
                  <h2 className="mb-8 text-2xl font-bold text-foreground">{category}</h2>
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {categoryTools.map((tool) => (
                      <ToolCard
                        key={tool.href}
                        title={tool.title}
                        description={tool.description}
                        icon={<tool.icon className="h-8 w-8" />}
                        href={tool.href}
                        isNew={tool.isNew}
                        category={tool.category}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

