import { AdminShell } from '@/components/admin/admin-shell';
import { AdminOverview } from '@/components/admin/admin-overview';

export default function AdminPage() {
  return (
    <AdminShell eyebrow="Campaign workspace" title="Overview" description="Keep review, display connection and retention health visible in one calm workspace.">
      <AdminOverview />
    </AdminShell>
  );
}

