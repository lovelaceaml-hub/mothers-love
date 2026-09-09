import { describe, expect, it } from 'vitest';

import type { DisplaySnapshot, Recognition } from '@/lib/contracts';
import {
  createInitialState,
  displayReducer,
  effectiveMotion,
  isGroupedArrival,
  recognitionReadingPageCount,
  selectEligible,
  splitVerbatimMessage,
} from '@/lib/display/coordinator';

const serverOrigin = Date.parse('2026-09-08T12:00:00.000Z');

function recognition(id: string, overrides: Partial<Recognition> = {}): Recognition {
  return {
    id,
    recipient: `Synthetic recipient ${id}`,
    message: `Synthetic appreciation message for ${id}.`,
    expressionIds: [1, 2],
    createdAt: new Date(serverOrigin).toISOString(),
    firstPublishedAt: new Date(serverOrigin).toISOString(),
    expiresAt: new Date(serverOrigin + 168 * 60 * 60 * 1000).toISOString(),
    version: 1,
    status: 'published',
    featured: false,
    ...overrides,
  };
}

function snapshot(
  records: Recognition[],
  options: Partial<DisplaySnapshot> = {},
): DisplaySnapshot {
  return {
    serverTime: new Date(serverOrigin).toISOString(),
    revision: 1,
    recognitions: records,
    aggregate: {
      periodStart: '2026-09-01T07:00:00.000Z',
      periodEnd: '2026-10-01T07:00:00.000Z',
      recognitions: records.length,
      expressionCounts: [0, 0, 0, 0, 0, 0, 0, 0, 0],
      expressionTotal: 0,
      revision: 1,
    },
    settings: {
      version: 1,
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
    },
    submissionUrl: 'https://synthetic.invalid/recognize',
    cursor: 'cursor-1',
    sync: 'reset',
    arrivals: [],
    ...options,
  };
}

function received(state: ReturnType<typeof createInitialState>, current: DisplaySnapshot, atMs = 0) {
  return displayReducer(state, { type: 'SNAPSHOT_RECEIVED', snapshot: current, receivedAtMs: atMs });
}

function delta(
  current: DisplaySnapshot,
  records: Recognition[],
  arrivals: DisplaySnapshot['arrivals'],
  atMs: number,
  aggregate?: Partial<DisplaySnapshot['aggregate']>,
) {
  return {
    ...current,
    revision: current.revision + 1,
    cursor: `cursor-${current.revision + 1}`,
    sync: 'delta' as const,
    recognitions: records,
    arrivals,
    aggregate: { ...current.aggregate, ...aggregate, revision: current.aggregate.revision + 1 },
    serverTime: new Date(serverOrigin + atMs).toISOString(),
  };
}

