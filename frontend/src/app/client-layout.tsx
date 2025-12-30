"use client";

import { useRef, useEffect } from "react";
import Toaster, { ToasterRef } from "@/components/ui/toast";
import { AuthProvider } from '@/lib/context/AuthContext';
import { api } from '@/lib/services/api';
import { CookieBanner } from "@/components/common/cookie-banner";
import { FeedbackButton } from "@/components/common/feedback-button";

export const toast = {
  show: (data: Parameters<ToasterRef['show']>[0]) => {
    // This will be set by the Toaster component
  },
};

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const toasterRef = useRef<ToasterRef>(null);

  // Pre-fetch public data immediately on mount for faster page load
  useEffect(() => {
    // Trigger these fetches early - results will be cached
    api.getPublicSettings().catch(() => { });
    api.getFeatures().catch(() => { });
  }, []);

  // Set the global toast function
  toast.show = (data) => toasterRef.current?.show(data);

  return (
    <AuthProvider>
      <>
        {children}
        <Toaster ref={toasterRef} />
        <CookieBanner />
        <FeedbackButton />
      </>
    </AuthProvider>
  );
}