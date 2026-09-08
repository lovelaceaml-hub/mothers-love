import type { Metadata } from 'next';

import { SubmissionForm } from '@/components/submission/SubmissionForm';

export const metadata: Metadata = {
  title: `Share a recognition | Mother's Love`,
  description: "Share a recognition through The Words of Mother's Love.",
};

export default function RecognizePage() {
  return <SubmissionForm />;
}
