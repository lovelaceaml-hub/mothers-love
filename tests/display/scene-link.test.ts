import { describe, expect, it } from 'vitest';

import {
  ARRIVAL_GROUP_PREVIEW_SLUG,
  ARRIVAL_GROUP_SIZE,
  ARRIVAL_PREVIEW_PERIOD_MS,
  ARRIVAL_PREVIEW_SLUG,
  buildPreviewArrivals,
  parseScenePreviewRequest,
  planScenePreview,
  previewBaseScene,
  sceneDwellSeconds,
  scenePreviewCycle,
  scenePreviewStepMs,
  type ScenePreviewRequest,
} from '@/components/display/color-polish-host/ColorPolishHost';
import {
  COLOR_POLISH_DURATIONS,
  COLOR_POLISH_SCENES,
  COLOR_POLISH_VERSION,
  type ColorPolishScene,
  type ColorPolishSnapshot,
} from '@/lib/color-polish/contracts';
import { DISPLAY_EXTERNAL_URLS, type Recognition } from '@/lib/contracts';

const SERVER_TIME = '2026-09-19T18:00:00.000Z';
const SERVER_MS = Date.parse(SERVER_TIME);

function record(index: number, overrides: Partial<Recognition> = {}): Recognition {
  return {
    id: `synthetic-record-${index}`,
    recipient: `Synthetic Person ${index}`,
    message: 'Thank you for helping today.',
    expressionIds: [2],
    createdAt: new Date(SERVER_MS - 3_600_000).toISOString(),
    firstPublishedAt: new Date(SERVER_MS - 3_600_000).toISOString(),
    expiresAt: new Date(SERVER_MS + 86_400_000).toISOString(),
    version: 1,
    status: 'published',
    featured: false,
    ...overrides,
  };
}

function snapshotWith(recognitions: Recognition[], playlistOverrides: Array<{ id: ColorPolishScene; enabled: boolean; durationSeconds: number }> | null = null): ColorPolishSnapshot {
  const emptyAggregate = {
    periodStart: '2026-09-01',
    periodEnd: '2026-09-30',
    recognitions: 0,
    expressionCounts: Array.from({ length: 9 }, () => 0),
    expressionTotal: 0,
    revision: 1,
  };
  return {
    serverTime: SERVER_TIME,
    revision: 12,
    recognitions,
    aggregate: emptyAggregate,
    settings: {
      version: 6,
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
      externalUrls: DISPLAY_EXTERNAL_URLS,
    },
    submissionUrl: 'https://mothers-love.vercel.app/recognize',
    cursor: 'cursor-1',
    sync: 'reset',
    arrivals: [],
    presentation: {
      version: COLOR_POLISH_VERSION,
      enabled: true,
      playlist: playlistOverrides ?? COLOR_POLISH_SCENES.map((id) => ({ id, enabled: true, durationSeconds: COLOR_POLISH_DURATIONS[id] })),
    },
    insights: {
      calendar: [],
      currentWeek: emptyAggregate,
      previousWeek: emptyAggregate,
      month: emptyAggregate,
      campaign: emptyAggregate,
      goal: { weekStart: '2026-09-13', weekEnd: '2026-09-19', expressionId: 2, value: 4, target: 10, achieved: false },
    },
  };
}

const PREVIEW_SLUGS = [...COLOR_POLISH_SCENES, ARRIVAL_PREVIEW_SLUG, ARRIVAL_GROUP_PREVIEW_SLUG];

