import type { ColorPolishSnapshot } from './contracts';

export const DISPLAY_CACHE_CURSOR = /^v2:[a-f0-9]{32}:\d{1,19}:\d{1,19}\.\d{1,19}$/;
export const DISPLAY_RECORD_TOKEN = /^[a-f0-9]{32}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type DisplayPoolEntry = { id: string; token: string };
export type DisplayDelta =
  | { cacheCursor: string; serverTime: string; unchanged: true }
  | { cacheCursor: string; serverTime: string; unchanged: false; pool: DisplayPoolEntry[]; snapshot: ColorPolishSnapshot };

function object(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/** The server supplies its stricter public projector; the browser supplies its validator. */
export function projectDisplayDelta(
  value: unknown,
  projectSnapshot: (value: unknown) => ColorPolishSnapshot | null,
): DisplayDelta | null {
  if (!object(value) || value.ok !== true || typeof value.cacheCursor !== 'string' || !DISPLAY_CACHE_CURSOR.test(value.cacheCursor)
    || typeof value.serverTime !== 'string' || value.serverTime.length > 64 || !Number.isFinite(Date.parse(value.serverTime))) return null;
  const { cacheCursor, serverTime } = value;
  if (value.unchanged === true) {
    if (Object.keys(value).some((key) => !['ok', 'cacheCursor', 'serverTime', 'unchanged'].includes(key))) return null;
    return { cacheCursor, serverTime, unchanged: true };
  }
  if (value.unchanged !== false || !Array.isArray(value.pool) || value.pool.length > 100 || !object(value.snapshot)) return null;
  const ids = new Set<string>();
  const tokens = new Set<string>();
  const pool: DisplayPoolEntry[] = [];
  for (const entry of value.pool) {
    if (!object(entry) || typeof entry.id !== 'string' || !UUID.test(entry.id) || typeof entry.token !== 'string'
      || !DISPLAY_RECORD_TOKEN.test(entry.token) || ids.has(entry.id.toLowerCase()) || tokens.has(entry.token)) return null;
    ids.add(entry.id.toLowerCase());
    tokens.add(entry.token);
    pool.push({ id: entry.id, token: entry.token });
  }
  // Arrivals can refer to an unchanged record in the client's cache. Validate
  // them against the authoritative pool, rather than just the changed records.
  const snapshot = projectSnapshot({ ...value.snapshot, arrivals: [] });
  if (!snapshot || snapshot.serverTime !== serverTime || snapshot.recognitions.length > 100
    || snapshot.recognitions.some((item) => !ids.has(item.id.toLowerCase()) || Date.parse(item.expiresAt) <= Date.parse(serverTime))
    || snapshot.settings.mode !== 'normal' && pool.length > 0) return null;
  if (!Array.isArray(value.snapshot.arrivals) || value.snapshot.arrivals.length > 1000) return null;
  const eventIds = new Set<string>();
  const arrivals: ColorPolishSnapshot['arrivals'] = [];
  for (const event of value.snapshot.arrivals) {
    if (!object(event) || typeof event.eventId !== 'string' || !/^\d{1,19}$/.test(event.eventId)
      || BigInt(event.eventId) > BigInt('9223372036854775807') || eventIds.has(event.eventId)
      || typeof event.recognitionId !== 'string' || !ids.has(event.recognitionId.toLowerCase())
      || typeof event.publishedAt !== 'string' || event.publishedAt.length > 64 || !Number.isFinite(Date.parse(event.publishedAt))
      || Date.parse(event.publishedAt) > Date.parse(serverTime)) return null;
    eventIds.add(event.eventId);
    arrivals.push({ eventId: event.eventId, recognitionId: event.recognitionId, publishedAt: event.publishedAt });
  }
  if (snapshot.settings.mode !== 'normal' && arrivals.length || snapshot.sync === 'reset' && arrivals.length) return null;
  return { cacheCursor, serverTime, unchanged: false, pool, snapshot: { ...snapshot, arrivals } };
}
