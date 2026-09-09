import type { Aggregate, DisplaySettings, DisplaySnapshot, Recognition } from "@/lib/contracts";
import { isFirstNameLastInitial } from "../name-validation";
import { isIsoDate, graphemeLength } from "./time";
import { databaseClient } from "./supabase";

export type PublicDisplayQuery = {
  data: unknown;
  error: Error | null;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_TIMESTAMP_LENGTH = 64;
const MAX_CURSOR_LENGTH = 64;
const MAX_RECOGNITIONS = 1000;
const MAX_BIGINT = BigInt("9223372036854775807");

function parseTimestamp(value: unknown): number | null {
  if (typeof value !== "string" || value.length === 0 || value.length > MAX_TIMESTAMP_LENGTH) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isSafeInteger(value: unknown, minimum = 0): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= minimum;
}

function projectCursor(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0 || value.length > MAX_CURSOR_LENGTH) return null;
  if (!/^\d+\.\d+$/.test(value)) return null;
  const [eventId, epoch] = value.split(".");
  try {
    if (BigInt(eventId) > MAX_BIGINT || BigInt(epoch) > MAX_BIGINT) return null;
  } catch {
    return null;
  }
  return value;
}

function projectSettings(value: unknown): DisplaySettings | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const settings = value as Record<string, unknown>;
  if (!isSafeInteger(settings.version, 1)) return null;
  if (settings.mode !== "normal" && settings.mode !== "quiet" && settings.mode !== "neutral") return null;
  if (settings.motion !== "calm" && settings.motion !== "standard" && settings.motion !== "lively" && settings.motion !== "still") return null;
  if (typeof settings.pauseArrivals !== "boolean" || typeof settings.pauseRotation !== "boolean") return null;
  if (typeof settings.collectionOpen !== "boolean") return null;
  if (!isSafeInteger(settings.lowActivityMinutes, 1) || settings.lowActivityMinutes > 180) return null;
  if (!isSafeInteger(settings.readingSeconds, 8) || settings.readingSeconds > 60) return null;
  if (!isSafeInteger(settings.maxBubbles, 1) || settings.maxBubbles > 6) return null;
  if (typeof settings.showTrails !== "boolean" || typeof settings.showConstellations !== "boolean") return null;
  return {
    version: settings.version,
    mode: settings.mode,
    motion: settings.motion,
    pauseArrivals: settings.pauseArrivals,
    pauseRotation: settings.pauseRotation,
    collectionOpen: settings.collectionOpen,
    lowActivityMinutes: settings.lowActivityMinutes,
    readingSeconds: settings.readingSeconds,
    maxBubbles: settings.maxBubbles,
    showTrails: settings.showTrails,
    showConstellations: settings.showConstellations,
  };
}

function projectAggregate(value: unknown): Aggregate | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const aggregate = value as Record<string, unknown>;
  if (typeof aggregate.periodStart !== "string" || !isIsoDate(aggregate.periodStart)) return null;
  if (typeof aggregate.periodEnd !== "string" || !isIsoDate(aggregate.periodEnd) || aggregate.periodEnd < aggregate.periodStart) return null;
  if (!isSafeInteger(aggregate.recognitions)) return null;
  if (!Array.isArray(aggregate.expressionCounts) || aggregate.expressionCounts.length !== 9) return null;
  if (!aggregate.expressionCounts.every((count) => isSafeInteger(count))) return null;
  if (!isSafeInteger(aggregate.expressionTotal)) return null;
  if (!isSafeInteger(aggregate.revision, 1)) return null;
  return {
    periodStart: aggregate.periodStart,
    periodEnd: aggregate.periodEnd,
    recognitions: aggregate.recognitions,
    expressionCounts: [...aggregate.expressionCounts] as number[],
    expressionTotal: aggregate.expressionTotal,
    revision: aggregate.revision,
  };
}

function projectRecognition(value: unknown, serverTime: number): Recognition | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const recognition = value as Record<string, unknown>;
  if (typeof recognition.id !== "string" || !UUID_PATTERN.test(recognition.id)) return null;
  if (typeof recognition.recipient !== "string" || recognition.recipient.length === 0 || graphemeLength(recognition.recipient) > 80 || !isFirstNameLastInitial(recognition.recipient)) return null;
  if (typeof recognition.message !== "string" || recognition.message.length === 0 || graphemeLength(recognition.message) > 500) return null;
  if (!Array.isArray(recognition.expressionIds) || recognition.expressionIds.length < 1 || recognition.expressionIds.length > 9) return null;
  if (!recognition.expressionIds.every((id): id is number => isSafeInteger(id, 1) && id <= 9)) return null;
  if (recognition.expressionIds.some((id, index, ids) => index > 0 && id <= ids[index - 1])) return null;
  const createdAt = parseTimestamp(recognition.createdAt);
  const firstPublishedAt = parseTimestamp(recognition.firstPublishedAt);
  const expiresAt = parseTimestamp(recognition.expiresAt);
  if (createdAt === null || firstPublishedAt === null || expiresAt === null) return null;
  if (createdAt > serverTime || firstPublishedAt > serverTime || firstPublishedAt < createdAt || expiresAt <= serverTime || expiresAt <= firstPublishedAt) return null;
  if (!isSafeInteger(recognition.version, 1) || recognition.status !== "published" || typeof recognition.featured !== "boolean") return null;
  return {
    id: recognition.id,
    recipient: recognition.recipient,
    message: recognition.message,
    expressionIds: [...recognition.expressionIds],
    createdAt: recognition.createdAt as string,
    firstPublishedAt: recognition.firstPublishedAt as string,
    expiresAt: recognition.expiresAt as string,
    version: recognition.version,
    status: "published",
    featured: recognition.featured,
  };
}

