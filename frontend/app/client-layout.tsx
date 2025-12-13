"use client";

import { useRef } from "react";
import Toaster, { ToasterRef } from "./components/ui/toast";
import { AuthProvider } from './context/AuthContext';

export const toast = {
  show: (data: Parameters<ToasterRef['show']>[0]) => {
    // This will be set by the Toaster component
  },
};

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const toasterRef = useRef<ToasterRef>(null);

  // Set the global toast function
  toast.show = (data) => toasterRef.current?.show(data);

  return (
    <AuthProvider>
      <>
        {children}
        <Toaster ref={toasterRef} />
      </>
    </AuthProvider>
  );
}