import { AdminShell } from '@/components/admin/admin-shell';
import { ReviewInbox } from '@/components/admin/review-inbox';

export default function ReviewPage() {
  return (
    <AdminShell eyebrow="Needs attention" title="Review inbox" description="Held messages stay private until a moderator or owner makes a deliberate decision.">
      <ReviewInbox />
    </AdminShell>
  );
}

