import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "@/styles/campaign-colors.css";
import { PublicFeedFrame, PublicFeedProvider } from '@/components/feed/PublicFeedProvider';

export const metadata: Metadata = {
  title: "The Words of Mother's Love",
  description: "A place to share words of appreciation and peace.",
  icons: {
    icon: [
      { url: "/icons/butterfly-heart-v1-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/butterfly-heart-v1-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/favicon.ico?v=butterfly-heart-v1",
    apple: [
      { url: "/icons/butterfly-heart-v1-180.png", sizes: "180x180", type: "image/png" },
    ],
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
        <PublicFeedProvider>
          <PublicFeedFrame>{children}</PublicFeedFrame>
        </PublicFeedProvider>
      </body>
    </html>
  );
}
