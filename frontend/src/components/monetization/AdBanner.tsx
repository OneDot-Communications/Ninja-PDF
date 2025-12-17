"use client";

import { useAuth } from "@/app/context/AuthContext";
import { X } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";

interface AdBannerProps {
    placement?: "top" | "bottom" | "sidebar";
    className?: string;
}

/**
 * Task 161-164: Ads & Monetization for Free Users
 * This component shows ads only to free users (Plan.show_ads === true)
 */
export function AdBanner({ placement = "bottom", className = "" }: AdBannerProps) {
    const { user } = useAuth();
    const [dismissed, setDismissed] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Don't show ads if:
    // - User is premium (has subscription with plan that doesn't show ads)
    // - User is admin/super-admin
    // - User dismissed the ad
    // - Component not mounted (SSR)
    if (!mounted) return null;
    if (dismissed) return null;
    if (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') return null;
    if (user?.subscription_tier && user.subscription_tier !== 'FREE') return null;

    const placementClasses = {
        top: "fixed top-16 left-0 right-0 z-40",
        bottom: "fixed bottom-0 left-0 right-0 z-40",
        sidebar: "relative w-full"
    };

    return (
        <div className={`bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white px-4 py-3 ${placementClasses[placement]} ${className}`}>
            <div className="container mx-auto flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <span className="text-xs font-medium uppercase tracking-wider opacity-75">
                        Upgrade Available
                    </span>
                    <p className="text-sm font-medium">
                        🚀 Remove ads, unlock all tools, and get priority processing!
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        href="/pricing"
                        className="bg-white text-purple-600 px-4 py-1.5 rounded-full text-sm font-bold hover:bg-purple-50 transition-colors"
                    >
                        Upgrade Now
                    </Link>
                    <button
                        onClick={() => setDismissed(true)}
                        className="p-1 hover:bg-white/10 rounded-full transition-colors"
                        aria-label="Dismiss ad"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}

/**
 * Smaller inline upgrade prompt for tool pages
 */
export function UpgradePrompt({ feature }: { feature?: string }) {
    const { user } = useAuth();

    // Don't show if user is already premium
    if (user?.subscription_tier && user.subscription_tier !== 'FREE') return null;

    return (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
                <div className="text-2xl">✨</div>
                <div className="flex-1">
                    <h4 className="font-semibold text-amber-800">
                        {feature ? `Unlock ${feature}` : 'Go Premium'}
                    </h4>
                    <p className="text-sm text-amber-700 mt-1">
                        Remove limits, watermarks, and ads. Get faster processing and all premium tools.
                    </p>
                    <div className="mt-3">
                        <Link
                            href="/pricing"
                            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                            View Plans
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Feature lock notification shown when user tries to access premium feature
 */
export function FeatureLockNotice({ featureName }: { featureName: string }) {
    return (
        <div className="bg-slate-100 border border-slate-200 rounded-xl p-6 text-center">
            <div className="text-4xl mb-3">🔒</div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">
                {featureName} is Premium Only
            </h3>
            <p className="text-sm text-slate-600 mb-4">
                Upgrade to access this feature and unlock your full productivity potential.
            </p>
            <Link
                href="/pricing"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
            >
                Upgrade to Premium
            </Link>
        </div>
    );
}
