import {
  DISPLAY_EXTERNAL_URLS,
  DISPLAY_SCREEN_IDS,
  type Aggregate,
  type DisplayEffects,
  type DisplayPlaylistEntry,
  type DisplaySettings,
  type DisplaySnapshot,
  type DisplaySound,
  type Recognition,
} from "@/lib/contracts";
import { hasVisibleNameContent } from "@/lib/name-validation";
import { isIsoDate, graphemeLength } from "./time";
import { getPublicDisplayClient, retirePublicDisplayClient } from "./public-display-client";
import { MAX_STORED_MESSAGE_GRAPHEMES } from "@/lib/contracts";

export type PublicDisplayQuery = {
  data: unknown;
  error: Error | null;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_TIMESTAMP_LENGTH = 64;
const MAX_CURSOR_LENGTH = 64;
const MAX_RECOGNITIONS = 1000;
const MAX_BIGINT = BigInt("9223372036854775807");
const PUBLIC_DISPLAY_OPERATION_DEADLINE_MS = 8_000;
const DISPLAY_SCREEN_ID_SET = new Set<string>(DISPLAY_SCREEN_IDS);
const DISPLAY_TEMPOS = new Set(["slow", "standard", "fast", "calm", "gentle", "lively"]);
const DISPLAY_EFFECT_KEYS = new Set(["trails", "constellations", "sparkles", "background"]);
const DISPLAY_SOUND_KEYS = new Set(["enabled", "volume", "arrivalChime", "milestoneChime"]);
const MIN_DURATION_SECONDS = 12;
const MAX_DURATION_SECONDS = 120;
const MAX_SOUND_VOLUME = 0.4;

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

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function projectGardenAmount(value: unknown): "all-active" | number | null {
  if (value === "all-active") return value;
  return isSafeInteger(value, 1) ? value : null;
}

function projectPlaylist(value: unknown): DisplayPlaylistEntry[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > DISPLAY_SCREEN_IDS.length) return null;
  const entries: DisplayPlaylistEntry[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (!isPlainRecord(item)) return null;
    const keys = Object.keys(item);
    if (keys.some((key) => !["id", "screenId", "screen", "enabled", "durationSeconds"].includes(key))) return null;
    const rawId = item.id ?? item.screenId ?? item.screen;
    if (typeof rawId !== "string" || !DISPLAY_SCREEN_ID_SET.has(rawId) || seen.has(rawId)) return null;
    if (typeof item.enabled !== "boolean") return null;
    if (item.durationSeconds !== undefined && item.durationSeconds !== null && (!isSafeInteger(item.durationSeconds, MIN_DURATION_SECONDS) || item.durationSeconds > MAX_DURATION_SECONDS)) return null;
    seen.add(rawId);
    entries.push({
      id: rawId as DisplayPlaylistEntry["id"],
      enabled: item.enabled,
      ...(item.durationSeconds === undefined || item.durationSeconds === null ? {} : { durationSeconds: item.durationSeconds }),
    });
  }
  return entries.some((entry) => entry.enabled) ? entries : null;
}

function projectDurationOverrides(value: unknown): Partial<Record<DisplayPlaylistEntry["id"], number>> | null {
  if (!isPlainRecord(value)) return null;
  const result: Partial<Record<DisplayPlaylistEntry["id"], number>> = {};
  for (const key of Object.keys(value)) {
    if (!DISPLAY_SCREEN_ID_SET.has(key)) return null;
    const duration = value[key];
    if (duration === null) continue;
    if (!isSafeInteger(duration, MIN_DURATION_SECONDS) || duration > MAX_DURATION_SECONDS) return null;
    result[key as DisplayPlaylistEntry["id"]] = duration;
  }
  return result;
}

