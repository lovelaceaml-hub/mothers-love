import type { Metadata } from 'next';
import { TvPearlStudy } from '@/components/display/tv-design/TvPearlStudy';

export const metadata: Metadata = { title: "TV pearl design study | Mother's Love", robots: { index: false, follow: false } };
export default function Page() { return <TvPearlStudy />; }
