import {
  COLOR_POLISH_SCENES,
  COLOR_POLISH_VERSION,
  type ColorPolishPresentation,
  type ColorPolishSnapshot,
} from './contracts';
import {
  DISPLAY_EXTERNAL_URLS,
  type Aggregate,
  type DisplaySettings,
  type Recognition,
} from '@/lib/contracts';

const SUBMISSION_URL = 'https://mothers-love.vercel.app/recognize';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_RECOGNITIONS = 1_000;
const MAX_DAYS = 31;

function record(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function exact(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && actual.every((key) => keys.includes(key));
}

function only(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).every((key) => keys.includes(key));
}

function integer(value: unknown, minimum = 0): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum;
}

function dateText(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 64) return false;
  return Number.isFinite(Date.parse(value));
}

function isoDay(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = Date.parse(`${value}T12:00:00.000Z`);
  return Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 10) === value;
}

function laDay(timestamp: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(timestamp));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function addDays(day: string, amount: number): string {
  const value = new Date(`${day}T12:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

function weekStart(day: string): string {
  const value = new Date(`${day}T12:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() - value.getUTCDay());
  return value.toISOString().slice(0, 10);
}

function aggregate(value: unknown): Aggregate | null {
  if (!record(value) || !exact(value, ['periodStart', 'periodEnd', 'recognitions', 'expressionCounts', 'expressionTotal', 'revision'])) return null;
  if (!isoDay(value.periodStart) || !isoDay(value.periodEnd) || value.periodEnd < value.periodStart) return null;
  if (!integer(value.recognitions) || !Array.isArray(value.expressionCounts) || value.expressionCounts.length !== 9 || !value.expressionCounts.every((item) => integer(item)) || !integer(value.expressionTotal) || !integer(value.revision)) return null;
  const expressionTotal = value.expressionCounts.reduce((sum, item) => sum + item, 0);
  if (expressionTotal !== value.expressionTotal) return null;
  return { periodStart: value.periodStart, periodEnd: value.periodEnd, recognitions: value.recognitions, expressionCounts: [...value.expressionCounts], expressionTotal: value.expressionTotal, revision: value.revision };
}

function settings(value: unknown): DisplaySettings | null {
  if (!record(value)) return null;
  if (value.mode !== 'normal' && value.mode !== 'quiet' && value.mode !== 'neutral') return null;
  if (value.motion !== 'calm' && value.motion !== 'standard' && value.motion !== 'lively' && value.motion !== 'still') return null;
  if (!integer(value.version, 1) || typeof value.pauseArrivals !== 'boolean' || typeof value.pauseRotation !== 'boolean' || typeof value.collectionOpen !== 'boolean' || !integer(value.lowActivityMinutes, 1) || value.lowActivityMinutes > 180 || !integer(value.readingSeconds, 8) || value.readingSeconds > 60 || typeof value.showTrails !== 'boolean' || typeof value.showConstellations !== 'boolean') return null;
  if (value.maxBubbles !== undefined && !integer(value.maxBubbles, 1)) return null;
  if (value.gardenAmount !== undefined && value.gardenAmount !== 'all-active' && !integer(value.gardenAmount, 1)) return null;
  if (value.tempo !== undefined && !['slow', 'standard', 'fast', 'calm', 'gentle', 'lively'].includes(String(value.tempo))) return null;
  if (value.externalUrls !== undefined && (!record(value.externalUrls) || value.externalUrls.dailyPractice !== DISPLAY_EXTERNAL_URLS.dailyPractice || value.externalUrls.peacePromise !== DISPLAY_EXTERNAL_URLS.peacePromise)) return null;
  return value as unknown as DisplaySettings;
}