describe('one screen preview links on a production build', () => {
  it('ignores every slug, including the arrival slugs and junk, when the preview gate is false', () => {
    for (const slug of [...PREVIEW_SLUGS, 'not-a-scene', '', 'WELCOME']) {
      expect(parseScenePreviewRequest(`?scene=${slug}`, false)).toEqual({ kind: 'none' });
    }
  });

  it('produces a plan with no scene, no replayKey, no arrivals and no input hold when the gate is false', () => {
    const snapshot = snapshotWith(Array.from({ length: 12 }, (_, index) => record(index)));
    for (const slug of PREVIEW_SLUGS) {
      const request = parseScenePreviewRequest(`?scene=${slug}`, false);
      const plan = planScenePreview(request, snapshot, 5 * 60_000);
      expect(plan).toEqual({ arrivals: null, holdInput: false });
      expect(plan.scene).toBeUndefined();
      expect(plan.replayKey).toBeUndefined();
    }
  });

  it('leaves the snapshot arrivals untouched when the gate is false', () => {
    const snapshot = snapshotWith(Array.from({ length: 12 }, (_, index) => record(index)));
    const plan = planScenePreview(parseScenePreviewRequest('?scene=arrival-group', false), snapshot, 60_000);
    expect(plan.arrivals).toBeNull();
    expect(snapshot.arrivals).toEqual([]);
  });
});

