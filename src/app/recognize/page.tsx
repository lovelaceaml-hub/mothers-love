import type { Metadata } from 'next';

import { SubmissionForm } from '@/components/submission/SubmissionForm';
import { earlyReadScript } from '@/lib/early-read';

export const metadata: Metadata = {
  title: `Share a recognition | Mother's Love`,
  description: "Share a recognition through The Words of Mother's Love.",
};

export default function RecognizePage() {
  return (
    <>
      {/* Asks whether sharing is open while the form's code is still downloading. */}
      <script dangerouslySetInnerHTML={{ __html: earlyReadScript('config') }} />
      <SubmissionForm />
    </>
  );
}
