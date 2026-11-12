import type { Metadata } from 'next';

import { FeedHome } from '@/components/feed/FeedHome';
import { earlyReadScript } from '@/lib/early-read';

export const metadata: Metadata = {
  title: "The Words of Mother's Love",
  description: "Share a recognition of Mother's Love.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function HomePage() {
  return (
    <>
      {/* Starts the list's first read while the page's code is still downloading. */}
      <script dangerouslySetInnerHTML={{ __html: earlyReadScript('feed') }} />
      <FeedHome />
    </>
  );
}
