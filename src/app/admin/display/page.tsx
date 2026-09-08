import { AdminShell } from '@/components/admin/admin-shell';
import { DisplayControls } from '@/components/admin/display-controls';

export default function DisplayPage() {
  return (
    <AdminShell eyebrow="Living Wall" title="Display controls" description="Check the paired browser and change display settings.">
      <DisplayControls />
    </AdminShell>
  );
}
