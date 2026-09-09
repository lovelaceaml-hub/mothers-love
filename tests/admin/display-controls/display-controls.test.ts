import { describe, expect, it } from 'vitest';
import type { DisplaySettings } from '@/lib/contracts';
import { DEFAULT_DISPLAY_PLAYLIST } from '@/lib/contracts';
import {
  effectsWithDefaults,
  gardenAmountWithDefaults,
  legacyTempo,
  playlistWithDefaults,
  soundWithDefaults,
} from '@/components/admin/display-controls';

const settings = (overrides: Partial<DisplaySettings> = {}): DisplaySettings => ({
  version: 8,
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
  ...overrides,
});

describe('display studio model', () => {
  it('uses the complete fixed playlist for legacy settings', () => {
    expect(playlistWithDefaults(settings())).toEqual(DEFAULT_DISPLAY_PLAYLIST);
  });

  it('maps historical tempo aliases into the three owner choices', () => {
    expect(legacyTempo(settings({ tempo: 'slow' }))).toBe('calm');
    expect(legacyTempo(settings({ tempo: 'standard' }))).toBe('standard');
    expect(legacyTempo(settings({ tempo: 'fast' }))).toBe('lively');
  });

  it('preserves an unbounded positive Garden amount and safe defaults', () => {
    expect(gardenAmountWithDefaults(settings({ gardenAmount: 999 }))).toBe(999);
    expect(gardenAmountWithDefaults(settings())).toBe('all-active');
    expect(effectsWithDefaults(settings({ showTrails: false })).trails).toBe(false);
    expect(soundWithDefaults(settings()).volume).toBe(0.2);
  });

  it('keeps explicit modern playlist, effect, and sound values', () => {
    const modern = settings({
      playlist: [{ id: 'garden', enabled: true }],
      effects: { trails: false, constellations: false, sparkles: false, background: false },
      sound: { enabled: false, volume: 0, arrivalChime: false, milestoneChime: true },
    });
    expect(playlistWithDefaults(modern)).toEqual([{ id: 'garden', enabled: true }]);
    expect(effectsWithDefaults(modern)).toMatchObject({ trails: false, constellations: false, sparkles: false, background: false });
    expect(soundWithDefaults(modern)).toEqual({ enabled: false, volume: 0, arrivalChime: false, milestoneChime: true });
  });
});
