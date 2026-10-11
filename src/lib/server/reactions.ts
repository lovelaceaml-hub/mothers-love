import { randomSessionToken, sha256 } from "./operations";
import { databaseClient } from "./supabase";
import { MAX_REACTION_BATCH_SIZE } from "@/lib/reaction-contract";

export const REACTION_COOKIE_NAME = "ml_reaction";
export const REACTION_COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const COOKIE_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export type ReactionItem = {
  id: string;
  count: number;
  liked: boolean;
};

export type ReactionResult = {
  ok: true;
  items: ReactionItem[];
};

export type ReactionMutationResult = {
  ok: true;
  id: string;
  count: number;
  liked: boolean;
};

export type DatabaseQueryResult = {
  data: unknown;
  error: Error | null;
};

export function parseReactionIds(value: string | null): string[] | null {
  if (!value) return null;
  const ids = value.split(",").map((id) => id.trim());
  if (ids.length < 1 || ids.length > MAX_REACTION_BATCH_SIZE || ids.some((id) => !UUID_PATTERN.test(id))) return null;
  const seen = new Set<string>();
  for (const id of ids) {
    const normalized = id.toLowerCase();
    if (seen.has(normalized)) return null;
    seen.add(normalized);
  }
  return ids;
}

export function isReactionCookie(value: string | null | undefined): value is string {
  return typeof value === "string" && COOKIE_PATTERN.test(value);
}

export function createReactionCookie(): string {
  return randomSessionToken();
}

export function visitorHash(cookie: string): string {
  return sha256(cookie);
}

function projectItem(value: unknown): ReactionItem | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.id !== "string" || !UUID_PATTERN.test(record.id)) return null;
  if (!Number.isSafeInteger(record.count) || (record.count as number) < 0) return null;
  if (typeof record.liked !== "boolean") return null;
  return { id: record.id, count: record.count as number, liked: record.liked };
}

export function projectReactionResult(value: unknown, expectedIds?: readonly string[]): ReactionResult | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.ok !== true || !Array.isArray(record.items)) return null;
  const items: ReactionItem[] = [];
  const ids = new Set<string>();
  const allowedIds = expectedIds ? new Set(expectedIds.map((id) => id.toLowerCase())) : null;
  for (const rawItem of record.items) {
    const item = projectItem(rawItem);
    if (!item || (allowedIds && !allowedIds.has(item.id.toLowerCase())) || ids.has(item.id.toLowerCase())) return null;
    ids.add(item.id.toLowerCase());
    items.push(item);
  }
  return { ok: true, items };
}

export function projectReactionMutation(value: unknown, expectedId?: string): ReactionMutationResult | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.ok !== true || typeof record.id !== "string" || !UUID_PATTERN.test(record.id)) return null;
  if (expectedId && record.id.toLowerCase() !== expectedId.toLowerCase()) return null;
  if (!Number.isSafeInteger(record.count) || (record.count as number) < 0 || typeof record.liked !== "boolean") return null;
  return { ok: true, id: record.id, count: record.count as number, liked: record.liked };
}

export async function queryReactions(ids: string[], hashedVisitor: string): Promise<DatabaseQueryResult> {
  const client = databaseClient();
  if (!client) return { data: null, error: new Error("UNAVAILABLE") };
  try {
    const rows = await client`select public.ml_reactions_get(${client.json(ids as never)}::jsonb, ${hashedVisitor}) as result`;
    return { data: rows[0]?.result ?? null, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error : new Error("DATABASE_ERROR") };
  }
}

export async function setReaction(
  id: string,
  hashedVisitor: string,
  liked: boolean,
  rateIp: string,
): Promise<DatabaseQueryResult> {
  const client = databaseClient();
  if (!client) return { data: null, error: new Error("UNAVAILABLE") };
  try {
    const rows = await client`select public.ml_reactions_set(${id}::uuid, ${hashedVisitor}, ${liked}, ${rateIp}) as result`;
    return { data: rows[0]?.result ?? null, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error : new Error("DATABASE_ERROR") };
  }
}

export type ReactionTotalResult = {
  ok: true;
  total: number;
};

// The campaign-wide likes total shown in the TV header. Only the one number
// leaves the server.
export function projectReactionTotal(value: unknown): ReactionTotalResult | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.ok !== true || !Number.isSafeInteger(record.total) || (record.total as number) < 0) return null;
  return { ok: true, total: record.total as number };
}

export async function queryReactionTotal(): Promise<DatabaseQueryResult> {
  const client = databaseClient();
  if (!client) return { data: null, error: new Error("UNAVAILABLE") };
  try {
    const rows = await client`select public.ml_reactions_total() as result`;
    return { data: rows[0]?.result ?? null, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error : new Error("DATABASE_ERROR") };
  }
}