function recognition(value: unknown, serverTime: string): Recognition | null {
  if (!record(value) || !only(value, ['id', 'recipient', 'message', 'expressionIds', 'createdAt', 'firstPublishedAt', 'expiresAt', 'version', 'status', 'featured'])) return null;
  if (typeof value.id !== 'string' || !UUID_PATTERN.test(value.id) || typeof value.recipient !== 'string' || value.recipient.trim().length === 0 || typeof value.message !== 'string' || value.message.length === 0 || !Array.isArray(value.expressionIds) || value.expressionIds.length < 1 || value.expressionIds.length > 9 || !value.expressionIds.every((id) => integer(id, 1) && id <= 9) || value.expressionIds.some((id, index, ids) => index > 0 && id <= ids[index - 1])) return null;
  if (!dateText(value.createdAt) || !dateText(value.firstPublishedAt) || !dateText(value.expiresAt) || Date.parse(value.createdAt) > Date.parse(serverTime) || Date.parse(value.firstPublishedAt) > Date.parse(serverTime) || Date.parse(value.firstPublishedAt) < Date.parse(value.createdAt) || Date.parse(value.expiresAt) <= Date.parse(value.firstPublishedAt) || !integer(value.version, 1) || value.status !== 'published' || typeof value.featured !== 'boolean') return null;
  return { id: value.id, recipient: value.recipient, message: value.message, expressionIds: [...value.expressionIds], createdAt: value.createdAt, firstPublishedAt: value.firstPublishedAt, expiresAt: value.expiresAt, version: value.version, status: 'published', featured: value.featured };
}

function presentation(value: unknown): ColorPolishPresentation | null {
  if (!record(value) || !exact(value, ['version', 'enabled', 'playlist']) || value.version !== COLOR_POLISH_VERSION || typeof value.enabled !== 'boolean' || !Array.isArray(value.playlist) || value.playlist.length !== COLOR_POLISH_SCENES.length) return null;
  const seen = new Set<string>();
  const playlist = value.playlist.map((entry) => {
    if (!record(entry) || !exact(entry, ['id', 'enabled', 'durationSeconds']) || typeof entry.id !== 'string' || !COLOR_POLISH_SCENES.includes(entry.id as never) || seen.has(entry.id) || typeof entry.enabled !== 'boolean' || !integer(entry.durationSeconds, 12) || entry.durationSeconds > 180) return null;
    seen.add(entry.id);
    return { id: entry.id, enabled: entry.enabled, durationSeconds: entry.durationSeconds } as ColorPolishPresentation['playlist'][number];
  });
  if (playlist.some((entry) => entry === null) || seen.size !== COLOR_POLISH_SCENES.length || !playlist.some((entry) => entry?.enabled)) return null;
  return { version: COLOR_POLISH_VERSION, enabled: value.enabled, playlist: playlist as ColorPolishPresentation['playlist'] };
}

function insightAggregate(value: unknown, start: string, end: string): Aggregate | null {
  const result = aggregate(value);
  return result && result.periodStart === start && result.periodEnd === end ? result : null;
}

