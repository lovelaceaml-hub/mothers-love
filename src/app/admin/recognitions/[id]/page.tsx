import { AdminShell } from '@/components/admin/admin-shell';
import { RecognitionDetailPage } from '@/components/admin/recognition-detail-page';

export default async function RecognitionDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <AdminShell eyebrow="Content workspace" title="Recognition detail" description="Review and update this recognition.">
      <RecognitionDetailPage id={id} />
    </AdminShell>
  );
}
