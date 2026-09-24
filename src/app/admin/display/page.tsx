import { AdminShell } from '@/components/admin/admin-shell';
import styles from '@/components/admin/admin.module.css';
import { ColorPolishStudio } from '@/components/admin/color-polish/ColorPolishStudio';
import { DisplayControls } from '@/components/admin/display-controls';

export default function DisplayPage() {
  return (
    <AdminShell eyebrow="Living Wall" title="Display controls" description="View the public campaign display and change global settings.">
      <ColorPolishStudio />
      <DisplayControls />
      {/* A quiet way to the 3D world, its own page beside the TV View (Plan 28 Section 5). */}
      <p className={styles.sectionHint}>
        The 3D world has its own page and never changes the TV View:{' '}
        <a className={styles.authLink} href="/world" target="_blank" rel="noopener">open the 3D world</a>.
      </p>
    </AdminShell>
  );
}
