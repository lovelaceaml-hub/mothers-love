import type { ColorPolishSnapshot } from './contracts';
import { projectDisplayDelta } from './delta';
import { validateColorPolishSnapshot } from './validation';

/** One display's memory only. Each changed response supplies the exact ordered pool. */
export class DisplayRecordCache {
  private snapshot: ColorPolishSnapshot | null = null;
  private tokens = new Map<string, string>();
  private cursor: string | null = null;
  private legacyCursor: string | null = null;

  clear() {
    this.snapshot = null;
    this.tokens.clear();
    this.cursor = null;
    this.legacyCursor = null;
  }

  path() {
    const query = new URLSearchParams({ sync: '2' });
    const hasDeltaCache = Boolean(this.cursor && this.snapshot);
    const after = hasDeltaCache ? this.cursor : this.legacyCursor;
    if (after) query.set('after', after);
    if (hasDeltaCache) {
      query.set('known', [...this.tokens.values()].join('.'));
    }
    return `/api/display/color-polish?${query}`;
  }

  accept(value: unknown): ColorPolishSnapshot | null {
    const delta = projectDisplayDelta(value, validateColorPolishSnapshot);
    // Full snapshots keep old local fixtures and a staged app rollback compatible.
    if (!delta) {
      const legacy = validateColorPolishSnapshot(value);
      this.clear();
      if (legacy) this.legacyCursor = legacy.cursor;
      return legacy;
    }
    const fail = () => { this.clear(); return null; };
    if (this.snapshot && Date.parse(delta.serverTime) < Date.parse(this.snapshot.serverTime)) return fail();
    if (delta.unchanged) {
      if (!this.snapshot || !this.cursor || delta.cacheCursor.split(':')[1] !== this.cursor.split(':')[1]
        || this.snapshot.recognitions.some((item) => Date.parse(item.expiresAt) <= Date.parse(delta.serverTime))) return fail();
      const next = validateColorPolishSnapshot({ ...this.snapshot, serverTime: delta.serverTime,
        cursor: delta.cacheCursor.split(':')[3], sync: 'delta', arrivals: [] });
      if (!next) return fail();
      next.recognitions = this.snapshot.recognitions;
      this.snapshot = next;
      this.cursor = delta.cacheCursor;
      this.legacyCursor = null;
      return next;
    }
    const records = new Map((delta.snapshot.sync === 'reset' ? [] : this.snapshot?.recognitions ?? []).map((item) => [item.id.toLowerCase(), item]));
    for (const item of delta.snapshot.recognitions) records.set(item.id.toLowerCase(), item);
    const changed = new Set(delta.snapshot.recognitions.map((item) => item.id.toLowerCase()));
    const ordered = [];
    for (const entry of delta.pool) {
      const id = entry.id.toLowerCase();
      const item = records.get(id);
      if (!item || !changed.has(id) && this.tokens.get(id) !== entry.token || Date.parse(item.expiresAt) <= Date.parse(delta.serverTime)) return fail();
      ordered.push(item);
    }
    const next = validateColorPolishSnapshot({ ...delta.snapshot, recognitions: ordered });
    if (!next) return fail();
    next.recognitions = ordered;
    this.snapshot = next;
    this.tokens = new Map(delta.pool.map((entry) => [entry.id.toLowerCase(), entry.token]));
    this.cursor = delta.cacheCursor;
    this.legacyCursor = null;
    return next;
  }
}
