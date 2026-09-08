import { AdminShell } from '@/components/admin/admin-shell';
import { Insights } from '@/components/admin/insights';

export default function InsightsPage() {
  return (
    <AdminShell eyebrow="Aggregate view" title="Insights" description="Review campaign totals by reporting period. Historical aggregates remain after personal recognitions expire.">
      <Insights />
    </AdminShell>
  );
}

