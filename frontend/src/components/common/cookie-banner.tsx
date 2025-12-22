"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function CookieBanner() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Check if user has already consented
        const consented = localStorage.getItem("cookie-consent");
        if (!consented) {
            // Show banner after a small delay
            const timer = setTimeout(() => setIsVisible(true), 1000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem("cookie-consent", "true");
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className={cn(
            "fixed bottom-0 left-0 right-0 z-50 p-4 mx-auto max-w-7xl md:mb-4 md:mx-4 md:w-auto md:left-auto md:right-4",
            "bg-slate-900/95 text-white backdrop-blur-sm rounded-xl shadow-2xl border border-slate-700/50",
            "transform transition-all duration-500 ease-in-out"
        )}>
            <div className="flex flex-col md:flex-row items-center gap-4 max-w-md">
                <div className="flex-1 text-sm text-slate-300">
                    <p>
                        We use cookies to improve your experience and analyze traffic.
                        By using 18+ PDF, you agree to our <a href="/legal/privacy-policy" className="text-primary hover:underline">Privacy Policy</a>.
                    </p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={handleAccept}
                        className="w-full md:w-auto whitespace-nowrap"
                    >
                        Accept All
                    </Button>
                    <button
                        onClick={() => setIsVisible(false)}
                        className="text-slate-400 hover:text-white transition-colors"
                        aria-label="Close"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
