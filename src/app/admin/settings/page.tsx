import { AdminShell } from '@/components/admin/admin-shell';
import { SettingsAccess } from '@/components/admin/settings-access';

export default function SettingsPage() {
  return (
    <AdminShell eyebrow="Owner operations" title="Settings and access" description="Invite moderators and pair display browsers.">
      <SettingsAccess />
    </AdminShell>
  );
}
