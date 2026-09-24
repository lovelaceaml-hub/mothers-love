import { countGraphemes, hasVisibleNameContent, MAX_NAME_GRAPHEMES } from "@/lib/name-validation";
import { graphemeLength, isIsoDate, isMonthBoundary } from "./time";
import {
  DISPLAY_EXTERNAL_URLS,
  DISPLAY_SCREEN_IDS,
  type DisplayEffects,
  type DisplayGardenAmount,
  type DisplayPlaylistEntry,
  type DisplaySound,
} from "@/lib/contracts";
import type { EditableRecognitionFields, MutationAction, RecognitionInput } from "./types";

const REQUEST_KEY_RE = /^[A-Za-z0-9._:-]{8,128}$/;
const REASONS = new Set(["privacy", "recipient_request", "spam", "duplicate", "test", "safety", "correction", "other"]);
const ACTIONS = new Set<MutationAction>(["edit", "publish", "hide", "restore", "invalidate", "feature", "unfeature", "delete"]);
const DISPLAY_SCREEN_ID_SET = new Set<string>(DISPLAY_SCREEN_IDS);
const DISPLAY_TEMPOS = new Set(["slow", "standard", "fast", "calm", "gentle", "lively"]);
const DISPLAY_SETTINGS_KEYS = new Set([
  "mode",
  "motion",
  "pauseArrivals",
  "pauseRotation",
  "collectionOpen",
  "lowActivityMinutes",
  "readingSeconds",
  "maxBubbles",
  "gardenAmount",
  "playlist",
  "tempo",
  "durationOverrides",
  "effects",
  "sound",
  "showTrails",
  "showConstellations",
  "soundEnabled",
  "soundVolume",
  "arrivalChime",
  "milestoneChime",
  "externalUrls",
]);
const DISPLAY_EFFECT_KEYS = new Set(["trails", "constellations", "sparkles", "background"]);
const DISPLAY_SOUND_KEYS = new Set(["enabled", "volume", "arrivalChime", "milestoneChime", "arrivalChimes", "milestoneChimes", "arrivalChimeEnabled", "milestoneChimeEnabled"]);
const DISPLAY_PLAYLIST_KEYS = new Set(["id", "screenId", "screen", "enabled", "durationSeconds"]);
const MAX_DURATION_SECONDS = 120;
const MIN_DURATION_SECONDS = 12;
const MAX_SOUND_VOLUME = 0.4;

export type ValidationIssue = { field: string; code: string };

export type ValidationResult<T> = { value: T; issues: [] } | { value: null; issues: ValidationIssue[] };

function cleanString(value: unknown): string | null {
  return typeof value === "string" ? value.trim() : null;
}

export function validateRecognitionInput(input: unknown): ValidationResult<RecognitionInput> {
  if (!input || typeof input !== "object") return { value: null, issues: [{ field: "body", code: "invalid" }] };
  const body = input as Record<string, unknown>;
  const submittedName = cleanString(body.submittedName);
  const recipient = cleanString(body.recipient);
  const message = cleanString(body.message);
  const requestKey = typeof body.requestKey === "string" ? body.requestKey.trim() : null;
  const rawIds = body.expressionIds;
  const expressionIds = Array.isArray(rawIds) && rawIds.every((id) => Number.isInteger(id)) ? [...new Set(rawIds as number[])].sort((a, b) => a - b) : null;
  const issues: ValidationIssue[] = [];
  if (!submittedName || !hasVisibleNameContent(submittedName)) issues.push({ field: "submittedName", code: "required" });
  else if (countGraphemes(submittedName) > MAX_NAME_GRAPHEMES) issues.push({ field: "submittedName", code: "too_long" });
  if (!recipient || !hasVisibleNameContent(recipient)) issues.push({ field: "recipient", code: "required" });
  else if (countGraphemes(recipient) > MAX_NAME_GRAPHEMES) issues.push({ field: "recipient", code: "too_long" });
  if (!message) issues.push({ field: "message", code: "required" });
  else if (graphemeLength(message) > 500) issues.push({ field: "message", code: "too_long" });
  if (!expressionIds || expressionIds.length < 1 || expressionIds.length > 9 || expressionIds.some((id) => id < 1 || id > 9)) issues.push({ field: "expressionIds", code: "invalid" });
  if (!requestKey || !REQUEST_KEY_RE.test(requestKey)) issues.push({ field: "requestKey", code: "invalid" });
  const encoded = new TextEncoder().encode(JSON.stringify(body)).byteLength;
  if (encoded > 16 * 1024) issues.push({ field: "body", code: "too_large" });
  if (issues.length) return { value: null, issues };
  return { value: { submittedName: submittedName!, recipient: recipient!, message: message!, expressionIds: expressionIds!, requestKey: requestKey! }, issues: [] };
}

