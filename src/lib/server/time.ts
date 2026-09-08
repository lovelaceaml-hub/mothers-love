const LA_TIME_ZONE = "America/Los_Angeles";
const DAY_MS = 24 * 60 * 60 * 1000;

export function graphemeLength(value: string): number {
  const Segmenter = (Intl as unknown as { Segmenter?: new (locales?: string[], options?: { granularity: string }) => { segment(value: string): Iterable<string> } }).Segmenter;
  if (Segmenter) return Array.from(new Segmenter(undefined, { granularity: "grapheme" }).segment(value)).length;
  return Array.from(value).length;
}

export function isoDateInLosAngeles(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: LA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function parseDateParts(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function dateAdd(date: string, days: number): string {
  const result = parseDateParts(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

export function startOfLosAngelesWeek(date = new Date()): string {
  const localDate = isoDateInLosAngeles(date);
  const weekday = parseDateParts(localDate).getUTCDay();
  return dateAdd(localDate, -weekday);
}

export function endOfLosAngelesWeek(date = new Date()): string {
  return dateAdd(startOfLosAngelesWeek(date), 6);
}

export function startOfLosAngelesMonth(date = new Date()): string {
  const localDate = isoDateInLosAngeles(date);
  return `${localDate.slice(0, 7)}-01`;
}

export function endOfLosAngelesMonth(date = new Date()): string {
  const start = startOfLosAngelesMonth(date);
  return dateAdd(start, new Date(Date.UTC(Number(start.slice(0, 4)), Number(start.slice(5, 7)), 0)).getUTCDate() - 1);
}

export function isMonthBoundary(value: string): boolean {
  return /^\d{4}-\d{2}-01$/.test(value);
}

export function addRetentionHours(date: Date): Date {
  return new Date(date.getTime() + 168 * 60 * 60 * 1000);
}

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = parseDateParts(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function daysBetween(start: string, end: string): number {
  return Math.round((parseDateParts(end).getTime() - parseDateParts(start).getTime()) / DAY_MS);
}

