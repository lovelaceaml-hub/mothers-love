import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: "Mother's Love Display",
  manifest: '/display-manifest.webmanifest',
};

export const viewport: Viewport = {
  themeColor: '#FFF6DC',
};

export default function DisplayLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
