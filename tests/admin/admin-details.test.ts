import { describe, expect, it } from 'vitest';

import { auditActionLabel, auditActorLabel, auditEntriesOf, heartCountOf, reasonLabel } from '@/components/admin/admin-utils';
import type { AdminRecognition } from '@/lib/contracts';

const base = {
  id: 'synthetic', recipient: 'Example Friend', message: 'Thank you.', expressionIds: [2], createdAt: '2026-09-08T08:00:00.000Z',
  firstPublishedAt: null, expiresAt: '2126-09-08T08:00:00.000Z', version: 1, status: 'held', featured: false,
  submittedName: 'Example Sender', reason: null,
} as unknown as AdminRecognition;

describe('admin detail helpers (Plan 18 Section C)', () => {
  it('reads the like count only when the database sends a real one', () => {
    expect(heartCountOf(base)).toBeNull();
    expect(heartCountOf({ ...base, heartCount: 0 })).toBe(0);
    expect(heartCountOf({ ...base, heartCount: 12 })).toBe(12);
    expect(heartCountOf({ ...base, heartCount: -1 })).toBeNull();
    expect(heartCountOf({ ...base, heartCount: Number.NaN })).toBeNull();
    expect(heartCountOf({ ...base, heartCount: '12' as unknown as number })).toBeNull();
  });

  it('reads the history only when the database sends one, dropping damaged entries', () => {
    expect(auditEntriesOf(base)).toBeNull();
    expect(auditEntriesOf({ ...base, audit: [] })).toEqual([]);
    const good = { action: 'hide', reason: 'privacy', outcome: 'success', at: '2026-11-02T18:30:00.000Z', version: 2, actorRole: 'owner' as const };
    const damaged = [good, null, { action: 5 }, 'text'] as unknown as AdminRecognition['audit'];
    expect(auditEntriesOf({ ...base, audit: damaged })).toEqual([good]);
  });

  it('names actions, reasons and roles in plain words and never guesses', () => {
    expect(auditActionLabel('hide')).toBe('Hidden from display');
    expect(auditActionLabel('invalidate')).toBe('Removed as invalid');
    expect(auditActionLabel('something_new')).toBe('something_new');
    expect(reasonLabel('recipient_request')).toBe('Recipient request');
    expect(reasonLabel('filter_error')).toBe('Filter error');
    expect(reasonLabel(null)).toBe('');
    expect(reasonLabel('new_reason')).toBe('new_reason');
    expect(auditActorLabel('owner')).toBe('the Owner');
    expect(auditActorLabel('moderator')).toBe('a Moderator');
    expect(auditActorLabel(null)).toBe('an administrator no longer listed');
  });
});