export function validateMutation(input: unknown): ValidationResult<{ expectedVersion: number; action: MutationAction; fields?: Partial<EditableRecognitionFields>; reason?: string }> {
  if (!input || typeof input !== "object") return { value: null, issues: [{ field: "body", code: "invalid" }] };
  const body = input as Record<string, unknown>;
  const expectedVersion = body.expectedVersion;
  const action = body.action;
  const issues: ValidationIssue[] = [];
  if (!Number.isInteger(expectedVersion) || Number(expectedVersion) < 1) issues.push({ field: "expectedVersion", code: "invalid" });
  if (typeof action !== "string" || !ACTIONS.has(action as MutationAction)) issues.push({ field: "action", code: "invalid" });
  let fields: Partial<EditableRecognitionFields> | undefined;
  if (body.fields !== undefined) {
    const result = validateEditablePatch(body.fields);
    if (result.issues.length) issues.push(...result.issues.map((issue) => ({ field: `fields.${issue.field}`, code: issue.code })));
    else if (result.value) fields = result.value;
  }
  const reason = body.reason === undefined ? undefined : cleanString(body.reason);
  if (reason !== undefined && (!reason || !REASONS.has(reason))) issues.push({ field: "reason", code: "invalid" });
  if (["hide", "restore", "invalidate"].includes(String(action)) && !reason) issues.push({ field: "reason", code: "required" });
  if (action === "edit" && !fields) issues.push({ field: "fields", code: "required" });
  if (issues.length) return { value: null, issues };
  return { value: { expectedVersion: Number(expectedVersion), action: action as MutationAction, fields: fields ?? undefined, reason: reason ?? undefined }, issues: [] };
}

export function validateEditableFields(input: unknown): ValidationResult<EditableRecognitionFields> {
  const result = validateEditablePatch(input);
  if (result.issues.length || !result.value || Object.keys(result.value).length !== 4) return { value: null, issues: result.issues.length ? result.issues : [{ field: "fields", code: "required" }] };
  return { value: result.value as EditableRecognitionFields, issues: [] };
}

export function validateEditablePatch(input: unknown): ValidationResult<Partial<EditableRecognitionFields>> {
  if (!input || typeof input !== "object") return { value: null, issues: [{ field: "fields", code: "invalid" }] };
  const body = input as Record<string, unknown>;
  const submittedName = body.submittedName === undefined ? undefined : cleanString(body.submittedName);
  const recipient = body.recipient === undefined ? undefined : cleanString(body.recipient);
  const message = body.message === undefined ? undefined : cleanString(body.message);
  const rawIds = body.expressionIds;
  const expressionIds = rawIds === undefined ? undefined : Array.isArray(rawIds) && rawIds.every((id) => Number.isInteger(id)) ? [...new Set(rawIds as number[])].sort((a, b) => a - b) : null;
  const issues: ValidationIssue[] = [];
  if (submittedName === null || (submittedName !== undefined && !hasVisibleNameContent(submittedName))) issues.push({ field: "submittedName", code: "required" });
  else if (submittedName !== undefined && countGraphemes(submittedName) > MAX_NAME_GRAPHEMES) issues.push({ field: "submittedName", code: "too_long" });
  if (recipient === null || (recipient !== undefined && !hasVisibleNameContent(recipient))) issues.push({ field: "recipient", code: "required" });
  else if (recipient !== undefined && countGraphemes(recipient) > MAX_NAME_GRAPHEMES) issues.push({ field: "recipient", code: "too_long" });
  if (message === null || message === "") issues.push({ field: "message", code: "required" });
  else if (message !== undefined && graphemeLength(message) > 500) issues.push({ field: "message", code: "too_long" });
  if (expressionIds !== undefined && (!expressionIds || expressionIds.length < 1 || expressionIds.length > 9 || expressionIds.some((id) => id < 1 || id > 9))) issues.push({ field: "expressionIds", code: "invalid" });
  if (submittedName === undefined && recipient === undefined && message === undefined && expressionIds === undefined) issues.push({ field: "fields", code: "required" });
  const encoded = new TextEncoder().encode(JSON.stringify(body)).byteLength;
  if (encoded > 16 * 1024) issues.push({ field: "fields", code: "too_large" });
  if (issues.length) return { value: null, issues };
  return { value: { ...(submittedName !== undefined ? { submittedName: submittedName! } : {}), ...(recipient !== undefined ? { recipient: recipient! } : {}), ...(message !== undefined ? { message: message! } : {}), ...(expressionIds !== undefined ? { expressionIds: expressionIds! } : {}) }, issues: [] };
}

