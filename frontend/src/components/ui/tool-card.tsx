"use client";

import Link from "next/link";
import { GlowCard } from "@/components/spotlight-card";
import { motion } from "framer-motion";

interface ToolCardProps {
    title: string;
    description: string;
    icon: React.ReactNode;
    href: string;
    isNew?: boolean;
    category?: string;
}

const getCategoryColor = (category?: string) => {
    switch (category) {
        case "Organize PDF": return { glow: "blue", color: "#226DB4" };
        case "Optimize PDF": return { glow: "green", color: "#089949" };
        case "Convert to PDF": return { glow: "orange", color: "#F9B21D" };
        case "Convert from PDF": return { glow: "red", color: "#E42527" };
        case "Edit PDF": return { glow: "blue", color: "#226DB4" };
        case "PDF Security": return { glow: "green", color: "#089949" };
        default: return { glow: "blue", color: "#226DB4" };
    }
};

export function ToolCard({ title, description, icon, href, isNew, category }: ToolCardProps) {
    const { glow, color } = getCategoryColor(category);
    
    return (
        <Link href={href} className="block h-full">
            <motion.div
                whileHover={{ y: -5 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="h-full"
            >
                <GlowCard
                    customSize={true}
                    className="h-full w-full border border-border bg-card/80 p-6 text-left dark:border-border dark:bg-card/80"
                    glowColor={glow as any}
                >
                    <div className="flex flex-col h-full">
                        <div className="mb-4 flex items-center justify-between">
                            <div 
                                className="flex h-10 w-10 items-center justify-center rounded-lg"
                                style={{ backgroundColor: `${color}1A`, color: color }}
                            >
                                {icon}
                            </div>
                            {isNew && (
                                <span className="rounded-full bg-secondary/10 px-2 py-0.5 text-xs font-medium text-secondary">
                                    New
                                </span>
                            )}
                        </div>
                        <h3 className="mb-2 text-lg font-semibold text-foreground">{title}</h3>
                        <p className="text-sm text-muted-foreground">{description}</p>
                    </div>
                </GlowCard>
            </motion.div>
        </Link>
    );
}
