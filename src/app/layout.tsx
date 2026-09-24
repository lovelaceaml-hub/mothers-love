import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "@/styles/campaign-colors.css";
import { PublicFeedFrame, PublicFeedProvider } from '@/components/feed/PublicFeedProvider';
import { PwaBootstrap } from '@/components/pwa/PwaBootstrap';

export const metadata: Metadata = {
  title: "The Words of Mother's Love",
  description: "A place to share words of appreciation and peace.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/open-hands-heart-v1-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/open-hands-heart-v1-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#FFF6DC",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <PwaBootstrap />
        <PublicFeedProvider>
          <PublicFeedFrame>{children}</PublicFeedFrame>
        </PublicFeedProvider>
      </body>
    </html>
  );
}
