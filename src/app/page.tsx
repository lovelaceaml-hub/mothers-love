import type { Metadata } from 'next';

import { SubmissionForm } from '@/components/submission/SubmissionForm';

export const metadata: Metadata = {
  title: "The Words of Mother's Love",
  description: "Share a recognition of Mother's Love.",
};

export default function HomePage() {
  return <SubmissionForm />;
}
