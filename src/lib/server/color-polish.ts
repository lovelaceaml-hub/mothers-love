import {
  COLOR_POLISH_DURATIONS,
  COLOR_POLISH_REQUIRED_SCENES,
  COLOR_POLISH_SCENES,
  COLOR_POLISH_VERSION,
  normalizeColorPolishPlaylist,
  type ColorPolishGoal,
  type ColorPolishInsights,
  type ColorPolishPresentation,
  type ColorPolishScene,
  type ColorPolishSnapshot,
} from "@/lib/color-polish/contracts";
import type { Aggregate } from "@/lib/contracts";
import { endOfLosAngelesWeek, isoDateInLosAngeles, isIsoDate, startOfLosAngelesMonth, startOfLosAngelesWeek } from "./time";
import { getPublicDisplayClient, retirePublicDisplayClient } from "./public-display-client";
import { projectPublicDisplaySnapshot } from "./public-display";

export type ColorPolishQuery = {
  data: unknown;
  error: Error | null;
};

export type ColorPolishPresentationChanges = {
  playlist?: ColorPolishPresentation["playlist"];
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_TIMESTAMP_LENGTH = 64;
const MAX_CALENDAR_DAYS = 31;
const MIN_PRESENTATION_DURATION_SECONDS = 12;
const MAX_PRESENTATION_DURATION_SECONDS = 180;
const COLOR_POLISH_OPERATION_DEADLINE_MS = 8_000;
const COLOR_POLISH_SUBMISSION_URL = "https://mothers-love.vercel.app/recognize";
const AGGREGATE_KEYS = ["periodStart", "periodEnd", "recognitions", "expressionCounts", "expressionTotal", "revision"] as const;
const PRESENTATION_KEYS = ["version", "enabled", "playlist"] as const;
const PRESENTATION_ITEM_KEYS = ["id", "enabled", "durationSeconds"] as const;
const INSIGHTS_KEYS = ["calendar", "currentWeek", "previousWeek", "month", "campaign", "goal"] as const;
const GOAL_KEYS = ["weekStart", "weekEnd", "expressionId", "value", "target", "achieved"] as const;

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && actual.every((key) => keys.includes(key));
}

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).every((key) => keys.includes(key));
}

