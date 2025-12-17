"use client";

import { useState, useEffect } from "react";
import { tools as staticTools } from "./tools";
import { api } from "./api";

export function useTools() {
    const [tools, setTools] = useState(staticTools);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchTools() {
            try {
                const dbFeatures: any[] = await api.getFeatures();

                // Merge DB features with static tools
                const merged = staticTools.map(staticTool => {
                    // Try to match by code (derived from href) or name
                    const code = staticTool.href.replace('/', '').replace(/-/g, '_');
                    const dbFeature = dbFeatures.find(f => f.code === code || f.name === staticTool.title);

                    if (dbFeature) {
                        return {
                            ...staticTool,
                            title: dbFeature.name,
                            description: dbFeature.description,
                            icon: dbFeature.icon || staticTool.icon, // Use DB icon URL if present
                            isPremium: dbFeature.is_premium_default
                        };
                    }
                    return staticTool;
                });

                // Add NEW features from DB that aren't in static list
                const newFeatures = dbFeatures.filter(f => {
                    const code = f.code;
                    // Check if we already merged this one
                    const exists = merged.some(m => m.href.replace('/', '').replace(/-/g, '_') === code || m.title === f.name);
                    return !exists;
                }).map(f => ({
                    title: f.name,
                    description: f.description,
                    icon: f.icon, // Might need a default icon if null
                    href: `/tools/${f.code.replace(/_/g, '-')}`, // Generate a route
                    category: "Other", // Default category
                    color: "#000000",
                    isNew: true
                }));

                setTools([...merged, ...newFeatures]);
            } catch (err) {
                console.error("Failed to fetch dynamic features:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchTools();
    }, []);

    return { tools, loading };
}