describe('one screen preview links on a preview build', () => {
  it('accepts each of the ten screen slugs and rejects unknown slugs', () => {
    for (const scene of COLOR_POLISH_SCENES) {
      expect(parseScenePreviewRequest(`?scene=${scene}`, true)).toEqual({ kind: 'scene', scene });
    }
    for (const slug of ['', 'Welcome', 'garden ', 'arrivals', 'unknown']) {
      expect(parseScenePreviewRequest(`?scene=${slug}`, true)).toEqual({ kind: 'none' });
    }
    expect(parseScenePreviewRequest('', true)).toEqual({ kind: 'none' });
    expect(parseScenePreviewRequest(null, true)).toEqual({ kind: 'none' });
    expect(parseScenePreviewRequest('?other=garden', true)).toEqual({ kind: 'none' });
  });

  it('maps the two arrival slugs to a single entrance and a wave of ten', () => {
    expect(parseScenePreviewRequest(`?scene=${ARRIVAL_PREVIEW_SLUG}`, true)).toEqual({ kind: 'arrival', size: 1 });
    expect(parseScenePreviewRequest(`?scene=${ARRIVAL_GROUP_PREVIEW_SLUG}`, true)).toEqual({ kind: 'arrival', size: ARRIVAL_GROUP_SIZE });
    expect(ARRIVAL_GROUP_SIZE).toBe(10);
  });

  it('pins the requested screen and restarts it once per dwell instead of advancing', () => {
    const snapshot = snapshotWith([record(0)]);
    const request: ScenePreviewRequest = { kind: 'scene', scene: 'peacemakers' };
    const dwellMs = sceneDwellSeconds(snapshot, 'peacemakers') * 1_000;
    expect(dwellMs).toBe(60_000);

    const atStart = planScenePreview(request, snapshot, 0);
    const beforeDwell = planScenePreview(request, snapshot, dwellMs - 1);
    const atDwell = planScenePreview(request, snapshot, dwellMs);
    const afterThree = planScenePreview(request, snapshot, dwellMs * 3 + 10);

    expect(atStart.scene).toBe('peacemakers');
    expect(atStart.holdInput).toBe(true);
    expect(atStart.arrivals).toBeNull();
    expect(atStart.replayKey).toBe(0);
    expect(beforeDwell.replayKey).toBe(0);
    expect(atDwell.replayKey).toBe(1);
    expect(afterThree.replayKey).toBe(3);
    expect(afterThree.scene).toBe('peacemakers');
  });

  it('reads the dwell from the live playlist and falls back to the contract duration', () => {
    const custom = snapshotWith([record(0)], COLOR_POLISH_SCENES.map((id) => ({ id, enabled: true, durationSeconds: id === 'garden' ? 120 : 45 })));
    expect(sceneDwellSeconds(custom, 'garden')).toBe(120);
    expect(sceneDwellSeconds(custom, 'welcome')).toBe(45);
    expect(sceneDwellSeconds(null, 'garden')).toBe(COLOR_POLISH_DURATIONS.garden);
    const clamped = snapshotWith([record(0)], [{ id: 'welcome', enabled: true, durationSeconds: 900 }]);
    expect(sceneDwellSeconds(clamped, 'welcome')).toBe(180);
  });

  it('replays a single entrance about every twenty seconds from records already in the snapshot', () => {
    const records = Array.from({ length: 3 }, (_, index) => record(index));
    const snapshot = snapshotWith(records);
    const request: ScenePreviewRequest = { kind: 'arrival', size: 1 };

    expect(scenePreviewStepMs(request, snapshot)).toBe(ARRIVAL_PREVIEW_PERIOD_MS);
    const first = planScenePreview(request, snapshot, 0);
    const second = planScenePreview(request, snapshot, ARRIVAL_PREVIEW_PERIOD_MS);

    expect(first.holdInput).toBe(true);
    expect(first.replayKey).toBeUndefined();
    expect(first.scene).toBe(previewBaseScene(snapshot));
    expect(first.arrivals).toHaveLength(1);
    expect(first.arrivals?.[0]?.recognitionId).toBe('synthetic-record-0');
    expect(first.arrivals?.[0]?.publishedAt).toBe(records[0].firstPublishedAt);
    expect(second.arrivals?.[0]?.eventId).not.toBe(first.arrivals?.[0]?.eventId);
    for (const arrival of first.arrivals ?? []) {
      expect(records.some((item) => item.id === arrival.recognitionId)).toBe(true);
      expect(arrival.eventId.length).toBeLessThanOrEqual(128);
      // The public snapshot's own event ids are digits only, so the replayed ones are too.
      expect(arrival.eventId).toMatch(/^\d+$/);
    }
  });

  it('sends ten distinct arrivals for the group entrance and none when the snapshot holds fewer than ten records', () => {
    const full = snapshotWith(Array.from({ length: 14 }, (_, index) => record(index)));
    const thin = snapshotWith(Array.from({ length: 9 }, (_, index) => record(index)));
    const request: ScenePreviewRequest = { kind: 'arrival', size: ARRIVAL_GROUP_SIZE };

    const group = planScenePreview(request, full, 0).arrivals ?? [];
    expect(group).toHaveLength(ARRIVAL_GROUP_SIZE);
    expect(new Set(group.map((item) => item.eventId)).size).toBe(ARRIVAL_GROUP_SIZE);
    expect(new Set(group.map((item) => item.recognitionId)).size).toBe(ARRIVAL_GROUP_SIZE);

    expect(planScenePreview(request, thin, 0).arrivals).toEqual([]);
  });

  it('never replays a record that is missing, unpublished or already expired', () => {
    const expired = record(0, { expiresAt: new Date(SERVER_MS - 1_000).toISOString() });
    const snapshot = snapshotWith([expired, record(1), record(2)]);
    const arrivals = buildPreviewArrivals(snapshot, 0, 2);
    expect(arrivals.map((item) => item.recognitionId)).toEqual(['synthetic-record-1', 'synthetic-record-2']);
    expect(buildPreviewArrivals(snapshotWith([]), 0, 1)).toEqual([]);
    expect(buildPreviewArrivals(null, 0, 1)).toEqual([]);
  });

  it('holds on the first enabled playlist screen when an arrival link is opened', () => {
    const snapshot = snapshotWith([record(0)], [
      { id: 'welcome', enabled: false, durationSeconds: 60 },
      { id: 'garden', enabled: true, durationSeconds: 180 },
    ]);
    expect(previewBaseScene(snapshot)).toBe('garden');
    expect(previewBaseScene(null)).toBe('welcome');
  });

  it('keeps the cycle counter safe for odd inputs', () => {
    expect(scenePreviewCycle(-5, 20_000)).toBe(0);
    expect(scenePreviewCycle(Number.NaN, 20_000)).toBe(0);
    expect(scenePreviewCycle(45_000, Number.NaN)).toBe(2);
    expect(scenePreviewCycle(45_000, 0)).toBe(2);
  });
});
