"use client";

import { useState, useEffect } from "react";
import { tools as staticTools } from "@/lib/tools";
import { api } from "@/lib/services/api";

export function useTools() {
    // Initialize with static tools
    const [tools, setTools] = useState(staticTools);
    const [loading, setLoading] = useState(true);

    // Map frontend-derived codes to backend codes where they differ
    const CODE_OVERRIDES: Record<string, string> = {
        'POWERPOINT_TO_PDF': 'PPT_TO_PDF',
        'PDF_TO_POWERPOINT': 'PDF_TO_PPT',
    };

    useEffect(() => {
        let isMounted = true;

        async function fetchTools() {
            try {
                // Always fetch fresh data to reflect Admin updates immediately
                const dbFeatures: any[] = await api.getFeatures();
                if (!isMounted) return;

                // Merge DB features with static tools
                const merged = staticTools.map(staticTool => {
                    let code = staticTool.href.replace('/', '').replace(/-/g, '_').toUpperCase();
                    if (CODE_OVERRIDES[code]) {
                        code = CODE_OVERRIDES[code];
                    }

                    const dbFeature = dbFeatures.find(f => f.code === code || f.name === staticTool.title);

                    if (dbFeature) {
                        return {
                            ...staticTool,
                            title: dbFeature.name,
                            description: dbFeature.description,
                            icon: dbFeature.icon || staticTool.icon,
                            isPremium: dbFeature.is_premium_default
                        };
                    }
                    return staticTool;
                });

                const newFeatures = dbFeatures.filter(f => {
                    const code = f.code;
                    // Check existence using the same override logic
                    const exists = merged.some(m => {
                        let mCode = m.href.replace('/', '').replace(/-/g, '_').toUpperCase();
                        if (CODE_OVERRIDES[mCode]) mCode = CODE_OVERRIDES[mCode];
                        return mCode === code || m.title === f.name;
                    });
                    return !exists;
                }).map(f => ({
                    title: f.name,
                    description: f.description,
                    icon: f.icon,
                    href: `/tools/${f.code.replace(/_/g, '-')}`,
                    category: "Other",
                    color: "#000000",
                    isNew: true
                }));

                const finalTools = [...merged, ...newFeatures];

                if (isMounted) {
                    setTools(finalTools);
                }

            } catch (err) {
                console.error("Failed to fetch dynamic features:", err);
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        fetchTools();

        return () => {
            isMounted = false;
        };
    }, []);

    return { tools, loading };
}
