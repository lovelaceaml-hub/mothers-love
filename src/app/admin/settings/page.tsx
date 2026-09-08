import { AdminShell } from '@/components/admin/admin-shell';
import { SettingsAccess } from '@/components/admin/settings-access';

export default function SettingsPage() {
  return (
    <AdminShell eyebrow="Owner operations" title="Settings and access" description="Manage invited campaign members and paired display devices within the owner boundary.">
      <SettingsAccess />
    </AdminShell>
  );
}

