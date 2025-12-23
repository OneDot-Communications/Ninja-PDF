import type { Metadata } from "next";
import { Montserrat, Kalam, Caveat } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ClientLayout } from "./client-layout";

const montserrat = Montserrat({
  subsets: ["latin", "cyrillic"],
  variable: "--font-montserrat",
  display: "swap",
});

const kalam = Kalam({
  weight: ["300", "400", "700"],
  subsets: ["latin", "devanagari"],
  variable: "--font-kalam",
  display: "swap",
});

const caveat = Caveat({
  subsets: ["latin", "cyrillic"],
  variable: "--font-caveat",
  display: "swap",
});

import JsonLd from "../components/seo/json-ld";

export const metadata: Metadata = {
  metadataBase: new URL("https://18pluspdf.com"),
  title: {
    default: "18+ PDF - Free Online PDF Tools | Merge, Split, Convert & Edit",
    template: "%s | 18+ PDF",
  },
  description:
    "The ultimate free online PDF toolkit. Merge, split, compress, convert, sign, and edit PDF files securely in your browser. No installation or registration required.",
  keywords: [
    "PDF tools",
    "merge PDF",
    "split PDF",
    "convert PDF",
    "edit PDF",
    "free PDF editor",
    "compress PDF",
    "PDF to Word",
    "PDF to Excel",
    "sign PDF",
    "online PDF tools",
    "secure PDF",
    "18+ PDF",
  ],
  authors: [{ name: "18+ PDF Team", url: "https://18pluspdf.com" }],
  creator: "18+ PDF",
  publisher: "18+ PDF",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "18+ PDF - Free Online PDF Tools",
    description:
      "Merge, split, compress, convert, sign, and edit PDF files securely in your browser. 100% free and no installation required.",
    url: "https://18pluspdf.com",
    siteName: "18+ PDF",
    images: [
      {
        url: "https://18pluspdf.com/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "18+ PDF - All-in-one PDF Tools",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "18+ PDF - Free Online PDF Tools",
    description:
      "The ultimate free online PDF toolkit. Merge, split, convert, and edit PDFs with ease.",
    images: ["https://18pluspdf.com/twitter-image.jpg"],
    creator: "@18pluspdf",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', function() {
                    navigator.serviceWorker.getRegistrations().then(function(registrations) {
                      for(let registration of registrations) {
                        registration.unregister();
                        console.log('ServiceWorker unregistered');
                      }
                    });
                  });
                }
              `,
          }}
        />
      </head>
      <body
        className={cn(
          "min-h-screen bg-background antialiased",
          montserrat.className,
          montserrat.variable,
          kalam.variable,
          caveat.variable
        )}
      >
        <JsonLd />
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
