import { describe, expect, it } from 'vitest';
import { DisplayRecordCache } from '@/lib/color-polish/display-cache';
import { projectDisplayDelta } from '@/lib/color-polish/delta';
import { projectColorPolishSnapshot } from '@/lib/server/color-polish';
import { snapshot } from '../world/fixtures';

const token = (index: number) => index.toString(16).padStart(32, '0');
const cursor = (state = 1, event = 12) => `v2:${token(state)}:1789063200:${event}.1789063200`;
function reset() {
  const value = snapshot();
  return { ok: true, unchanged: false, cacheCursor: cursor(), serverTime: value.serverTime,
    pool: value.recognitions.map((record, index) => ({ id: record.id, token: token(index + 10) })), snapshot: value };
}
const heartbeat = (serverTime = '2026-09-10T18:00:05.000Z') => ({ ok: true, unchanged: true, cacheCursor: cursor(), serverTime });

describe('verified display record cache', () => {
  it('reuses records while refreshing verification time and clearing arrival events', () => {
    const cache = new DisplayRecordCache();
    const first = cache.accept(reset())!;
    const next = cache.accept(heartbeat())!;
    expect(next.serverTime).toBe('2026-09-10T18:00:05.000Z');
    expect(next.recognitions).toEqual(first.recognitions);
    expect(next.recognitions).toBe(first.recognitions);
    expect(next.arrivals).toEqual([]);
    expect(cache.path()).toContain('known=');
    expect(cache.path()).toContain('sync=2');
  });

  it('adds only the new record, preserves the exact pool order, and accepts one arrival', () => {
    const cache = new DisplayRecordCache();
    const base = reset();
    cache.accept(base);
    const newest = { ...base.snapshot.recognitions[0], id: '00000000-0000-4000-8000-000000009999' };
    const next = cache.accept({ ...base, cacheCursor: cursor(2, 13), pool: [{ id: newest.id, token: token(99) }, ...base.pool],
      snapshot: { ...base.snapshot, sync: 'delta', recognitions: [newest], arrivals: [{ eventId: '13', recognitionId: newest.id, publishedAt: base.serverTime }] } })!;
    expect(next.recognitions[0]).toEqual(newest);
    expect(next.recognitions).toHaveLength(base.pool.length + 1);
    expect(next.arrivals).toHaveLength(1);
    expect(cache.accept({ ...heartbeat(), cacheCursor: cursor(2, 13) })!.arrivals).toEqual([]);
  });

  it('removes withdrawn records and replaces edited records even with the same application revision', () => {
    const cache = new DisplayRecordCache();
    const base = reset();
    cache.accept(base);
    const edited = { ...base.snapshot.recognitions[1], message: 'A fictional correction.' };
    const pool = base.pool.slice(1).map((entry, index) => index === 0 ? { ...entry, token: token(99) } : entry);
    const next = cache.accept({ ...base, cacheCursor: cursor(2), pool,
      snapshot: { ...base.snapshot, sync: 'delta', recognitions: [edited] } })!;
    expect(next.recognitions.map((record) => record.id)).toEqual(pool.map((entry) => entry.id));
    expect(next.recognitions[0].message).toBe(edited.message);
  });

  it('accepts current settings/presentation metadata without reloading old records', () => {
    const cache = new DisplayRecordCache();
    const base = reset();
    cache.accept(base);
    const next = cache.accept({ ...base, cacheCursor: cursor(2), snapshot: { ...base.snapshot, sync: 'delta', recognitions: [],
      settings: { ...base.snapshot.settings, pauseRotation: true }, presentation: { ...base.snapshot.presentation, enabled: false } } })!;
    expect(next.settings.pauseRotation).toBe(true);
    expect(next.presentation.enabled).toBe(false);
    expect(next.recognitions).toHaveLength(base.pool.length);
  });

  it.each(['quiet', 'neutral'])('empties personal cache for %s and cannot resurrect it on a partial response', (mode) => {
    const cache = new DisplayRecordCache();
    const base = reset();
    cache.accept(base);
    const quiet = cache.accept({ ...base, cacheCursor: cursor(2), pool: [], snapshot: { ...base.snapshot,
      recognitions: [], settings: { ...base.snapshot.settings, mode } } })!;
    expect(quiet.recognitions).toEqual([]);
    expect(cache.accept({ ...base, snapshot: { ...base.snapshot, sync: 'delta', recognitions: [] } })).toBeNull();
    expect(cache.path()).toBe('/api/display/color-polish?sync=2');
  });

  it('requires a reset after cache loss, invalid tokens, stale expiry, or a backwards clock', () => {
    const cache = new DisplayRecordCache();
    const base = reset();
    expect(cache.accept(heartbeat())).toBeNull();
    cache.accept(base);
    cache.clear();
    expect(cache.accept(heartbeat())).toBeNull();
    cache.accept(base);
    expect(cache.accept({ ...base, pool: base.pool.map((entry) => ({ ...entry, token: token(99) })), snapshot: { ...base.snapshot, sync: 'delta', recognitions: [] } })).toBeNull();
    cache.accept(base);
    expect(cache.accept(heartbeat('2026-09-10T17:59:59Z'))).toBeNull();
    cache.accept(base);
    expect(cache.accept(heartbeat('2026-09-20T18:00:00Z'))).toBeNull();
  });

  it('projects only public fields and rejects malformed or ineligible delta arrivals', () => {
    const base = reset();
    const unsafe = structuredClone(base);
    Object.assign(unsafe.snapshot.recognitions[0], { submittedName: 'Private fixture field', reason: 'Private fixture reason' });
    const safe = projectDisplayDelta(unsafe, projectColorPolishSnapshot)!;
    expect(safe.unchanged).toBe(false);
    if (!safe.unchanged) expect(JSON.stringify(safe)).not.toMatch(/Private fixture|submittedName|reason/);
    expect(projectDisplayDelta({ ...base, snapshot: { ...base.snapshot, arrivals: [{ eventId: '1', recognitionId: 'missing', publishedAt: base.serverTime }] } }, projectColorPolishSnapshot)).toBeNull();
    expect(projectDisplayDelta({ ...heartbeat(), snapshot: base.snapshot }, projectColorPolishSnapshot)).toBeNull();
  });
});
