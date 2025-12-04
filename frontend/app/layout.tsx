import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { cn } from "./lib/utils";
import { ClientLayout } from "./client-layout";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "OneDot PDF - Ultimate PDF Tools",
  description: "Merge, Split, Convert, and Edit PDFs with ease. 100% Free and Secure.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          montserrat.variable
        )}
      >
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
