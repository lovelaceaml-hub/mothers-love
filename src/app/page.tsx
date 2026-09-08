import type { Metadata } from 'next';

import { FeedHome } from '@/components/feed/FeedHome';

export const metadata: Metadata = {
  title: "The Words of Mother's Love",
  description: "Share a recognition of Mother's Love.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function HomePage() {
  return <FeedHome />;
}
