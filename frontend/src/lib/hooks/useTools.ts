"use client";

import { useState, useEffect } from "react";
import { tools as staticTools } from "@/lib/tools";
import { api } from "@/lib/services/api";

// Module-level cache to prevent repeated fetches
let cachedTools: any[] | null = null;
let fetchingPromise: Promise<any[]> | null = null;

export function useTools() {
    // Initialize with cached tools if available, otherwise static
    const [tools, setTools] = useState(cachedTools || staticTools);
    const [loading, setLoading] = useState(!cachedTools);

    useEffect(() => {
        // If we already have data, just ensure state matches and exit
        if (cachedTools) {
            setTools(cachedTools);
            setLoading(false);
            return;
        }

        async function fetchTools() {
            try {
                // Deduplicate in-flight requests
                if (!fetchingPromise) {
                    fetchingPromise = (async () => {
                        const dbFeatures: any[] = await api.getFeatures();

                        // Merge DB features with static tools
                        const merged = staticTools.map(staticTool => {
                            const code = staticTool.href.replace('/', '').replace(/-/g, '_');
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
                            const exists = merged.some(m => m.href.replace('/', '').replace(/-/g, '_') === code || m.title === f.name);
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

                        return [...merged, ...newFeatures];
                    })();
                }

                const finalTools = await fetchingPromise;
                cachedTools = finalTools; // Set cache
                setTools(finalTools);

            } catch (err) {
                console.error("Failed to fetch dynamic features:", err);
                // If fail, we stick to static tools (which are already set initally)
            } finally {
                setLoading(false);
                fetchingPromise = null; // Reset promise wrapper if needed, though cache is now set
            }
        }

        fetchTools();
    }, []);

    return { tools, loading };
}
