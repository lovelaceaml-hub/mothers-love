import { describe, expect, it } from 'vitest';
import { createInitialState, displayReducer, storyIndexFor, type PresentationState } from '@/lib/display/coordinator';
import { syntheticSnapshot } from '../plan08/display-fixtures';

function initial(ids: string[], count = 2, tempo = 'standard') {
  const snap = syntheticSnapshot({ count, settings: { playlist: ids.map(id => ({ id, enabled: true })) as NonNullable<ReturnType<typeof syntheticSnapshot>['settings']['playlist']>, tempo: tempo as 'standard' } });
  return displayReducer(createInitialState(), { type: 'SNAPSHOT_RECEIVED', snapshot: snap, receivedAtMs: 0 });
}
function next(s: PresentationState) { return displayReducer({ ...s, nowMs: s.nowMs + 1_000 }, { type: 'ADVANCE' }); }

describe('interview playback promises', () => {
  it('cycles all nine Spotlight and Daily Practice choices and all three official lines across repeated playlists', () => {
    let s = initial(['spotlight', 'daily-practice', 'one-kind-word']);
    const seen: Record<string, number[]> = { spotlight: [], 'daily-practice': [], 'one-kind-word': [] };
    for (let i = 0; i < 27; i++) { seen[s.screen].push(storyIndexFor(s, s.screen)); s = next(s); }
    expect(seen.spotlight).toEqual([0,1,2,3,4,5,6,7,8]);
    expect(seen['daily-practice']).toEqual([0,1,2,3,4,5,6,7,8]);
    expect(seen['one-kind-word']).toEqual([0,1,2,0,1,2,0,1,2]);
  });
  it('advances teaching screens on the clock even before the first recognition', () => {
    let s = initial(['garden', 'spotlight', 'daily-practice'], 0);
    s = displayReducer(s, { type: 'TICK', nowMs: s.nextTransitionAtMs! });
    expect(s.screen).toBe('spotlight');
    expect(s.nextTransitionAtMs).toBeGreaterThan(24_000);
  });
  it('preserves owner order including the Garden position', () => {
    let s = initial(['impact', 'garden', 'spotlight']);
    const screens = [];
    for (let i = 0; i < 4; i++) { screens.push(s.screen); s = next(s); }
    expect(screens).toEqual(['impact', 'garden', 'spotlight', 'garden']);
  });
  it('keeps default Garden airtime near two thirds', () => {
    let s = initial(['garden', 'spotlight', 'daily-practice', 'expressions']);
    let gardenMs = 0; let totalMs = 0;
    for (let i = 0; i < 6; i++) { const duration = s.nextTransitionAtMs! - s.screenStartedAtMs; totalMs += duration; if (s.screen === 'garden') gardenMs += duration; s = next(s); }
    expect(gardenMs / totalMs).toBeCloseTo(2 / 3, 2);
  });
  it('never shortens a 12-second invitation below the floor at Lively tempo', () => {
    const s = initial(['daily-practice'], 1, 'lively');
    expect(s.nextTransitionAtMs! - s.screenStartedAtMs).toBeGreaterThanOrEqual(12_000);
  });
  it('cycles every available Shared Expression and does not change the lesson on a poll', () => {
    const snap = syntheticSnapshot({ count: 9, settings: { playlist: [{ id: 'shared-expression', enabled: true }] } });
    snap.recognitions.forEach((item, index) => { item.expressionIds = [index + 1]; });
    let s = displayReducer(createInitialState(), { type: 'SNAPSHOT_RECEIVED', snapshot: snap, receivedAtMs: 0 });
    const seen = [];
    for (let i = 0; i < 9; i++) {
      seen.push(s.clusterExpressionId);
      const expression = s.clusterExpressionId;
      s = displayReducer(s, { type: 'SNAPSHOT_RECEIVED', snapshot: { ...snap, sync: 'delta' }, receivedAtMs: s.nowMs + 1 });
      expect(s.clusterExpressionId).toBe(expression);
      s = next(s);
    }
    expect(seen).toEqual([1,2,3,4,5,6,7,8,9]);
  });
  it('gives different recognitions their dedicated readable turn', () => {
    let s = initial(['featured'], 3);
    const ids = [];
    for (let i = 0; i < 3; i++) { ids.push(s.featuredId); s = next(s); }
    expect(new Set(ids).size).toBe(3);
  });
});
