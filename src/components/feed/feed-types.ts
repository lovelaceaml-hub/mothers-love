import { expressionById } from '@/lib/catalog';
import { countGraphemes } from '@/lib/name-validation';

export type PublicFeedItem = {
  id: string;
  recipient: string;
  message: string;
  expressionIds: number[];
  firstPublishedAt: string;
  expiresAt: string;
};

export type PublicFeedSnapshot = {
  serverTime: string;
  items: PublicFeedItem[];
};

export type VerifiedFeedSnapshot = PublicFeedSnapshot & {
  verifiedServerTimeMs: number;
  verifiedMonotonicMs: number;
};

export const MAX_PUBLIC_FEED_ITEMS = 30;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && Number.isFinite(Date.parse(value));
}

function decodeItem(value: unknown): PublicFeedItem | null {
  if (!isRecord(value)) return null;

  const { id, recipient, message, expressionIds, firstPublishedAt, expiresAt } = value;
  if (
    typeof id !== 'string' ||
    id.length === 0 ||
    id.length > 128 ||
    typeof recipient !== 'string' ||
    recipient.length === 0 ||
    countGraphemes(recipient) > 80 ||
    typeof message !== 'string' ||
    message.length === 0 ||
    countGraphemes(message) > 500 ||
    !Array.isArray(expressionIds) ||
    expressionIds.length === 0 ||
    expressionIds.length > 9 ||
    !isIsoDate(firstPublishedAt) ||
    !isIsoDate(expiresAt) ||
    Date.parse(expiresAt) <= Date.parse(firstPublishedAt)
  ) {
    return null;
  }

  const normalizedExpressionIds = expressionIds.filter(
    (idValue): idValue is number =>
      typeof idValue === 'number' && Number.isInteger(idValue) && Boolean(expressionById(idValue)),
  );
  if (
    normalizedExpressionIds.length !== expressionIds.length ||
    new Set(normalizedExpressionIds).size !== normalizedExpressionIds.length
  ) return null;

  return {
    id,
    recipient,
    message,
    expressionIds: [...normalizedExpressionIds],
    firstPublishedAt,
    expiresAt,
  };
}

export function decodeFeedSnapshot(value: unknown): PublicFeedSnapshot | null {
  if (!isRecord(value) || !isIsoDate(value.serverTime) || !Array.isArray(value.items)) return null;
  if (value.items.length > 50) return null;

  const items: PublicFeedItem[] = [];
  const ids = new Set<string>();
  for (const item of value.items) {
    const decoded = decodeItem(item);
    if (!decoded) return null;
    if (ids.has(decoded.id)) return null;
    ids.add(decoded.id);
    items.push(decoded);
  }

  return { serverTime: value.serverTime, items };
}

export function verifyFeedSnapshot(value: unknown, monotonicNow: number): VerifiedFeedSnapshot | null {
  const decoded = decodeFeedSnapshot(value);
  if (!decoded) return null;

  const verifiedServerTimeMs = Date.parse(decoded.serverTime);
  const items = decoded.items
    .filter((item) => Date.parse(item.expiresAt) > verifiedServerTimeMs)
    .sort((left, right) => {
      const publishedDifference = Date.parse(right.firstPublishedAt) - Date.parse(left.firstPublishedAt);
      if (publishedDifference !== 0) return publishedDifference;
      return right.id.localeCompare(left.id);
    })
    .slice(0, MAX_PUBLIC_FEED_ITEMS);

  return {
    ...decoded,
    items,
    verifiedServerTimeMs,
    verifiedMonotonicMs: monotonicNow,
  };
}

export function activeFeedItems(snapshot: VerifiedFeedSnapshot, monotonicNow: number): PublicFeedItem[] {
  const elapsedMs = Math.max(0, monotonicNow - snapshot.verifiedMonotonicMs);
  const effectiveServerTimeMs = snapshot.verifiedServerTimeMs + elapsedMs;
  return snapshot.items.filter((item) => Date.parse(item.expiresAt) > effectiveServerTimeMs);
}
