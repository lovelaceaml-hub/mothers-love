import type { PublicFeedItem, PublicFeedSnapshot } from "@/lib/feed-contract";
import { hasVisibleNameContent } from "@/lib/name-validation";
import { clampPublicExpiry } from "./expiry-clamp";
import { graphemeLength } from "./time";
import { databaseClient } from "./supabase";
import { recordDatabaseResultBytes } from "./database-result-metrics";
import { UUID_PATTERN } from "@/lib/uuid";
import { CONTENT_TAG_PATTERN } from "@/lib/etag";

export type PublicFeedQuery = {
  data: unknown;
  error: Error | null;
};

const MAX_TIMESTAMP_LENGTH = 64;
const MAX_PUBLIC_FEED_ITEMS = 100;

function parseTimestamp(value: unknown): number | null {
  if (typeof value !== "string" || value.length === 0 || value.length > MAX_TIMESTAMP_LENGTH) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isPublicFeedItem(value: unknown, serverTime: number): value is PublicFeedItem {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  if (typeof item.id !== "string" || !UUID_PATTERN.test(item.id)) return false;
  if (typeof item.recipient !== "string" || !hasVisibleNameContent(item.recipient) || graphemeLength(item.recipient) > 80) return false;
  if (typeof item.message !== "string" || item.message.length === 0 || graphemeLength(item.message) > 500) return false;
  if (!Array.isArray(item.expressionIds) || item.expressionIds.length < 1 || item.expressionIds.length > 9) return false;
  if (!item.expressionIds.every((id): id is number => Number.isInteger(id) && id >= 1 && id <= 9)) return false;
  if (item.expressionIds.some((id, index, ids) => index > 0 && id <= ids[index - 1])) return false;
  const firstPublishedAt = parseTimestamp(item.firstPublishedAt);
  const expiresAt = parseTimestamp(item.expiresAt);
  if (firstPublishedAt === null || expiresAt === null) return false;
  if (firstPublishedAt > serverTime || expiresAt <= serverTime || expiresAt <= firstPublishedAt) return false;
  return true;
}

function isOrdered(previous: PublicFeedItem, current: PublicFeedItem): boolean {
  const previousTime = Date.parse(previous.firstPublishedAt);
  const currentTime = Date.parse(current.firstPublishedAt);
  if (previousTime !== currentTime) return previousTime > currentTime;
  return previous.id.toLowerCase() > current.id.toLowerCase();
}

export function projectPublicFeed(value: unknown): PublicFeedSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const serverTime = parseTimestamp(record.serverTime);
  if (serverTime === null || !Array.isArray(record.items) || record.items.length > MAX_PUBLIC_FEED_ITEMS) return null;

  const items: PublicFeedItem[] = [];
  const ids = new Set<string>();
  for (const rawItem of record.items) {
    if (!isPublicFeedItem(rawItem, serverTime)) return null;
    const item = rawItem as Record<string, unknown>;
    const id = item.id as string;
    if (ids.has(id.toLowerCase())) return null;
    ids.add(id.toLowerCase());
    const projected: PublicFeedItem = {
      id,
      recipient: item.recipient as string,
      message: item.message as string,
      expressionIds: [...(item.expressionIds as number[])],
      firstPublishedAt: item.firstPublishedAt as string,
      expiresAt: clampPublicExpiry(item.expiresAt as string, serverTime),
    };
    if (items.length > 0 && !isOrdered(items[items.length - 1], projected)) return null;
    items.push(projected);
  }

  return { serverTime: record.serverTime as string, items };
}

export function projectPublicFeedHeartbeat(value: unknown): { unchanged: true; serverTime: string } | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (Object.keys(record).length !== 2 || record.unchanged !== true) return null;
  const serverTime = parseTimestamp(record.serverTime);
  return serverTime === null ? null : { unchanged: true, serverTime: record.serverTime as string };
}

export type PublicFeedCursor = { before: string; id: string };

