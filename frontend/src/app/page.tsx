"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/services/api";
import { HomeView, HeroSkeleton } from "@/components/home/HomeView";

// Force re-compile to fix hydration mismatch
export default function Home() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Attempt to fetch public settings.
    // If API endpoint for public settings exists, it should be used here.
    // For now we try getSystemSettings, but catch error if it's admin-only.
    // Ideally we need a public endpoint: /api/core/public-settings/
    const fetchSettings = async () => {
      try {
        const response = await api.getPublicSettings();
        if (response && typeof response === 'object') {
          setSettings({
            heroTitle: response.hero_title || "",
            heroSubtitle: response.hero_subtitle || "",
            platformName: response.platform_name || "18+ PDF",
            primaryColor: response.primary_color || "#01B0F1",
            highlightHeight: response.highlight_height || 1.05
          });
        } else {
          setSettings({
            heroTitle: "",
            heroSubtitle: "",
            platformName: "18+ PDF",
            primaryColor: "#01B0F1",
            highlightHeight: 1.05
          });
        }
      } catch (error) {
        console.log("Failed to fetch settings, showing skeleton");
        setSettings(null);
      }
      setLoading(false);
    };

    fetchSettings();
  }, []);

  if (loading) {
    return <HeroSkeleton />;
  }

  if (!settings) {
    return <HeroSkeleton />; // fallback
  }

  if (loading || !settings) {
    return <HeroSkeleton />;
  }

  return (
    <HomeView
      heroTitle={settings.heroTitle}
      heroSubtitle={settings.heroSubtitle}
      platformName={settings.platformName}
      primaryColor={settings.primaryColor}
      highlightHeight={settings.highlightHeight}
    />
  );
}