describe('display presentation coordinator', () => {
  it('groups ten arrivals without dropping their fair rotation eligibility', () => {
    const records = Array.from({ length: 10 }, (_, index) => recognition(String(index + 1)));
    const initial = received(createInitialState(), snapshot(records), 0);
    const arrivals = records.map((item) => ({ eventId: `event-${item.id}`, recognitionId: item.id, publishedAt: item.firstPublishedAt! }));
    const withBurst = received(initial, delta(snapshot(records), records, arrivals, 1), 1);

    expect(withBurst.queue).toHaveLength(10);
    const journey = displayReducer(withBurst, { type: 'TICK', nowMs: 20_001 });
    expect(journey.screen).toBe('arrival');
    expect(journey.activeArrival?.id).toBe('1');
    expect(journey.activeArrival?.grouped).toBe(true);
    expect(journey.queue).toHaveLength(10);

    const finished = displayReducer(journey, { type: 'TICK', nowMs: journey.activeArrival!.readingEndsAtMs + 1 });
    expect(finished.queue).toHaveLength(0);
    expect(finished.introducedPublicationKeys).toHaveLength(10);
  });

  it('deduplicates duplicate event delivery and treats edits as the same publication', () => {
    const item = recognition('one');
    const base = received(createInitialState(), snapshot([item]), 0);
    const arrival = { eventId: 'event-one', recognitionId: 'one', publishedAt: item.firstPublishedAt! };
    const first = received(base, delta(snapshot([item]), [item], [arrival], 1), 1);
    const edited = recognition('one', { version: 2, message: 'Synthetic edited message.' });
    const second = received(first, delta(snapshot([edited]), [edited], [arrival, arrival], 2), 2);

    expect(first.queue).toHaveLength(1);
    expect(second.queue).toHaveLength(1);
    expect(second.queue[0].version).toBe(1);
    expect(second.knownPublicationKeys).toEqual(['event-one']);
  });

  it('deduplicates repeated event ids within one delta response', () => {
    const item = recognition('same-delta');
    const base = received(createInitialState(), snapshot([item]), 0);
    const arrival = { eventId: 'event-same-delta', recognitionId: item.id, publishedAt: item.firstPublishedAt! };
    const next = received(base, delta(snapshot([item]), [item], [arrival, arrival, arrival], 1), 1);

    expect(next.queue).toHaveLength(1);
    expect(next.knownPublicationKeys).toEqual(['event-same-delta']);
  });

  it('starts a restart from a quiet authoritative snapshot without replaying old records', () => {
    const records = [recognition('one'), recognition('two')];
    const restarted = received(createInitialState(), snapshot(records, { arrivals: [], sync: 'reset' }), 0);

    expect(restarted.screen).toBe('garden');
    expect(restarted.queue).toHaveLength(0);
    expect(restarted.activeArrival).toBeNull();
  });

  it('marks every already-crossed milestone as baseline on startup', () => {
    const current = snapshot([recognition('baseline')], {
      aggregate: { ...snapshot([]).aggregate, recognitions: 1_500 },
    });
    const state = received(createInitialState(), current, 0);

    expect(state.pendingMilestone).toBeNull();
    expect(state.celebratedMilestones['2026-09']).toContain(1_500);
  });

  it('removes an expired record immediately while rotation is paused', () => {
    const item = recognition('expiring', { expiresAt: new Date(serverOrigin + 5_000).toISOString() });
    const current = snapshot([item], { settings: { ...snapshot([]).settings, pauseRotation: true } });
    const state = received(createInitialState(), current, 0);
    const afterExpiry = displayReducer(state, { type: 'TICK', nowMs: 5_001 });

    expect(selectEligible(afterExpiry)).toHaveLength(0);
    expect(afterExpiry.gardenIds).toHaveLength(0);
    expect(afterExpiry.screen).toBe('garden');
  });

  it('holds every full-message page before featured or arrival presentation is counted', () => {
    const message = Array.from({ length: 24 }, (_, index) => `Line ${index + 1}: preserve this exact appreciation.\n`).join('').slice(0, 500);
    const item = recognition('long-reading', {
      recipient: 'R'.repeat(80),
      message,
      expressionIds: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    });
    const messagePages = splitVerbatimMessage(message);
    expect(messagePages.join('')).toBe(message);
    expect(messagePages.length).toBeGreaterThan(1);
    const denseLines = `${'A\n'.repeat(249)}A`;
    const densePages = splitVerbatimMessage(denseLines);
    expect(densePages.join('')).toBe(denseLines);
    expect(Math.max(...densePages.map((page) => (page.match(/\n/g) ?? []).length))).toBeLessThanOrEqual(7);
    const pageCount = recognitionReadingPageCount(item);
    const base = received(createInitialState(), snapshot([item]), 0);

    let featured = displayReducer(base, { type: 'ADVANCE' });
    expect(featured.screen).toBe('featured');
    expect(featured.readingPageCount).toBe(pageCount);
    expect(featured.presentationHistory[item.id]).toBe(0);
    for (let page = 1; page < pageCount; page += 1) {
      featured = displayReducer(featured, { type: 'TICK', nowMs: featured.nextTransitionAtMs! + 1 });
      expect(featured.screen).toBe('featured');
      expect(featured.readingPageIndex).toBe(page);
    }
    const featuredFinished = displayReducer(featured, { type: 'TICK', nowMs: featured.nextTransitionAtMs! + 1 });
    expect(featuredFinished.presentationHistory[item.id]).toBeDefined();

    const arrivalEvent = { eventId: 'event-long-reading', recognitionId: item.id, publishedAt: item.firstPublishedAt! };
    const queued = received(base, delta(base.snapshot!, [item], [arrivalEvent], 1), 1);
    let arrival = displayReducer(queued, { type: 'TICK', nowMs: queued.nextTransitionAtMs! + 1 });
    expect(arrival.activeArrival?.readingPageCount).toBe(pageCount);
    const presentationBeforeArrivalReading = arrival.presentationHistory[item.id];
    arrival = displayReducer(arrival, { type: 'TICK', nowMs: arrival.activeArrival!.journeyEndsAtMs + 1 });
    const delayed = displayReducer(arrival, { type: 'TICK', nowMs: arrival.activeArrival!.readingEndsAtMs + 1_000 });
    expect(delayed.activeArrival).not.toBeNull();
    expect(delayed.activeArrival?.readingPageIndex).toBe(1);
    expect(delayed.presentationHistory[item.id]).toBe(presentationBeforeArrivalReading);
    for (let page = 1; page < pageCount; page += 1) {
      arrival = displayReducer(arrival, { type: 'TICK', nowMs: arrival.activeArrival!.nextPageEndsAtMs + 1 });
      expect(arrival.activeArrival?.readingPageIndex).toBe(page);
    }
    const arrivalFinished = displayReducer(arrival, { type: 'TICK', nowMs: arrival.activeArrival!.readingEndsAtMs + 1 });
    expect(arrivalFinished.activeArrival).toBeNull();
    expect(arrivalFinished.presentationHistory[item.id]).toBeDefined();
  });

  it('freezes arrival timing while rotation is paused, shifts on resume, and still expires safely', () => {
    const item = recognition('paused-arrival', {
      message: 'A '.repeat(120),
      expiresAt: new Date(serverOrigin + 100_000).toISOString(),
    });
    const base = received(createInitialState(), snapshot([item]), 0);
    const arrivalEvent = { eventId: 'event-paused-arrival', recognitionId: item.id, publishedAt: item.firstPublishedAt! };
    const queued = received(base, delta(base.snapshot!, [item], [arrivalEvent], 1), 1);
    let active = displayReducer(queued, { type: 'TICK', nowMs: queued.nextTransitionAtMs! + 1 });
    active = displayReducer(active, { type: 'TICK', nowMs: active.activeArrival!.journeyEndsAtMs + 1 });
    expect(active.activeArrival?.phase).toBe('reading');
    expect(active.activeArrival?.readingPageIndex).toBe(0);

    const pauseAt = active.nowMs + 1;
    const pausedSnapshot = {
      ...delta(active.snapshot!, [item], [], pauseAt),
      settings: { ...active.snapshot!.settings, pauseRotation: true },
    };
    const paused = received(active, pausedSnapshot, pauseAt);
    const held = displayReducer(paused, { type: 'TICK', nowMs: paused.activeArrival!.readingEndsAtMs + 5_000 });

    expect(held.pauseRotation).toBe(true);
    expect(held.activeArrival?.phase).toBe('reading');
    expect(held.activeArrival?.readingPageIndex).toBe(0);

    const resumeAt = held.nowMs + 1;
    const resumedSnapshot = {
      ...delta(held.snapshot!, [item], [], resumeAt),
      settings: { ...held.snapshot!.settings, pauseRotation: false },
    };
    const resumed = received(held, resumedSnapshot, resumeAt);
    expect(resumed.pauseRotation).toBe(false);
    expect(resumed.activeArrival?.readingPageIndex).toBe(0);
    expect(resumed.activeArrival!.nextPageEndsAtMs).toBeGreaterThan(resumed.nowMs);
    const afterResume = displayReducer(resumed, { type: 'TICK', nowMs: resumed.nowMs + 1_000 });
    expect(afterResume.activeArrival?.readingPageIndex).toBe(0);

    const expired = displayReducer(paused, { type: 'TICK', nowMs: 100_001 });
    expect(expired.activeArrival).toBeNull();
    expect(expired.screen).toBe('garden');
  });

  it('cancels an active arrival immediately when the authoritative snapshot removes it', () => {
    const item = recognition('removed');
    const base = received(createInitialState(), snapshot([item]), 0);
    const arrival = { eventId: 'event-removed', recognitionId: item.id, publishedAt: item.firstPublishedAt! };
    const queued = received(base, delta(snapshot([item]), [item], [arrival], 1), 1);
    const active = displayReducer(queued, { type: 'TICK', nowMs: 20_001 });
    const removed = received(active, delta(snapshot([]), [], [], 20_002), 20_002);

    expect(removed.activeArrival).toBeNull();
    expect(removed.queue).toHaveLength(0);
    expect(removed.screen).toBe('garden');
  });

  it('keeps the last approved public view in memory during a short reconnect', () => {
    const item = recognition('disconnect');
    const state = received(createInitialState(), snapshot([item]), 0);
    const failed = displayReducer(state, { type: 'SNAPSHOT_UNAVAILABLE', receivedAtMs: 5_000 });

    expect(failed.cursor).toBe('cursor-1');
    expect(failed.screen).toBe('garden');
    expect(failed.queue).toHaveLength(0);
    expect(failed.snapshot?.recognitions).toHaveLength(1);
    expect(failed.stale).toBe(true);

    const reset = received(failed, snapshot([item], { revision: 2, cursor: 'cursor-reset', sync: 'reset' }), 6_000);
    expect(reset.screen).toBe('garden');
    expect(reset.cursor).toBe('cursor-reset');
  });

  it('ignores a delayed older revision and honors a configured one bubble density', () => {
    const first = recognition('first');
    const second = recognition('second');
    const current = snapshot([first, second], { settings: { ...snapshot([]).settings, maxBubbles: 1 }, revision: 4, cursor: 'cursor-current' });
    const state = received(createInitialState(), current, 0);
    const older = snapshot([first], { revision: 3, cursor: 'cursor-old', sync: 'delta' });
    const ignored = received(state, older, 1);

    expect(ignored.snapshot?.revision).toBe(4);
    expect(ignored.gardenIds).toHaveLength(1);
  });

  it('fills open Garden slots while rotation is paused and keeps arrival delivery deduplicated', () => {
    const first = recognition('first');
    const second = recognition('second', { firstPublishedAt: new Date(serverOrigin + 1_000).toISOString() });
    const third = recognition('third', { firstPublishedAt: new Date(serverOrigin + 2_000).toISOString() });
    const baseSnapshot = snapshot([first, second], { settings: { ...snapshot([]).settings, maxBubbles: 4, pauseRotation: true } });
    const base = received(createInitialState(), baseSnapshot, 0);
    const arrival = { eventId: 'event-third', recognitionId: third.id, publishedAt: third.firstPublishedAt! };
    const nextSnapshot = delta(baseSnapshot, [first, second, third], [arrival], 1);

    const refreshed = received(base, nextSnapshot, 1);
    const duplicate = received(refreshed, delta(nextSnapshot, [first, second, third], [arrival], 2), 2);

    expect(refreshed.screen).toBe('garden');
    expect(refreshed.pauseRotation).toBe(true);
    expect(refreshed.gardenIds).toEqual(['third', 'second', 'first']);
    expect(refreshed.queue).toHaveLength(1);
    expect(duplicate.gardenIds).toEqual(refreshed.gardenIds);
    expect(duplicate.queue).toHaveLength(1);
  });

  it('replaces removed Garden records from a reset snapshot while preserving valid pinned order', () => {
    const first = recognition('first');
    const second = recognition('second', { firstPublishedAt: new Date(serverOrigin + 1_000).toISOString() });
    const third = recognition('third', { firstPublishedAt: new Date(serverOrigin + 2_000).toISOString() });
    const replacement = recognition('replacement', { firstPublishedAt: new Date(serverOrigin + 3_000).toISOString() });
    const additional = recognition('additional', { firstPublishedAt: new Date(serverOrigin + 4_000).toISOString() });
    const baseSnapshot = snapshot([first, second, third], { settings: { ...snapshot([]).settings, maxBubbles: 3 } });
    const base = received(createInitialState(), baseSnapshot, 0);
    const resetSnapshot = snapshot([
      { ...first, status: 'hidden' },
      second,
      { ...third, expiresAt: new Date(serverOrigin - 1_000).toISOString() },
      replacement,
      additional,
    ], {
      revision: 2,
      cursor: 'cursor-reset',
      sync: 'reset',
      serverTime: new Date(serverOrigin + 1_000).toISOString(),
      settings: baseSnapshot.settings,
    });

    const refreshed = received(base, resetSnapshot, 1_000);

    expect(refreshed.gardenIds).toEqual(['additional', 'replacement', 'second']);
    expect(selectEligible(refreshed).map((item) => item.id)).toEqual(['second', 'replacement', 'additional']);
  });

  it('replaces a bounded Garden slot for a new eligible record and stays stable on unchanged polls', () => {
    const first = recognition('first');
    const second = recognition('second', { firstPublishedAt: new Date(serverOrigin + 1_000).toISOString() });
    const third = recognition('third', { firstPublishedAt: new Date(serverOrigin + 2_000).toISOString() });
    const baseSnapshot = snapshot([first, second], { settings: { ...snapshot([]).settings, maxBubbles: 2 } });
    const base = received(createInitialState(), baseSnapshot, 0);
    const arrival = { eventId: 'event-third-full', recognitionId: third.id, publishedAt: third.firstPublishedAt! };
    const refreshedSnapshot = delta(baseSnapshot, [first, second, third], [arrival], 1);
    const refreshed = received(base, refreshedSnapshot, 1);
    const unchanged = received(refreshed, delta(refreshedSnapshot, [first, second, third], [arrival], 2), 2);

    expect(refreshed.gardenIds).toEqual(['third', 'second']);
    expect(refreshed.queue).toHaveLength(1);
    expect(unchanged.gardenIds).toEqual(refreshed.gardenIds);
    expect(unchanged.queue).toHaveLength(1);
  });

  it('clears personal content after the sixty second offline grace period', () => {
    const item = recognition('offline');
    const state = received(createInitialState(), snapshot([item]), 0);
    const offline = displayReducer(state, { type: 'SNAPSHOT_UNAVAILABLE', receivedAtMs: 60_000 });

    expect(offline.offlineSafe).toBe(true);
    expect(offline.snapshot).toBeNull();
    expect(offline.queue).toHaveLength(0);
    expect(offline.screen).toBe('neutral');

    const resynced = received(offline, snapshot([item], { cursor: 'cursor-resync', sync: 'reset' }), 60_500);
    expect(resynced.offlineSafe).toBe(false);
    expect(resynced.neutral).toBe(false);
    expect(selectEligible(resynced)).toHaveLength(1);
  });

  it('clears the display immediately on an unauthorized snapshot response', () => {
    const state = received(createInitialState(), snapshot([recognition('revoked')]), 0);
    const revoked = displayReducer(state, { type: 'SNAPSHOT_UNAVAILABLE', receivedAtMs: 2_000, unauthorized: true });

    expect(revoked.paired).toBe(false);
    expect(revoked.snapshot).toBeNull();
    expect(revoked.screen).toBe('quiet');
  });

  it('keeps Quiet manual and Still or reduced motion from waking or animating', () => {
    const state = received(createInitialState(), snapshot([recognition('quiet')]), 0);
    const quiet = displayReducer(state, { type: 'SET_OPERATOR_MODE', mode: 'quiet' });
    const still = displayReducer(quiet, { type: 'SET_MOTION', motion: 'still' });
    const reduced = displayReducer(still, { type: 'SET_REDUCED_MOTION', reduced: true });
    const afterTick = displayReducer(reduced, { type: 'TICK', nowMs: 500_000 });

    expect(afterTick.screen).toBe('quiet');
    expect(afterTick.quiet).toBe(true);
    expect(effectiveMotion(afterTick)).toBe('still');
    expect(afterTick.queue).toHaveLength(0);
  });

  it('celebrates only the highest new threshold in a month and records it once', () => {
    const item = recognition('milestone');
    const base = snapshot([item], { aggregate: { ...snapshot([]).aggregate, recognitions: 49 } });
    const state = received(createInitialState(), base, 0);
    const crossed = delta(base, [item], [], 1, { recognitions: 251 });
    const withMilestone = received(state, crossed, 1);
    const milestone = displayReducer(withMilestone, { type: 'TICK', nowMs: 20_001 });

    expect(milestone.pendingMilestone).toBe(250);
    expect(milestone.screen).toBe('milestone');
    const returned = displayReducer(milestone, { type: 'TICK', nowMs: 28_002 });
    expect(returned.pendingMilestone).toBeNull();
    expect(returned.celebratedMilestones['2026-09']).toContain(250);
  });

  it('marks an old burst as grouped while preserving every queued record', () => {
    const records = Array.from({ length: 11 }, (_, index) => recognition(String(index + 1)));
    const base = received(createInitialState(), snapshot(records), 0);
    const arrivals = records.map((item) => ({ eventId: `event-${item.id}`, recognitionId: item.id, publishedAt: item.firstPublishedAt! }));
    const queued = received(base, delta(snapshot(records), records, arrivals, 1), 1);
    const grouped = displayReducer(queued, { type: 'TICK', nowMs: 20_001 });

    expect(grouped.queue).toHaveLength(11);
    expect(isGroupedArrival(grouped)).toBe(true);

    const completed = displayReducer(grouped, { type: 'TICK', nowMs: grouped.activeArrival!.readingEndsAtMs + 1 });
    expect(completed.queue).toHaveLength(0);
    expect(completed.introducedPublicationKeys).toHaveLength(11);

    const later = recognition('later');
    const laterSnapshot = delta(
      completed.snapshot!,
      [...records, later],
      [{ eventId: 'event-later', recognitionId: later.id, publishedAt: later.firstPublishedAt! }],
      completed.nowMs + 1,
    );
    const withLater = received(completed, laterSnapshot, completed.nowMs + 1);
    const laterArrival = displayReducer(withLater, { type: 'TICK', nowMs: withLater.nextTransitionAtMs! + 1 });

    expect(laterArrival.activeArrival?.id).toBe('later');
    expect(laterArrival.activeArrival?.grouped).toBe(false);
  });

  it('uses the enabled modern registry while keeping the Garden-led rhythm readable', () => {
    const item = recognition('modern-playlist');
    const modernSettings = {
      ...snapshot([]).settings,
      gardenAmount: 'all-active' as const,
      playlist: [
        { id: 'garden' as const, enabled: true },
        { id: 'daily-practice' as const, enabled: true, durationSeconds: 12 },
        { id: 'peace-promise' as const, enabled: true, durationSeconds: 12 },
      ],
      tempo: 'standard' as const,
      durationOverrides: {},
      effects: { trails: true, constellations: true, sparkles: true, background: true },
      sound: { enabled: true, volume: 0.2, arrivalChime: true, milestoneChime: true },
    };
    const initial = received(createInitialState(), snapshot([item], { settings: modernSettings }), 0);
    const daily = displayReducer(initial, { type: 'TICK', nowMs: initial.nextTransitionAtMs! + 1 });
    const garden = displayReducer(daily, { type: 'TICK', nowMs: daily.nextTransitionAtMs! + 1 });

    expect(daily.screen).toBe('daily-practice');
    expect(garden.screen).toBe('garden');
  });

  it('honors an unlimited owner amount as a fair pool while capping rendered Garden nodes', () => {
    const records = Array.from({ length: 40 }, (_, index) => recognition(`pool-${index + 1}`, {
      firstPublishedAt: new Date(serverOrigin + index * 1_000).toISOString(),
    }));
    const state = received(createInitialState(), snapshot(records, {
      settings: { ...snapshot([]).settings, gardenAmount: 9_999 },
    }), 0);

    expect(state.settings.gardenAmount).toBe(9_999);
    expect(state.gardenIds).toHaveLength(12);
    expect(new Set(state.gardenIds).size).toBe(12);
  });
});