// Reads the ?before=<firstPublishedAt>&id=<uuid> cursor of an older page. The
// timestamp string is passed to the database unchanged, so its microseconds
// survive; the browser only echoes back a value this server sent it.
export function parsePublicFeedCursor(before: string | null, id: string | null): PublicFeedCursor | null {
  if (parseTimestamp(before) === null || typeof id !== "string" || !UUID_PATTERN.test(id)) return null;
  return { before: before as string, id: id.toLowerCase() };
}

// The older page has the same shape and checks as the home feed, and every item
// must sort strictly after the cursor.
export function projectOlderPublicFeed(value: unknown, cursor: PublicFeedCursor): PublicFeedSnapshot | null {
  const snapshot = projectPublicFeed(value);
  if (!snapshot) return null;
  const cursorItem = { id: cursor.id, firstPublishedAt: cursor.before } as PublicFeedItem;
  if (snapshot.items.length > 0 && !isOrdered(cursorItem, snapshot.items[0])) return null;
  return snapshot;
}

export async function queryOlderPublicFeed(
  cursor: PublicFeedCursor,
  knownEtag: string | null = null,
): Promise<PublicFeedQuery & { etag: string | null }> {
  const client = databaseClient();
  if (!client) return { data: null, error: new Error("UNAVAILABLE"), etag: null };
  try {
    // Re-run the current page selection on every refresh. The database returns
    // only a heartbeat when the same public page is still current, so hides,
    // expiry and edits remain visible immediately without transferring the page.
    // Keep the same fixed UTC-8 day boundary as the public expiry clamp, which
    // advances its seven-day ceiling daily even when the stored rows do not.
    const rows = await client`
      with older as materialized (
        select public.ml_public_feed_older(${cursor.before}::timestamptz, ${cursor.id}::uuid)::jsonb as value
      ), tagged as (
        select value,
          md5(
            (value - 'serverTime')::text || '|' ||
            pg_catalog.to_char(
              ((value->>'serverTime')::timestamptz at time zone 'UTC') - interval '8 hours',
              'YYYY-MM-DD'
            )
          ) as etag
        from older
      )
      select etag,
        case when ${knownEtag}::text = etag
          then jsonb_build_object('unchanged', true, 'serverTime', value->'serverTime')
          else value
        end as result
      from tagged
    `;
    const row = rows[0];
    const etag = typeof row?.etag === "string" && CONTENT_TAG_PATTERN.test(row.etag) ? row.etag : null;
    const data = row?.result ?? null;
    recordDatabaseResultBytes("feed.older", data);
    return { data, error: null, etag };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error("DATABASE_ERROR"),
      etag: null,
    };
  }
}

export async function queryPublicFeed(knownEtag: string | null = null): Promise<PublicFeedQuery & { etag: string | null }> {
  const client = databaseClient();
  if (!client) return { data: null, error: new Error("UNAVAILABLE"), etag: null };
  try {
    // Keep unchanged feed reads small across the HTTP boundary. The database
    // still runs the public feed function, but the server avoids projecting and
    // validating every item when the content digest matches the caller's tag.
    const rows = await client`
      with feed as materialized (
        select public.ml_public_feed()::jsonb as value
      ), tagged as (
        select value,
          md5(
            (value - 'serverTime')::text || '|' ||
            pg_catalog.to_char(
              ((value->>'serverTime')::timestamptz at time zone 'UTC') - interval '8 hours',
              'YYYY-MM-DD'
            )
          ) as etag
        from feed
      )
      select etag,
        case when ${knownEtag}::text = etag
          then jsonb_build_object('unchanged', true, 'serverTime', value->'serverTime')
          else value
        end as result
      from tagged
    `;
    const row = rows[0];
    const etag = typeof row?.etag === "string" && CONTENT_TAG_PATTERN.test(row.etag) ? row.etag : null;
    const data = row?.result ?? null;
    recordDatabaseResultBytes("feed.home", data);
    return { data, error: null, etag };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error : new Error("DATABASE_ERROR"), etag: null };
  }
}