function isOrdered(previous: Recognition, current: Recognition): boolean {
  if (previous.featured !== current.featured) return previous.featured;
  const previousTime = Date.parse(previous.firstPublishedAt ?? previous.createdAt);
  const currentTime = Date.parse(current.firstPublishedAt ?? current.createdAt);
  if (previousTime !== currentTime) return previousTime > currentTime;
  return previous.id.toLowerCase() > current.id.toLowerCase();
}

function projectArrival(value: unknown, eligibleIds: Set<string>, serverTime: number): DisplaySnapshot["arrivals"][number] | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const arrival = value as Record<string, unknown>;
  if (typeof arrival.eventId !== "string" || !/^\d+$/.test(arrival.eventId) || arrival.eventId.length > 19) return null;
  try {
    if (BigInt(arrival.eventId) > MAX_BIGINT) return null;
  } catch {
    return null;
  }
  if (typeof arrival.recognitionId !== "string" || !UUID_PATTERN.test(arrival.recognitionId)) return null;
  if (!eligibleIds.has(arrival.recognitionId.toLowerCase())) return null;
  const publishedAt = parseTimestamp(arrival.publishedAt);
  if (publishedAt === null || publishedAt > serverTime) return null;
  return {
    eventId: arrival.eventId,
    recognitionId: arrival.recognitionId,
    publishedAt: arrival.publishedAt as string,
  };
}

export function projectPublicDisplaySnapshot(value: unknown): DisplaySnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.ok !== true) return null;
  const serverTimeMs = parseTimestamp(record.serverTime);
  if (serverTimeMs === null || !Array.isArray(record.recognitions) || record.recognitions.length > MAX_RECOGNITIONS) return null;
  const settings = projectSettings(record.settings);
  const aggregate = projectAggregate(record.aggregate);
  const cursor = projectCursor(record.cursor);
  if (!settings || !aggregate || !cursor) return null;
  if (typeof record.submissionUrl !== "string" || record.submissionUrl.length > 2048) return null;
  if (record.submissionUrl) {
    try {
      const submissionUrl = new URL(record.submissionUrl);
      if ((submissionUrl.protocol !== "https:" && submissionUrl.protocol !== "http:") || submissionUrl.username || submissionUrl.password) return null;
    } catch {
      return null;
    }
  }
  if (record.sync !== "reset" && record.sync !== "delta") return null;
  const recognitions: Recognition[] = [];
  const ids = new Set<string>();
  for (const rawRecognition of record.recognitions) {
    const recognition = projectRecognition(rawRecognition, serverTimeMs);
    if (!recognition) return null;
    const normalizedId = recognition.id.toLowerCase();
    if (ids.has(normalizedId)) return null;
    ids.add(normalizedId);
    if (recognitions.length > 0 && !isOrdered(recognitions[recognitions.length - 1], recognition)) return null;
    recognitions.push(recognition);
  }
  if (settings.mode !== "normal" && recognitions.length > 0) return null;
  const arrivalsValue = record.arrivals;
  if (!Array.isArray(arrivalsValue) || arrivalsValue.length > MAX_RECOGNITIONS) return null;
  const arrivals: DisplaySnapshot["arrivals"] = [];
  const arrivalIds = new Set<string>();
  for (const rawArrival of arrivalsValue) {
    const arrival = projectArrival(rawArrival, ids, serverTimeMs);
    if (!arrival) return null;
    if (arrivalIds.has(arrival.eventId)) return null;
    arrivalIds.add(arrival.eventId);
    arrivals.push(arrival);
  }
  if (settings.mode !== "normal" && arrivals.length > 0) return null;
  if (record.revision !== undefined && !isSafeInteger(record.revision, 1)) return null;
  if (record.revision === undefined) return null;
  return {
    serverTime: record.serverTime as string,
    revision: record.revision,
    recognitions,
    aggregate,
    settings,
    submissionUrl: record.submissionUrl,
    cursor,
    sync: record.sync,
    arrivals,
  };
}

export async function queryPublicDisplaySnapshot(after: string | null): Promise<PublicDisplayQuery> {
  const client = databaseClient();
  if (!client) return { data: null, error: new Error("UNAVAILABLE") };
  try {
    const rows = await client`select public.ml_public_display_snapshot(${after}) as result`;
    return { data: rows[0]?.result ?? null, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error : new Error("DATABASE_ERROR") };
  }
}