export function validateReportQuery(period: string | null, from: string | null, to: string | null): { period: "week" | "month" | "all" | "custom"; from?: string; to?: string } | null {
  if (period !== "week" && period !== "month" && period !== "all" && period !== "custom") return null;
  if (period !== "custom") return { period };
  if (!from || !to || !isIsoDate(from) || !isIsoDate(to) || !isMonthBoundary(from) || !isMonthBoundary(to) || from > to) return null;
  return { period, from, to };
}

export type AdminListSort = "oldest" | "newest";

export function validateAdminListQuery(status: string | null, expression: string | null, from: string | null, to: string | null, sort: string | null = null): { status: string | null; expression: number | null; from: string | null; to: string | null; sort: AdminListSort } | null {
  const normalizedStatus = status?.trim() || null;
  if (normalizedStatus && !["held", "published", "hidden", "invalid"].includes(normalizedStatus)) return null;
  const normalizedSort = sort?.trim() || "newest";
  if (normalizedSort !== "oldest" && normalizedSort !== "newest") return null;
  const normalizedExpression = expression?.trim() || null;
  const expressionNumber = normalizedExpression === null ? null : Number(normalizedExpression);
  if (expressionNumber !== null && (!Number.isInteger(expressionNumber) || expressionNumber < 1 || expressionNumber > 9)) return null;
  const normalizedFrom = from?.trim() || null;
  const normalizedTo = to?.trim() || null;
  if ((normalizedFrom && !isIsoDate(normalizedFrom)) || (normalizedTo && !isIsoDate(normalizedTo))) return null;
  if (normalizedFrom && normalizedTo && normalizedFrom > normalizedTo) return null;
  return { status: normalizedStatus, expression: expressionNumber, from: normalizedFrom, to: normalizedTo, sort: normalizedSort };
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function validDuration(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= MIN_DURATION_SECONDS && value <= MAX_DURATION_SECONDS;
}

function validGardenAmount(value: unknown): value is DisplayGardenAmount {
  return value === "all-active" || (typeof value === "number" && Number.isSafeInteger(value) && value > 0);
}

function validOfficialUrls(value: unknown): boolean {
  if (!isPlainRecord(value)) return false;
  const keys = Object.keys(value);
  return keys.length === 2
    && keys.every((key) => key === "dailyPractice" || key === "peacePromise")
    && value.dailyPractice === DISPLAY_EXTERNAL_URLS.dailyPractice
    && value.peacePromise === DISPLAY_EXTERNAL_URLS.peacePromise;
}

function normalizePlaylistEntry(value: unknown): DisplayPlaylistEntry | null {
  if (typeof value === "string") {
    return DISPLAY_SCREEN_ID_SET.has(value) ? { id: value as DisplayPlaylistEntry["id"], enabled: true } : null;
  }
  if (!isPlainRecord(value)) return null;
  const keys = Object.keys(value);
  if (keys.some((key) => !DISPLAY_PLAYLIST_KEYS.has(key))) return null;
  const rawId = value.id ?? value.screenId ?? value.screen;
  if (typeof rawId !== "string" || !DISPLAY_SCREEN_ID_SET.has(rawId)) return null;
  if (typeof value.enabled !== "boolean") return null;
  if (value.durationSeconds !== undefined && value.durationSeconds !== null && !validDuration(value.durationSeconds)) return null;
  return {
    id: rawId as DisplayPlaylistEntry["id"],
    enabled: value.enabled,
    ...(value.durationSeconds === undefined || value.durationSeconds === null ? {} : { durationSeconds: value.durationSeconds }),
  };
}

function normalizePlaylist(value: unknown): DisplayPlaylistEntry[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > DISPLAY_SCREEN_IDS.length) return null;
  const result: DisplayPlaylistEntry[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    const entry = normalizePlaylistEntry(item);
    if (!entry || seen.has(entry.id)) return null;
    seen.add(entry.id);
    result.push(entry);
  }
  if (!result.some((entry) => entry.enabled)) return null;
  return result;
}

