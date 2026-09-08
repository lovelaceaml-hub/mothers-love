import type { AdminRecognition, DisplaySettings } from '@/lib/contracts';

export type AdminRole = 'owner' | 'moderator';

export type ActionKind =
  | 'edit'
  | 'publish'
  | 'hide'
  | 'restore'
  | 'invalidate'
  | 'feature'
  | 'unfeature'
  | 'delete';

export type AdminCapabilities = {
  canInvite: boolean;
  canRevoke: boolean;
  canPairDevices: boolean;
  canDelete: boolean;
  canChangeCollection: boolean;
};

export const capabilitiesFor = (role: AdminRole): AdminCapabilities => ({
  canInvite: role === 'owner',
  canRevoke: role === 'owner',
  canPairDevices: role === 'owner',
  canDelete: role === 'owner',
  canChangeCollection: role === 'owner',
});

export const isExpired = (expiresAt: string, now = Date.now()): boolean =>
  new Date(expiresAt).getTime() <= now;

export const formatDateTime = (value: string | null | undefined): string => {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

export const formatExpiry = (expiresAt: string, now = Date.now()): string => {
  const remaining = new Date(expiresAt).getTime() - now;
  if (!Number.isFinite(remaining) || remaining <= 0) return 'Expired';
  const hours = Math.floor(remaining / 3_600_000);
  const days = Math.floor(hours / 24);
  const displayHours = hours % 24;
  if (days > 0) return `${days}d ${displayHours}h left`;
  if (hours > 0) return `${hours}h left`;
  return `${Math.max(1, Math.floor(remaining / 60_000))}m left`;
};

export const graphemeLength = (value: string): number => {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
    return Array.from(segmenter.segment(value)).length;
  }
  return Array.from(value).length;
};

export const statusLabel = (status: AdminRecognition['status']): string => {
  switch (status) {
    case 'published':
      return 'Published';
    case 'held':
      return 'Held for review';
    case 'hidden':
      return 'Hidden';
    case 'invalid':
      return 'Invalid';
    default:
      return status;
  }
};

export const actionLabel = (action: ActionKind): string => {
  switch (action) {
    case 'publish':
      return 'Publish';
    case 'edit':
      return 'Save edit';
    case 'hide':
      return 'Hide from display';
    case 'restore':
      return 'Restore to display';
    case 'invalidate':
      return 'Remove as invalid';
    case 'feature':
      return 'Feature';
    case 'unfeature':
      return 'Remove feature';
    case 'delete':
      return 'Permanently delete';
    default:
      return action;
  }
};

export const actionExplanation = (
  action: ActionKind,
  recognition: AdminRecognition,
): string => {
  switch (action) {
    case 'hide':
      return 'This removes the recognition from every display context. It keeps the record until its original expiry and does not extend retention.';
    case 'restore':
      return 'This restores the remaining display eligibility. It does not create another first-publication count.';
    case 'invalidate':
      return `This removes the recognition as invalid and reverses its current count contribution once. Current status: ${statusLabel(recognition.status)}.`;
    case 'delete':
      return 'This permanently deletes the personal recognition. The action cannot be undone and does not claim to erase provider backups.';
    case 'feature':
      return 'Featuring changes presentation emphasis only. It never extends the original expiry.';
    case 'publish':
      return 'Publishing reruns validation and contributes to totals once if the recognition has never been published.';
    case 'edit':
      return 'Edits rerun validation. Substantive changes need a reason and the saved version must still match the version you opened.';
    case 'unfeature':
      return 'This removes the presentation emphasis while keeping the recognition eligible under its current status.';
    default:
      return 'Review the effect before continuing.';
  }
};

export const requiresReason = (action: ActionKind, fieldsChanged = false): boolean =>
  action === 'invalidate' || (action === 'edit' && fieldsChanged);

export const countImpact = (recognition: AdminRecognition): string => {
  if (recognition.status === 'published' || recognition.status === 'hidden') {
    const expressions = recognition.expressionIds.length;
    return `This currently contributes 1 recognition and ${expressions} expression${expressions === 1 ? '' : 's'} to the aggregate.`;
  }
  return 'This currently contributes 0 to public aggregates.';
};

export const validateEditorDraft = (draft: {
  recipient: string;
  submittedName: string;
  message: string;
  expressionIds: number[];
}): string[] => {
  const errors: string[] = [];
  if (!draft.recipient.trim()) errors.push('Add a recipient name.');
  if (!draft.submittedName.trim()) errors.push('Add the submitted name.');
  if (!draft.expressionIds.length) errors.push('Choose at least one expression.');
  if (graphemeLength(draft.message) > 500) errors.push('Messages must be 500 graphemes or fewer.');
  if (draft.message.trim().length === 0) errors.push('Add a message.');
  return errors;
};

export const reconcileEditor = (
  local: AdminRecognition,
  latest: AdminRecognition,
): { changed: boolean; local: AdminRecognition; latest: AdminRecognition } => ({
  changed: local.version !== latest.version,
  local,
  latest,
});

export const displaySettingChanges = (
  current: DisplaySettings,
  next: Partial<DisplaySettings>,
): Partial<DisplaySettings> => {
  const changes: Partial<DisplaySettings> = {};
  for (const [key, value] of Object.entries(next)) {
    if (current[key as keyof DisplaySettings] !== value) {
      (changes as Record<string, unknown>)[key] = value;
    }
  }
  return changes;
};

export const periodLabel = (period: 'week' | 'month' | 'all' | 'custom'): string => {
  switch (period) {
    case 'week':
      return 'This week, Sunday start';
    case 'month':
      return 'This month';
    case 'all':
      return 'All time';
    case 'custom':
      return 'Custom month';
    default:
      return period;
  }
};

export type AckState = 'saved' | 'pending' | 'applied';

export const ackLabel = (state: AckState, browserApplied: boolean): string => {
  if (state === 'pending') return 'Pending delivery';
  if (state === 'saved') return 'Unsaved changes';
  return browserApplied ? 'Applied by browser' : 'Saved in server';
};

export const makeAggregateCsv = (aggregate: {
  periodStart: string;
  periodEnd: string;
  recognitions: number;
  expressionCounts: number[];
  expressionTotal: number;
}): string => {
  const header = 'period_start,period_end,recognitions,expression_total,expression_1,expression_2,expression_3,expression_4,expression_5,expression_6,expression_7,expression_8,expression_9';
  const row = [
    aggregate.periodStart,
    aggregate.periodEnd,
    aggregate.recognitions,
    aggregate.expressionTotal,
    ...aggregate.expressionCounts.slice(0, 9),
  ]
    .map((value) => `"${String(value).replaceAll('"', '""')}"`)
    .join(',');
  return `${header}\n${row}\n`;
};
