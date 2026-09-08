import { AdminShell } from '@/components/admin/admin-shell';
import { DisplayControls } from '@/components/admin/display-controls';

export default function DisplayPage() {
  return (
    <AdminShell eyebrow="Living Wall" title="Display controls" description="See what the paired browser last acknowledged and keep operational status truthful.">
      <DisplayControls />
    </AdminShell>
  );
}

