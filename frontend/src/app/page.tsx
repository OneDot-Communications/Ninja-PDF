"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/services/api";
import { HomeView } from "@/components/home/HomeView";

// Force re-compile to fix hydration mismatch
export default function Home() {
  const [settings, setSettings] = useState({
    heroTitle: "All your PDF headache in one place.",
    heroSubtitle: "Simple, super, and totally free!",
    platformName: "18+ PDF"
  });

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
            heroTitle: response.hero_title || "All your PDF headache in one place.",
            heroSubtitle: response.hero_subtitle || "Simple, super, and totally free!",
            platformName: response.platform_name || "18+ PDF"
          });
        }
      } catch (error) {
        console.log("Using default settings (public view)");
      }
    };

    fetchSettings();
  }, []);

  return (
    <HomeView
      heroTitle={settings.heroTitle}
      heroSubtitle={settings.heroSubtitle}
      platformName={settings.platformName}
    />
  );
}
