import { AdminShell } from '@/components/admin/admin-shell';
import { ColorPolishStudio } from '@/components/admin/color-polish/ColorPolishStudio';
import { DisplayControls } from '@/components/admin/display-controls';

export default function DisplayPage() {
  return (
    <AdminShell eyebrow="Living Wall" title="Display controls" description="View the public campaign display and change global settings.">
      <ColorPolishStudio />
      <DisplayControls />
    </AdminShell>
  );
}