export function validateColorPolishSnapshot(value: unknown): ColorPolishSnapshot | null {
  if (!record(value) || value.ok !== undefined && value.ok !== true || !dateText(value.serverTime) || !integer(value.revision, 1) || value.submissionUrl !== SUBMISSION_URL || typeof value.cursor !== 'string' || !/^\d+\.\d+$/.test(value.cursor) || (value.sync !== 'reset' && value.sync !== 'delta') || !Array.isArray(value.recognitions) || value.recognitions.length > MAX_RECOGNITIONS || !Array.isArray(value.arrivals) || value.arrivals.length > MAX_RECOGNITIONS) return null;
  const serverTime = value.serverTime as string;
  const displaySettings = settings(value.settings);
  const baseAggregate = aggregate(value.aggregate);
  const displayPresentation = presentation(value.presentation);
  if (!displaySettings || !baseAggregate || !displayPresentation) return null;
  const ids = new Set<string>();
  const recognitions = value.recognitions.map((item) => recognition(item, serverTime));
  if (recognitions.some((item) => !item) || recognitions.some((item) => { const id = item!.id.toLowerCase(); if (ids.has(id)) return true; ids.add(id); return false; })) return null;
  if (displaySettings.mode !== 'normal' && recognitions.length > 0) return null;
  const arrivalIds = new Set<string>();
  const arrivals = value.arrivals.map((item) => {
    if (!record(item)) return null;
    const eventId = item.eventId;
    const recognitionId = item.recognitionId;
    const publishedAt = item.publishedAt;
    if (typeof eventId !== 'string' || !/^\d+$/.test(eventId) || typeof recognitionId !== 'string' || !UUID_PATTERN.test(recognitionId) || !ids.has(recognitionId.toLowerCase()) || !dateText(publishedAt) || Date.parse(publishedAt) > Date.parse(serverTime) || arrivalIds.has(eventId)) return null;
    arrivalIds.add(eventId);
    return { eventId, recognitionId, publishedAt };
  });
  if (arrivals.some((item) => !item) || displaySettings.mode !== 'normal' && arrivals.length > 0) return null;

  const day = laDay(value.serverTime);
  const start = weekStart(day);
  const monthStart = `${day.slice(0, 7)}-01`;
  const insightValue = value.insights;
  if (!record(insightValue) || !exact(insightValue, ['calendar', 'currentWeek', 'previousWeek', 'month', 'campaign', 'goal']) || !Array.isArray(insightValue.calendar) || insightValue.calendar.length > MAX_DAYS || insightValue.calendar.some((item) => !aggregate(item) || (item as Aggregate).periodStart !== (item as Aggregate).periodEnd || (item as Aggregate).periodStart < monthStart || (item as Aggregate).periodEnd > day)) return null;
  const currentWeek = insightAggregate(insightValue.currentWeek, start, day);
  const previousWeek = insightAggregate(insightValue.previousWeek, addDays(start, -7), addDays(start, -1));
  const month = insightAggregate(insightValue.month, monthStart, day);
  const campaign = aggregate(insightValue.campaign);
  const goal = insightValue.goal;
  const expressionId = record(goal) ? goal.expressionId : null;
  if (!currentWeek || !previousWeek || !month || !campaign || campaign.periodEnd !== day || !record(goal) || !exact(goal, ['weekStart', 'weekEnd', 'expressionId', 'value', 'target', 'achieved']) || goal.weekStart !== start || goal.weekEnd !== addDays(start, 6) || !integer(expressionId, 1) || expressionId > 9 || !integer(goal.value) || !integer(goal.target, 1) || typeof goal.achieved !== 'boolean') return null;
  const others = currentWeek.expressionCounts.filter((_, index) => index !== expressionId - 1).sort((left, right) => right - left);
  const target = Math.max(1, (others[3] ?? 0) + 1);
  if (goal.value !== currentWeek.expressionCounts[expressionId - 1] || goal.target !== target || goal.achieved !== goal.value >= goal.target || baseAggregate.periodStart !== month.periodStart || baseAggregate.periodEnd !== month.periodEnd || baseAggregate.recognitions !== month.recognitions || baseAggregate.expressionTotal !== month.expressionTotal || baseAggregate.revision !== month.revision || baseAggregate.expressionCounts.some((count, index) => count !== month.expressionCounts[index])) return null;
  return { serverTime, revision: value.revision, recognitions: recognitions as Recognition[], aggregate: baseAggregate, settings: displaySettings, submissionUrl: value.submissionUrl, cursor: value.cursor, sync: value.sync, arrivals: arrivals as ColorPolishSnapshot['arrivals'], presentation: displayPresentation, insights: { calendar: insightValue.calendar as Aggregate[], currentWeek, previousWeek, month, campaign, goal: { weekStart: goal.weekStart as string, weekEnd: goal.weekEnd as string, expressionId, value: goal.value as number, target: goal.target as number, achieved: goal.achieved } } };
}

export function validateColorPolishPresentationChanges(value: unknown): ColorPolishPresentation['playlist'] | null {
  if (!record(value) || !only(value, ['playlist']) || !Array.isArray(value.playlist)) return null;
  const projected = presentation({ version: COLOR_POLISH_VERSION, enabled: true, playlist: value.playlist });
  return projected?.playlist ?? null;
}

export { SUBMISSION_URL as COLOR_POLISH_SUBMISSION_URL };
