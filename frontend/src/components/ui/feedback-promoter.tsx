"use client";

import { useState } from "react";
import { Info, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export function FeedbackPromoter() {
    const router = useRouter();
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            className={cn(
                "fixed right-0 top-1/2 -translate-y-1/2 z-50 flex items-center bg-white border-2 border-[#136dec] border-r-0 shadow-[-6px_0_12px_-3px_rgba(0,0,0,0.15)] transition-all duration-300 ease-out overflow-hidden h-[110px]",
                // Shape: Always rounded left for the 'curve', refined border radius
                // Height: auto to fit content
                // Width: changes on hover
                "rounded-l-[32px]",
                isHovered ? "w-80" : "w-[72px]"
            )}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Icon Section (Always visible) */}
            <div className="min-w-[72px] h-[110px] flex items-center justify-center shrink-0">
                <div
                    className="relative w-16 h-16 transition-transform duration-300 ease-out origin-center"
                    style={{ transform: isHovered ? 'scale(1.1)' : 'scale(1)' }}
                >
                    <img
                        src="/feedback-icon.png"
                        alt="Feedback"
                        className="w-full h-full object-contain"
                    />
                </div>
            </div>

            {/* Content Section (Revealed on hover) */}
            <div className="flex flex-col items-start gap-2 pr-6 py-4 w-full min-w-[248px]">
                <div className="space-y-0.5">
                    <h3 className="font-bold text-[#111418] text-sm leading-tight whitespace-nowrap">
                        Get 3 Months Premium
                    </h3>
                    <p className="text-[#617289] text-xs leading-snug whitespace-nowrap">
                        Help us improve & get rewarded!
                    </p>
                </div>

                <Button
                    size="sm"
                    className="w-full bg-[#136dec] hover:bg-[#115bb5] text-white font-bold text-xs h-8 whitespace-nowrap"
                    onClick={() => router.push('/profile/feedback')}
                >
                    Fill Feedback
                </Button>
            </div>
        </div>
    );
}
