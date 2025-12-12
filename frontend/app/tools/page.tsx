"use client";

import { Header } from "../components/layout/header";
import { Footer } from "../components/layout/footer";
import { tools } from "../lib/tools";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Search } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

// Group tools by category
const categories = Array.from(new Set(tools.map((tool) => tool.category)));

export default function ToolsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const searchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // debounce search input for better performance
    const id = setTimeout(() => setDebouncedQuery(searchQuery), 250);
    return () => clearTimeout(id);
  }, [searchQuery]);

  // / keyboard shortcut to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // don't capture if modifier keys are used
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const el = searchRef.current;
        if (el) {
          e.preventDefault();
          el.focus();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const filteredTools = tools.filter((tool) =>
    tool.title.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
    tool.description.toLowerCase().includes(debouncedQuery.toLowerCase())
  );

  // Odoo-style App Icon Component with dynamic colors
  const AppIcon = ({ tool }: { tool: typeof tools[0] }) => {
    const iconColor = tool.color || "#714B67";
    const bgColor = `${iconColor}10`; // 10% opacity for background tint
    
    const descriptionId = `tool-desc-${tool.title.replace(/\s+/g, "-").toLowerCase()}`;

    return (
      <Link
        href={tool.href}
        aria-label={`${tool.title} — ${tool.description}`}
        className="group focus:outline-none flex flex-col items-center transition-all hover:-translate-y-1"
        tabIndex={0}
        title={tool.title}
        onKeyDown={(e: any) => {
          if (e.key === "Enter") {
            // support keyboard navigation
            (e.target as HTMLElement)?.click?.();
          }
        }}
        aria-describedby={descriptionId}
      >
        <div 
          className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-white shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-all duration-300 group-hover:shadow-[0_8px_20px_rgba(0,0,0,0.12)] mb-3 border border-slate-100/80"
          style={{ backgroundColor: bgColor }}
        >
          <tool.icon 
            className="h-10 w-10 transition-transform duration-200 group-hover:scale-110" 
            style={{ color: iconColor }}
            strokeWidth={1.8} 
          />
          {tool.isNew && (
            <span className="absolute -top-1.5 -right-1.5 bg-brand-red text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
              NEW
            </span>
          )}
        </div>

        <div className="relative w-full flex flex-col items-center">
          <span className="text-[13px] font-semibold text-center text-slate-700 group-hover:text-slate-900 transition-colors leading-tight px-1 max-w-[90px]">
            {tool.title.replace("PDF", "").trim()}
          </span>
          {/* Hover/focus description */}
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            whileHover={{ opacity: 1, y: 0 }}
            whileFocus={{ opacity: 1, y: 0 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="pointer-events-none absolute -top-16 w-60 rounded-md p-3 bg-white border border-slate-100 shadow-md text-left text-[13px] leading-snug text-slate-700 opacity-0 group-hover:opacity-100 group-focus:opacity-100"
            role="tooltip"
            id={descriptionId}
            aria-hidden={true}
          >
            <div className="font-medium text-sm text-slate-800 mb-1">{tool.title}</div>
            <div className="text-xs text-slate-600">{tool.description}</div>
            <div className="mt-2">
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#714B67]">
                Try <ArrowRight className="h-3 w-3 inline-block" />
              </span>
            </div>
          </motion.div>
        </div>
      </Link>
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-900">
      <Header />
      
      <main className="flex-1 pt-24 pb-20">
        <div className="container px-4 md:px-6 mx-auto">
          
          {/* Header Section */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h1 className="text-5xl md:text-6xl font-bold font-caveat text-slate-900 mb-6">
              All PDF Tools
            </h1>
            <p className="text-xl text-slate-600 mb-8 font-light">
              Everything you need to manage and edit your documents in one place — simple tasks made effortless.
              <span className="block text-sm text-slate-500 mt-2">Not sure what to pick? Type a task (e.g. "compress" or "convert to Word") and we'll find the best tool.</span>
            </p>
            
            {/* Search Bar */}
            <div className="relative max-w-md mx-auto">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-full leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#714B67] focus:border-transparent shadow-sm transition-all"
                placeholder="Search for a tool (press '/' to focus)..."
                aria-label="Search tools"
                aria-describedby="search-help"
                value={searchQuery}
                ref={searchRef}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div id="search-help" className="sr-only">Press slash to focus search. Results update as you type.</div>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm text-slate-400">/
              </div>
            </div>
          </div>

          {/* Tools Grid */}
          <div className="max-w-7xl mx-auto space-y-16">
            {/* Popular / Recommended Tools */}
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100">
              <h2 className="text-xl md:text-2xl font-semibold text-slate-800 mb-4">
                Recommended for you
                <span className="ml-3 text-sm text-slate-400 font-normal">— curated picks to get started</span>
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-x-6 gap-y-8 justify-items-center">
                {[
                  "Merge PDF",
                  "Compress PDF",
                  "Edit PDF",
                  "PDF to Word",
                  "OCR PDF",
                  "Organize PDF",
                ].map((title) => {
                  const t = tools.find((tt) => tt.title === title);
                  if (!t) return null;
                  return <AppIcon key={t.title} tool={t} />;
                })}
              </div>
            </div>
            {searchQuery ? (
              // Search Results View
              <div>
                <h2 className="text-2xl font-semibold text-slate-800 mb-8 px-4">Search Results</h2>
                {filteredTools.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-x-6 gap-y-12 justify-items-center">
                    {filteredTools.map((tool) => (
                      <AppIcon key={tool.title} tool={tool} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-500" role="status" aria-live="polite">
                    <div className="mb-2">No results for "{searchQuery}"</div>
                    <div className="text-sm">Try searching for a different name, or browse by category below.</div>
                  </div>
                )}
              </div>
            ) : (
              // Categorized View
              categories.map((category) => {
                const categoryTools = tools.filter((t) => t.category === category);
                if (categoryTools.length === 0) return null;

                return (
                  <div key={category} className="bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-slate-100">
                    <h2 className="text-2xl md:text-3xl font-bold font-caveat text-[#714B67] mb-8 border-b border-slate-100 pb-4 inline-block">
                      {category}
                    </h2>
                    <div className="text-sm text-slate-500 mb-4">{categoryTools.length} tools in this category</div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-x-6 gap-y-12 justify-items-center">
                      {categoryTools.map((tool) => (
                        <AppIcon key={tool.title} tool={tool} />
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