function projectEffects(value: unknown): DisplayEffects | null {
  if (!isPlainRecord(value)) return null;
  if (Object.keys(value).some((key) => !DISPLAY_EFFECT_KEYS.has(key))) return null;
  const result: Partial<DisplayEffects> = {};
  for (const key of DISPLAY_EFFECT_KEYS) {
    if (value[key] !== undefined && typeof value[key] !== "boolean") return null;
    if (value[key] !== undefined) result[key as keyof DisplayEffects] = value[key] as never;
  }
  return Object.keys(result).length ? result as DisplayEffects : null;
}

function projectSound(value: unknown): DisplaySound | null {
  if (!isPlainRecord(value) || Object.keys(value).some((key) => !DISPLAY_SOUND_KEYS.has(key))) return null;
  if (typeof value.enabled !== "boolean" || typeof value.volume !== "number" || !Number.isFinite(value.volume) || value.volume < 0 || value.volume > MAX_SOUND_VOLUME) return null;
  if (typeof value.arrivalChime !== "boolean" || typeof value.milestoneChime !== "boolean") return null;
  return {
    enabled: value.enabled,
    volume: value.volume,
    arrivalChime: value.arrivalChime,
    milestoneChime: value.milestoneChime,
  };
}

function projectOfficialUrls(value: unknown): typeof DISPLAY_EXTERNAL_URLS | null {
  if (!isPlainRecord(value)) return null;
  const keys = Object.keys(value);
  if (keys.length !== 2 || !keys.every((key) => key === "dailyPractice" || key === "peacePromise")) return null;
  return value.dailyPractice === DISPLAY_EXTERNAL_URLS.dailyPractice && value.peacePromise === DISPLAY_EXTERNAL_URLS.peacePromise
    ? DISPLAY_EXTERNAL_URLS
    : null;
}

