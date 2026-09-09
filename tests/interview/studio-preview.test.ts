import { describe, expect, it } from 'vitest';

import { DISPLAY_SCREEN_IDS } from '@/lib/contracts';
import {
  createSamplePreviewSnapshot,
  parsePublicPreviewSnapshot,
  previewDurationMs,
  previewEffects,
  previewMotion,
  previewTempo,
  snapshotExpiryDelayMs,
  snapshotHasExpired,
} from '@/components/display/preview';
import { asPublicEndpointPayload, studioSettings, studioSnapshot } from './studio-fixtures';

describe('display studio preview model', () => {
  it('ships a safe sample with all ten selectable screens and fictional records', () => {
    const sample = createSamplePreviewSnapshot();

    expect(sample.settings.playlist?.map((entry) => entry.id)).toEqual([...DISPLAY_SCREEN_IDS]);
    expect(sample.recognitions).toHaveLength(4);
    expect(sample.recognitions.every((recognition) => recognition.recipient.startsWith('Sample recipient'))).toBe(true);
    expect(sample.recognitions.every((recognition) => !Object.prototype.hasOwnProperty.call(recognition, 'submittedName'))).toBe(true);
  });

  it('accepts only the public projection and returns a detached safe value', () => {
    const payload = asPublicEndpointPayload(studioSnapshot());
    const parsed = parsePublicPreviewSnapshot(payload);

    expect(parsed).not.toBeNull();
    expect(parsed?.recognitions[0]).toEqual(expect.objectContaining({ recipient: 'Synthetic recipient A' }));
    expect(parsed?.recognitions[0]).not.toHaveProperty('submittedName');
    expect(parsed?.settings).not.toHaveProperty('submissionUrl');

    if (parsed) {
      payload.recognitions = [];
      expect(parsed.recognitions).toHaveLength(2);
    }
  });

  it('fails closed for private fields, invalid identity, and expired records', () => {
    const valid = asPublicEndpointPayload(studioSnapshot());
    const privateField = {
      ...valid,
      recognitions: [{ ...studioSnapshot().recognitions[0], submittedName: 'Synthetic private sender' }],
    };
    expect(parsePublicPreviewSnapshot(privateField)).toBeNull();

    const invalidId = {
      ...valid,
      recognitions: [{ ...studioSnapshot().recognitions[0], id: 'synthetic-recognition' }],
    };
    expect(parsePublicPreviewSnapshot(invalidId)).toBeNull();

    const expired = studioSnapshot({ expiresAt: '2026-09-09T11:59:59.000Z' });
    expect(snapshotHasExpired(expired, Date.parse(STUDIO_NOW))).toBe(true);
  });

  it('maps owner effects and tempo while keeping every screen at the twelve second floor', () => {
    const stillSettings = studioSettings({ motion: 'still', tempo: 'fast', effects: { trails: false, constellations: true, sparkles: false, background: false } });
    expect(previewMotion(stillSettings)).toBe('still');
    expect(previewTempo(stillSettings)).toBe('lively');
    expect(previewEffects(stillSettings)).toEqual({ trails: false, constellations: true, sparkles: false, background: false });
    expect(previewDurationMs('impact', stillSettings, studioSnapshot())).toBeGreaterThanOrEqual(12_000);
    expect(previewDurationMs('featured', stillSettings, studioSnapshot({ settings: { durationOverrides: { featured: 12 } } }))).toBeGreaterThanOrEqual(12_000);
  });

  it('respects message reading time and public expiry delay', () => {
    const long = studioSnapshot({ recognitions: [studioSnapshot().recognitions[0]], settings: { readingSeconds: 20 } });
    const duration = previewDurationMs('featured', long.settings, long);
    expect(duration).toBeGreaterThan(12_000);
    expect(snapshotExpiryDelayMs(long)).toBe(7 * 24 * 60 * 60 * 1_000);
    expect(snapshotHasExpired(long, Date.parse('2026-09-09T12:00:00.000Z'))).toBe(false);
  });
});

const STUDIO_NOW = '2026-09-09T12:00:00.000Z';
