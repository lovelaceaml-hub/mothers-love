import { AdminShell } from '@/components/admin/admin-shell';
import { ReviewInbox } from '@/components/admin/review-inbox';

export default function ReviewPage() {
  return (
    <AdminShell eyebrow="Needs attention" title="Review inbox" description="Review held messages and choose an action.">
      <ReviewInbox />
    </AdminShell>
  );
}
