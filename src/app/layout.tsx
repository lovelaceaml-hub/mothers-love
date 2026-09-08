import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { PublicFeedFrame, PublicFeedProvider } from '@/components/feed/PublicFeedProvider';

export const metadata: Metadata = {
  title: "The Words of Mother's Love",
  description: "A place to share words of appreciation and peace.",
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
