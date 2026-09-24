import type { PublicFeedItem, PublicFeedSnapshot } from "@/lib/feed-contract";
import { hasVisibleNameContent } from "@/lib/name-validation";
import { clampPublicExpiry } from "./expiry-clamp";
import { graphemeLength } from "./time";
import { databaseClient } from "./supabase";

export type PublicFeedQuery = {
  data: unknown;
  error: Error | null;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
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

export async function queryPublicFeed(): Promise<PublicFeedQuery> {
  const client = databaseClient();
  if (!client) return { data: null, error: new Error("UNAVAILABLE") };
  try {
    const rows = await client`select public.ml_public_feed() as result`;
    return { data: rows[0]?.result ?? null, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error : new Error("DATABASE_ERROR") };
  }
}
