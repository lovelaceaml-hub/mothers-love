import { AdminShell } from '@/components/admin/admin-shell';
import { RecognitionManager } from '@/components/admin/recognition-manager';

export default function RecognitionsPage() {
  return (
    <AdminShell eyebrow="Content workspace" title="Recognitions" description="Search current personal records within their original seven day lifetime.">
      <RecognitionManager />
    </AdminShell>
  );
}

