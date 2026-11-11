/** A content tag is the 32 character md5 the database computes over a public payload. */
export const CONTENT_TAG_PATTERN = /^[a-f0-9]{32}$/;

/**
 * Reads the content tag out of an ETag or If-None-Match header value. The host marks a tag
 * weak (`W/"..."`) whenever it compresses the response, so both forms are accepted.
 */
export function parseContentEtag(value: string | null | undefined): string | null {
  return /^(?:W\/)?"([a-f0-9]{32})"$/.exec(value ?? "")?.[1] ?? null;
}

/**
 * The server time to credit a 304 Not Modified reply with. The host answers a matching
 * conditional request itself and sends no body, so the time comes from the reply's Date
 * header. `estimateMs` (the last verified server time plus the time since) is both the floor
 * and the fallback, so the clock never runs backwards and a missing header changes nothing.
 */
export function notModifiedServerTimeMs(dateHeader: string | null | undefined, estimateMs: number): number {
  const headerMs = typeof dateHeader === "string" ? Date.parse(dateHeader) : Number.NaN;
  return Number.isFinite(headerMs) ? Math.max(headerMs, estimateMs) : estimateMs;
}
