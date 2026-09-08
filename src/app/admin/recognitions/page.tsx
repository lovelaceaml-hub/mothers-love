import { AdminShell } from '@/components/admin/admin-shell';
import { RecognitionManager } from '@/components/admin/recognition-manager';

export default function RecognitionsPage() {
  return (
    <AdminShell eyebrow="Content workspace" title="Recognitions" description="Find and update current recognitions.">
      <RecognitionManager />
    </AdminShell>
  );
}