function parseTimestamp(value: unknown): number | null {
  if (typeof value !== "string" || value.length === 0 || value.length > MAX_TIMESTAMP_LENGTH) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isSafeCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isExpressionCounts(value: unknown): value is number[] {
  return Array.isArray(value) && value.length === 9 && value.every(isSafeCount);
}

function isNineCounts(value: readonly number[]): boolean {
  return value.length === 9 && value.every((count) => Number.isSafeInteger(count) && count >= 0);
}

function addIsoDays(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function projectStrictAggregate(value: unknown): Aggregate | null {
  if (!isPlainRecord(value) || !hasExactKeys(value, AGGREGATE_KEYS)) return null;
  if (typeof value.periodStart !== "string" || !isIsoDate(value.periodStart)) return null;
  if (typeof value.periodEnd !== "string" || !isIsoDate(value.periodEnd) || value.periodEnd < value.periodStart) return null;
  if (!isSafeCount(value.recognitions) || !isExpressionCounts(value.expressionCounts) || !isSafeCount(value.expressionTotal)) return null;
  if (!isSafeCount(value.revision)) return null;
  let expressionTotal = 0;
  for (const count of value.expressionCounts) {
    if (!Number.isSafeInteger(expressionTotal + count)) return null;
    expressionTotal += count;
  }
  if (expressionTotal !== value.expressionTotal) return null;
  return {
    periodStart: value.periodStart,
    periodEnd: value.periodEnd,
    recognitions: value.recognitions,
    expressionCounts: [...value.expressionCounts],
    expressionTotal: value.expressionTotal,
    revision: value.revision,
  };
}

function projectCalendar(value: unknown, serverTimeMs: number): Aggregate[] | null {
  if (!Array.isArray(value) || value.length > MAX_CALENDAR_DAYS) return null;
  const localDate = isoDateInLosAngeles(new Date(serverTimeMs));
  const monthStart = startOfLosAngelesMonth(new Date(serverTimeMs));
  const output: Aggregate[] = [];
  let previousDate = "";
  for (const item of value) {
    const aggregate = projectStrictAggregate(item);
    if (!aggregate || aggregate.periodStart !== aggregate.periodEnd) return null;
    if (aggregate.periodStart < monthStart || aggregate.periodEnd > localDate) return null;
    if (previousDate && aggregate.periodStart <= previousDate) return null;
    previousDate = aggregate.periodStart;
    output.push(aggregate);
  }
  return output;
}

function projectPresentation(value: unknown, appendMissingOptional = true): ColorPolishPresentation | null {
  if (!isPlainRecord(value) || !hasExactKeys(value, PRESENTATION_KEYS)) return null;
  if (value.version !== COLOR_POLISH_VERSION || typeof value.enabled !== "boolean" || !Array.isArray(value.playlist)) return null;
  if (value.playlist.length < COLOR_POLISH_REQUIRED_SCENES.length || value.playlist.length > COLOR_POLISH_SCENES.length) return null;

  const allowedScenes = new Set<string>(COLOR_POLISH_SCENES);
  const seen = new Set<string>();
  const playlist: ColorPolishPresentation["playlist"] = [];
  for (const item of value.playlist) {
    if (!isPlainRecord(item) || !hasExactKeys(item, PRESENTATION_ITEM_KEYS)) return null;
    if (typeof item.id !== "string" || !allowedScenes.has(item.id) || seen.has(item.id)) return null;
    if (typeof item.enabled !== "boolean" || typeof item.durationSeconds !== "number" || !Number.isSafeInteger(item.durationSeconds) || item.durationSeconds < MIN_PRESENTATION_DURATION_SECONDS || item.durationSeconds > MAX_PRESENTATION_DURATION_SECONDS) return null;
    seen.add(item.id);
    playlist.push({ id: item.id as ColorPolishScene, enabled: item.enabled, durationSeconds: item.durationSeconds });
  }
  // Ten or eleven entries, matching database/013_color_polish_live_feed.sql: the ten
  // original screens are required, live-feed is optional. When it is absent (a playlist
  // saved before the screen existed, or before that SQL ran) it is appended with its
  // default entry, so the TV and the Studio always receive the full list.
  if (!COLOR_POLISH_REQUIRED_SCENES.every((scene) => seen.has(scene)) || !playlist.some((entry) => entry.enabled)) return null;
  return { version: COLOR_POLISH_VERSION, enabled: value.enabled, playlist: appendMissingOptional ? normalizeColorPolishPlaylist(playlist) : playlist };
}

export function projectColorPolishPresentationChanges(value: unknown): ColorPolishPresentationChanges | null {
  if (!isPlainRecord(value) || !hasOnlyKeys(value, ["playlist"]) || Object.keys(value).length === 0) return null;
  const changes: ColorPolishPresentationChanges = {};
  // A change request is stored exactly as sent (ten or eleven entries): nothing is
  // appended here, so a ten entry playlist still saves against a database whose
  // validator has not yet been replaced by database/013_color_polish_live_feed.sql.
  const projected = projectPresentation({ version: COLOR_POLISH_VERSION, enabled: true, playlist: value.playlist }, false);
  if (!projected) return null;
  changes.playlist = projected.playlist;
  return changes;
}

function projectGoal(value: unknown, currentWeek: Aggregate, serverTimeMs: number): ColorPolishGoal | null {
  if (!isPlainRecord(value) || !hasExactKeys(value, GOAL_KEYS)) return null;
  const currentWeekStart = startOfLosAngelesWeek(new Date(serverTimeMs));
  const currentWeekEnd = endOfLosAngelesWeek(new Date(serverTimeMs));
  if (typeof value.weekStart !== "string" || value.weekStart !== currentWeekStart || typeof value.weekEnd !== "string" || value.weekEnd !== currentWeekEnd) return null;
  const expressionId = value.expressionId;
  if (typeof expressionId !== "number" || !Number.isSafeInteger(expressionId) || expressionId < 1 || expressionId > 9) return null;
  if (!isSafeCount(value.value) || !isSafeCount(value.target) || typeof value.achieved !== "boolean") return null;
  const expressionIndex = expressionId - 1;
  const expectedValue = currentWeek.expressionCounts[expressionIndex];
  const otherCounts = currentWeek.expressionCounts.filter((_, index) => index !== expressionIndex).sort((a, b) => b - a);
  const expectedTarget = Math.max(1, (otherCounts[3] ?? 0) + 1);
  if (value.value !== expectedValue || value.target !== expectedTarget || value.achieved !== expectedValue >= expectedTarget) return null;
  return {
    weekStart: value.weekStart,
    weekEnd: value.weekEnd,
    expressionId,
    value: value.value,
    target: value.target,
    achieved: value.achieved,
  };
}

function projectInsights(value: unknown, serverTimeMs: number): ColorPolishInsights | null {
  if (!isPlainRecord(value) || !hasExactKeys(value, INSIGHTS_KEYS)) return null;
  const calendar = projectCalendar(value.calendar, serverTimeMs);
  const currentWeek = projectStrictAggregate(value.currentWeek);
  const previousWeek = projectStrictAggregate(value.previousWeek);
  const month = projectStrictAggregate(value.month);
  const campaign = projectStrictAggregate(value.campaign);
  if (!calendar || !currentWeek || !previousWeek || !month || !campaign) return null;

  const localDate = isoDateInLosAngeles(new Date(serverTimeMs));
  const currentWeekStart = startOfLosAngelesWeek(new Date(serverTimeMs));
  const previousWeekStart = addIsoDays(currentWeekStart, -7);
  const previousWeekEnd = addIsoDays(currentWeekStart, -1);
  const monthStart = startOfLosAngelesMonth(new Date(serverTimeMs));
  if (currentWeek.periodStart !== currentWeekStart || currentWeek.periodEnd !== localDate) return null;
  if (previousWeek.periodStart !== previousWeekStart || previousWeek.periodEnd !== previousWeekEnd) return null;
  if (month.periodStart !== monthStart || month.periodEnd !== localDate) return null;
  if (campaign.periodEnd !== localDate || campaign.periodStart > campaign.periodEnd) return null;

  const goal = projectGoal(value.goal, currentWeek, serverTimeMs);
  if (!goal) return null;
  return { calendar, currentWeek, previousWeek, month, campaign, goal };
}

/** Selects the lowest prior-week expression. Ties use the official 1 to 9 order. */
export function selectLeastUsedExpression(counts: readonly number[]): number {
  if (!isNineCounts(counts)) throw new TypeError("Expected nine nonnegative expression counts");
  let selected = 1;
  for (let expressionId = 2; expressionId <= counts.length; expressionId += 1) {
    if (counts[expressionId - 1] < counts[selected - 1]) selected = expressionId;
  }
  return selected;
}

/** Calculates the live target as one above the fourth highest other expression. */
export function calculateColorPolishGoal(expressionId: number, currentCounts: readonly number[], weekStart: string, weekEnd: string): ColorPolishGoal {
  if (!Number.isSafeInteger(expressionId) || expressionId < 1 || expressionId > 9 || !isNineCounts(currentCounts) || !isIsoDate(weekStart) || !isIsoDate(weekEnd) || weekEnd !== addIsoDays(weekStart, 6)) {
    throw new TypeError("Invalid color polish goal inputs");
  }
  const expressionIndex = expressionId - 1;
  const value = currentCounts[expressionIndex];
  const otherCounts = currentCounts.filter((_, index) => index !== expressionIndex).sort((a, b) => b - a);
  const target = Math.max(1, (otherCounts[3] ?? 0) + 1);
  return { weekStart, weekEnd, expressionId, value, target, achieved: value >= target };
}

export function buildColorPolishGoal(previousCounts: readonly number[], currentCounts: readonly number[], weekStart: string, weekEnd: string): ColorPolishGoal {
  return calculateColorPolishGoal(selectLeastUsedExpression(previousCounts), currentCounts, weekStart, weekEnd);
}

export const selectWeeklyFocusExpression = selectLeastUsedExpression;
export const deriveColorPolishGoal = buildColorPolishGoal;

export function projectColorPolishSnapshot(value: unknown): ColorPolishSnapshot | null {
  if (!isPlainRecord(value) || value.ok !== true) return null;
  const base = projectPublicDisplaySnapshot(value);
  if (!base) return null;
  if (base.submissionUrl !== COLOR_POLISH_SUBMISSION_URL) return null;
  const serverTimeMs = parseTimestamp(base.serverTime);
  if (serverTimeMs === null) return null;
  const presentation = projectPresentation(value.presentation);
  const insights = projectInsights(value.insights, serverTimeMs);
  if (!presentation || !insights) return null;
  const month = base.aggregate;
  if (month.periodStart !== insights.month.periodStart || month.periodEnd !== insights.month.periodEnd || month.recognitions !== insights.month.recognitions || month.expressionTotal !== insights.month.expressionTotal || month.revision !== insights.month.revision || month.expressionCounts.some((count, index) => count !== insights.month.expressionCounts[index])) return null;
  return { ...base, presentation, insights };
}

export async function queryColorPolishSnapshot(after: string | null, signal?: AbortSignal): Promise<ColorPolishQuery> {
  if (signal?.aborted) return { data: null, error: new Error("REQUEST_ABORTED") };
  const client = getPublicDisplayClient();
  if (!client) return { data: null, error: new Error("UNAVAILABLE") };

  let deadlineTimer: ReturnType<typeof setTimeout> | undefined;
  const operation = Promise.resolve().then(() => client.begin("read write", async (transaction) => {
    if (signal?.aborted) throw new Error("REQUEST_ABORTED");
    await transaction`set local statement_timeout = '5000ms'`;
    await transaction`set transaction isolation level repeatable read`;
    if (signal?.aborted) throw new Error("REQUEST_ABORTED");
    const rows = await transaction`select public.ml_color_polish_snapshot(${after}) as result`;
    return rows[0]?.result ?? null;
  }));
  void operation.then(() => undefined, () => undefined);

  const deadline = new Promise<never>((_, reject) => {
    deadlineTimer = setTimeout(() => {
      retirePublicDisplayClient(client);
      reject(new Error("DATABASE_TIMEOUT"));
    }, COLOR_POLISH_OPERATION_DEADLINE_MS);
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

export const COLOR_POLISH_DEFAULT_PRESENTATION: ColorPolishPresentation = {
  version: COLOR_POLISH_VERSION,
  enabled: false,
  playlist: COLOR_POLISH_SCENES.map((id) => ({ id, enabled: true, durationSeconds: COLOR_POLISH_DURATIONS[id] })),
};

export function isColorPolishRecognitionId(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}