function normalizeDurationOverrides(value: unknown): Partial<Record<DisplayPlaylistEntry["id"], number>> | null {
  if (!isPlainRecord(value)) return null;
  const result: Partial<Record<DisplayPlaylistEntry["id"], number>> = {};
  for (const key of Object.keys(value)) {
    if (!DISPLAY_SCREEN_ID_SET.has(key)) return null;
    const duration = value[key];
    if (duration === null) continue;
    if (!validDuration(duration)) return null;
    result[key as DisplayPlaylistEntry["id"]] = duration;
  }
  return result;
}

function normalizeEffects(value: unknown): DisplayEffects | null {
  if (!isPlainRecord(value)) return null;
  if (Object.keys(value).some((key) => !DISPLAY_EFFECT_KEYS.has(key))) return null;
  const result: Partial<DisplayEffects> = {};
  for (const key of DISPLAY_EFFECT_KEYS) {
    if (value[key] !== undefined && typeof value[key] !== "boolean") return null;
    if (value[key] !== undefined) result[key as keyof DisplayEffects] = value[key] as never;
  }
  if (Object.keys(result).length === 0) return null;
  return result as DisplayEffects;
}

function normalizeSound(value: unknown): DisplaySound | null {
  if (!isPlainRecord(value)) return null;
  if (Object.keys(value).some((key) => !DISPLAY_SOUND_KEYS.has(key))) return null;
  const enabled = value.enabled;
  const volume = value.volume;
  const arrivalChime = value.arrivalChime ?? value.arrivalChimes ?? value.arrivalChimeEnabled;
  const milestoneChime = value.milestoneChime ?? value.milestoneChimes ?? value.milestoneChimeEnabled;
  if (typeof enabled !== "boolean" || typeof volume !== "number" || !Number.isFinite(volume) || volume < 0 || volume > MAX_SOUND_VOLUME) return null;
  if (typeof arrivalChime !== "boolean" || typeof milestoneChime !== "boolean") return null;
  return { enabled, volume, arrivalChime, milestoneChime };
}

/**
 * Validates and copies display settings changes into a prototype-safe shape.
 * The copy prevents a JSON object with a special prototype key from reaching
 * a database bridge or a later object merge.
 */
export function normalizeSettingsChanges(input: unknown): Record<string, unknown> | null {
  if (!isPlainRecord(input)) return null;
  const keys = Object.keys(input);
  if (!keys.length || keys.some((key) => !DISPLAY_SETTINGS_KEYS.has(key))) return null;
  const result: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
  for (const key of keys) {
    const value = input[key];
    if (key === "mode" && (value !== "normal" && value !== "quiet" && value !== "neutral")) return null;
    if (key === "motion" && (value !== "calm" && value !== "standard" && value !== "lively" && value !== "still")) return null;
    if (["pauseArrivals", "pauseRotation", "collectionOpen", "showTrails", "showConstellations", "soundEnabled", "arrivalChime", "milestoneChime"].includes(key) && typeof value !== "boolean") return null;
    if (key === "lowActivityMinutes" && (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1 || value > 180)) return null;
    if (key === "readingSeconds" && (typeof value !== "number" || !Number.isSafeInteger(value) || value < 8 || value > 60)) return null;
    if (key === "maxBubbles" && (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1 || value > 6)) return null;
    if (key === "gardenAmount" && !validGardenAmount(value)) return null;
    if (key === "tempo" && (typeof value !== "string" || !DISPLAY_TEMPOS.has(value))) return null;
    if (key === "playlist") {
      const playlist = normalizePlaylist(value);
      if (!playlist) return null;
      result.playlist = playlist;
      continue;
    }
    if (key === "durationOverrides") {
      const overrides = normalizeDurationOverrides(value);
      if (!overrides) return null;
      result.durationOverrides = overrides;
      continue;
    }
    if (key === "effects") {
      const effects = normalizeEffects(value);
      if (!effects) return null;
      result.effects = effects;
      continue;
    }
    if (key === "sound") {
      const sound = normalizeSound(value);
      if (!sound) return null;
      result.sound = sound;
      continue;
    }
    if (key === "soundVolume" && (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > MAX_SOUND_VOLUME)) return null;
    if (key === "externalUrls" && !validOfficialUrls(value)) return null;
    result[key] = value;
  }
  return result;
}

export function validateSettingsChanges(input: unknown): input is Record<string, unknown> {
  return normalizeSettingsChanges(input) !== null;
}

export function validReason(value: unknown): value is string {
  return typeof value === "string" && REASONS.has(value);
}

export function validRequestKey(value: string): boolean {
  return REQUEST_KEY_RE.test(value);
}
