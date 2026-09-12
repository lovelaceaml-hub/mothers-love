import { describe, expect, it } from 'vitest';
import type { AdminRecognition, DisplaySettings } from '@/lib/contracts';
import { MAX_MESSAGE_GRAPHEMES } from '@/lib/contracts';
import {
  actionExplanation,
  capabilitiesFor,
  displaySettingChanges,
  graphemeLength,
  isExpired,
  makeAggregateCsv,
  reconcileEditor,
  validateEditorDraft,
} from '@/components/admin/admin-utils';

const recognition = (overrides: Partial<AdminRecognition> = {}): AdminRecognition => ({
  id: 'synthetic-recognition',
  recipient: 'Mina K.',
  message: 'Thank you for being there.',
  expressionIds: [2, 8],
  createdAt: '2026-09-07T10:00:00.000Z',
  firstPublishedAt: '2026-09-07T10:00:00.000Z',
  expiresAt: '2026-09-14T10:00:00.000Z',
  version: 3,
  status: 'published',
  featured: false,
  submittedName: 'Synthetic Sender',
  reason: null,
  ...overrides,
});

const settings = (): DisplaySettings => ({
  version: 5,
  mode: 'normal',
  motion: 'standard',
  pauseArrivals: false,
  pauseRotation: false,
  collectionOpen: true,
  lowActivityMinutes: 20,
  readingSeconds: 20,
  maxBubbles: 4,
  showTrails: true,
  showConstellations: true,
});

describe('admin editor safety helpers', () => {
  it('clears eligibility at expiry', () => {
    const expiresAt = '2026-09-07T10:00:00.000Z';
    expect(isExpired(expiresAt, Date.parse('2026-09-07T10:00:01.000Z'))).toBe(true);
  });

  it('counts graphemes at the message boundary instead of UTF-16 code units', () => {
    const message = '🙂'.repeat(MAX_MESSAGE_GRAPHEMES);
    expect(graphemeLength(message)).toBe(MAX_MESSAGE_GRAPHEMES);
    expect(validateEditorDraft({ recipient: 'Mina K.', submittedName: 'Synthetic Sender', message, expressionIds: [1] })).toEqual([]);
    expect(validateEditorDraft({ recipient: 'Mina K.', submittedName: 'Synthetic Sender', message: `${message}a`, expressionIds: [1] })).toContain(`Messages must be ${MAX_MESSAGE_GRAPHEMES} characters or fewer.`);
  });

  it('requires a deliberate reconcile decision when another admin advances the version', () => {
    const local = recognition({ version: 3, message: 'Local draft' });
    const latest = recognition({ version: 4, message: 'Latest server draft' });
    const result = reconcileEditor(local, latest);
    expect(result.changed).toBe(true);
    expect(result.local.message).toBe('Local draft');
    expect(result.latest.message).toBe('Latest server draft');
  });

  it('explains restore based on prior publication', () => {
    expect(actionExplanation('restore', recognition({ status: 'invalid', firstPublishedAt: null }))).toBe('Return this message to review.');
    expect(actionExplanation('restore', recognition({ status: 'hidden', firstPublishedAt: null }))).toBe('Return this message to review.');
    expect(actionExplanation('restore', recognition({ status: 'invalid' }))).toBe('Return this message to the display and campaign totals.');
    expect(actionExplanation('restore', recognition({ status: 'hidden' }))).toBe('Return this message to the display.');
  });
});

describe('admin role and display helpers', () => {
  it('keeps owner-only controls separate from moderator controls', () => {
    expect(capabilitiesFor('owner')).toEqual({ canInvite: true, canRevoke: true, canPairDevices: true, canDelete: true, canChangeCollection: true });
    expect(capabilitiesFor('moderator')).toEqual({ canInvite: false, canRevoke: false, canPairDevices: false, canDelete: false, canChangeCollection: false });
  });

  it('only sends changed display fields and produces aggregate-only CSV', () => {
    const changes = displaySettingChanges(settings(), { mode: 'quiet', collectionOpen: false });
    expect(changes).toEqual({ mode: 'quiet', collectionOpen: false });
    const csv = makeAggregateCsv({ periodStart: '2026-09-01', periodEnd: '2026-09-30', recognitions: 4, expressionCounts: [1, 2, 0, 0, 0, 0, 0, 1, 0], expressionTotal: 4 });
    expect(csv).toContain('period_start,period_end,recognitions,expression_total');
    expect(csv).not.toContain('Synthetic Sender');
    expect(csv).not.toContain('Mina K.');
  });
});