function projectSettings(value: unknown): DisplaySettings | null {
  if (!isPlainRecord(value)) return null;
  const settings = value;
  if (!isSafeInteger(settings.version, 1)) return null;
  if (settings.mode !== "normal" && settings.mode !== "quiet" && settings.mode !== "neutral") return null;
  if (settings.motion !== "calm" && settings.motion !== "standard" && settings.motion !== "lively" && settings.motion !== "still") return null;
  if (typeof settings.pauseArrivals !== "boolean" || typeof settings.pauseRotation !== "boolean") return null;
  if (typeof settings.collectionOpen !== "boolean") return null;
  if (!isSafeInteger(settings.lowActivityMinutes, 1) || settings.lowActivityMinutes > 180) return null;
  if (!isSafeInteger(settings.readingSeconds, 8) || settings.readingSeconds > 60) return null;
  if (typeof settings.showTrails !== "boolean" || typeof settings.showConstellations !== "boolean") return null;

  const hasNewContract = ["gardenAmount", "playlist", "tempo", "durationOverrides", "effects", "sound", "externalUrls"].some((key) => Object.prototype.hasOwnProperty.call(settings, key));
  if (!hasNewContract) {
    if (!isSafeInteger(settings.maxBubbles, 1) || settings.maxBubbles > 6) return null;
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

  const gardenAmount = projectGardenAmount(settings.gardenAmount);
  const playlist = projectPlaylist(settings.playlist);
  if (gardenAmount === null || !playlist) return null;
  if (typeof settings.tempo !== "string" || !DISPLAY_TEMPOS.has(settings.tempo)) return null;
  let durationOverrides: DisplaySettings["durationOverrides"];
  if (settings.durationOverrides !== undefined) {
    const projectedOverrides = projectDurationOverrides(settings.durationOverrides);
    if (projectedOverrides === null) return null;
    durationOverrides = projectedOverrides;
  }
  let effects: DisplayEffects | undefined;
  if (settings.effects !== undefined) {
    const projectedEffects = projectEffects(settings.effects);
    if (projectedEffects === null) return null;
    effects = projectedEffects;
  }
  let sound: DisplaySound | undefined;
  if (settings.sound !== undefined) {
    const projectedSound = projectSound(settings.sound);
    if (projectedSound === null) return null;
    sound = projectedSound;
  }
  let externalUrls: typeof DISPLAY_EXTERNAL_URLS | undefined;
  if (settings.externalUrls !== undefined) {
    const projectedUrls = projectOfficialUrls(settings.externalUrls);
    if (projectedUrls === null) return null;
    externalUrls = projectedUrls;
  }
  if (settings.maxBubbles !== undefined && (!isSafeInteger(settings.maxBubbles, 1) || settings.maxBubbles > 6)) return null;
  const compatibilityGardenAmount = gardenAmount === "all-active" ? 4 : Math.min(6, gardenAmount);
  const projected: DisplaySettings = {
    version: settings.version,
    mode: settings.mode,
    motion: settings.motion,
    pauseArrivals: settings.pauseArrivals,
    pauseRotation: settings.pauseRotation,
    collectionOpen: settings.collectionOpen,
    lowActivityMinutes: settings.lowActivityMinutes,
    readingSeconds: settings.readingSeconds,
    showTrails: settings.showTrails,
    showConstellations: settings.showConstellations,
    maxBubbles: settings.maxBubbles === undefined ? compatibilityGardenAmount : settings.maxBubbles,
    gardenAmount,
    playlist,
    tempo: settings.tempo as DisplaySettings["tempo"],
    ...(durationOverrides === undefined ? {} : { durationOverrides }),
    ...(effects === undefined ? {} : { effects }),
    ...(sound === undefined ? {} : { sound }),
    ...(externalUrls === undefined ? {} : { externalUrls }),
  };
  return projected;
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
  if (!isSafeInteger(aggregate.revision)) return null;
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
  if (typeof recognition.recipient !== "string" || !hasVisibleNameContent(recognition.recipient) || graphemeLength(recognition.recipient) > 80) return null;
  // Read guard: deliberately the stored bound, not the submission bound. See
  // MAX_MESSAGE_GRAPHEMES in src/lib/contracts.ts. Lowering this would make an
  // already published long recognition vanish from the TV.
  if (typeof recognition.message !== "string" || recognition.message.length === 0 || graphemeLength(recognition.message) > MAX_STORED_MESSAGE_GRAPHEMES) return null;
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
  // PostgreSQL orders timestamp values at microsecond precision. JavaScript
  // Date.parse only retains milliseconds, so equal parsed times cannot safely
  // impose a UUID order that could reject the database's valid exact order.
  return true;
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

export async function queryPublicDisplaySnapshot(after: string | null, signal?: AbortSignal): Promise<PublicDisplayQuery> {
  if (signal?.aborted) return { data: null, error: new Error("REQUEST_ABORTED") };
  const client = getPublicDisplayClient();
  if (!client) return { data: null, error: new Error("UNAVAILABLE") };

  let deadlineTimer: ReturnType<typeof setTimeout> | undefined;
  const operation = Promise.resolve().then(() => client.begin("read only", async (transaction) => {
    if (signal?.aborted) throw new Error("REQUEST_ABORTED");
    await transaction`set local statement_timeout = '5000ms'`;
    if (signal?.aborted) throw new Error("REQUEST_ABORTED");
    const rows = await transaction`select public.ml_public_display_snapshot(${after}) as result`;
    return rows[0]?.result ?? null;
  }));
  void operation.then(() => undefined, () => undefined);

  const deadline = new Promise<never>((_, reject) => {
    deadlineTimer = setTimeout(() => {
      retirePublicDisplayClient(client);
      reject(new Error("DATABASE_TIMEOUT"));
    }, PUBLIC_DISPLAY_OPERATION_DEADLINE_MS);
  });

  try {
    const data = await Promise.race([operation, deadline]);
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error : new Error("DATABASE_ERROR") };
  } finally {
    if (deadlineTimer !== undefined) clearTimeout(deadlineTimer);
  }
}
