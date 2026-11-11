/**
 * Starts a page's first read while its code is still downloading (Plan 34 Section C).
 *
 * The page's HTML carries a tiny inline script that begins the same request the page would
 * make after its code loads. The page then takes that answer for its first read instead of
 * asking again. Nothing else changes: the answer goes through the same checks, and if it is
 * missing, late or failed the page reads normally.
 */

const EARLY_READS = {
  feed: { key: '__mlEarlyFeed', url: '/api/feed' },
  config: { key: '__mlEarlyConfig', url: '/api/config' },
} as const;

export type EarlyReadName = keyof typeof EARLY_READS;
export type EarlyRead = { startedAt: number; response: Promise<Response> };

/** An answer that started longer ago than this is left alone and the page reads normally. */
export const EARLY_READ_MAX_AGE_MS = 20_000;

/** The inline script for a page's HTML. It holds only fixed text, never anything from a request. */
export function earlyReadScript(name: EarlyReadName): string {
  const { key, url } = EARLY_READS[name];
  return `(function(){try{var s=performance.now();var r=fetch(${JSON.stringify(url)},{cache:"no-store",credentials:"include",headers:{accept:"application/json"}});r.catch(function(){});window[${JSON.stringify(key)}]={startedAt:s,response:r}}catch(e){}})()`;
}

/**
 * Takes the early answer, once. Returns null when there is none, when it was already taken or
 * when it is too old. `startedAt` is on the same clock as `performance.now()`.
 */
export function takeEarlyRead(name: EarlyReadName, nowMs: number): EarlyRead | null {
  if (typeof window === 'undefined') return null;
  const holder = window as unknown as Record<string, unknown>;
  const { key } = EARLY_READS[name];
  const value = holder[key];
  if (value === undefined) return null;
  holder[key] = undefined;
  if (!value || typeof value !== 'object') return null;
  const { startedAt, response } = value as Partial<EarlyRead>;
  if (typeof startedAt !== 'number' || !Number.isFinite(startedAt)) return null;
  if (!response || typeof (response as Promise<Response>).then !== 'function') return null;
  const age = nowMs - startedAt;
  if (age < 0 || age > EARLY_READ_MAX_AGE_MS) return null;
  return { startedAt, response };
}

/** Waits for the early answer, but no longer than the caller's own abort signal allows. */
export function awaitEarlyRead(early: EarlyRead, signal: AbortSignal): Promise<Response> {
  return new Promise<Response>((resolve, reject) => {
    const onAbort = () => reject(new DOMException('The read was aborted.', 'AbortError'));
    if (signal.aborted) {
      onAbort();
      return;
    }
    signal.addEventListener('abort', onAbort, { once: true });
    early.response.then(
      (response) => { signal.removeEventListener('abort', onAbort); resolve(response); },
      (error) => { signal.removeEventListener('abort', onAbort); reject(error); },
    );
  });
}
