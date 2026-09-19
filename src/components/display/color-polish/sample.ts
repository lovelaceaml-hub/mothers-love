import {
  COLOR_POLISH_DURATIONS,
  COLOR_POLISH_REQUIRED_SCENES,
  COLOR_POLISH_SCENES,
  COLOR_POLISH_VERSION,
  type ColorPolishScene,
  type ColorPolishSnapshot,
} from '@/lib/color-polish/contracts';
import {
  DEFAULT_DISPLAY_EFFECTS,
  DEFAULT_DISPLAY_SOUND,
  DISPLAY_EXTERNAL_URLS,
  type Aggregate,
  type DisplaySettings,
  type DisplayScreenId,
} from '@/lib/contracts';
import { SAMPLE_GOAL, SAMPLE_RECORDS, SAMPLE_TOTALS } from './sample-fixture';

const SAMPLE_NOW = Date.parse('2026-09-09T10:24:00-07:00');
const SAMPLE_ZONE = 'America/Los_Angeles';
const SAMPLE_SUBMISSION_URL = 'https://mothers-love.vercel.app/recognize';

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function isoDay(value: number): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: SAMPLE_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
}

function aggregate(
  periodStart: string,
  periodEnd: string,
  recognitions: number,
  expressionCounts: readonly number[],
): Aggregate {
  const counts = Array.from({ length: 9 }, (_, index) => expressionCounts[index] ?? 0);
  return {
    periodStart,
    periodEnd,
    recognitions,
    expressionCounts: counts,
    expressionTotal: sum(counts),
    revision: 1,
  };
}

function dailyAggregates(): Aggregate[] {
  const grouped = new Map<string, { recognitions: number; expressionCounts: number[] }>();
  for (const record of SAMPLE_RECORDS) {
    const day = isoDay(record.createdAt);
    const current = grouped.get(day) ?? { recognitions: 0, expressionCounts: Array(9).fill(0) };
    current.recognitions += 1;
    for (const expressionId of record.ids) current.expressionCounts[expressionId - 1] += 1;
    grouped.set(day, current);
  }
  return [...grouped.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([day, value]) => {
    return aggregate(day, day, value.recognitions, value.expressionCounts);
  });
}

function sampleSettings(): DisplaySettings {
  return {
    version: 8,
    mode: 'normal',
    motion: 'standard',
    pauseArrivals: false,
    pauseRotation: false,
    collectionOpen: true,
    lowActivityMinutes: 20,
    readingSeconds: 20,
    maxBubbles: 6,
    gardenAmount: 'all-active',
    // The legacy display settings only know ten screens; live-feed has no legacy counterpart.
    playlist: COLOR_POLISH_REQUIRED_SCENES.map((id) => ({ id: toDisplayScreenId(id), enabled: true, durationSeconds: Math.min(120, COLOR_POLISH_DURATIONS[id]) })),
    tempo: 'standard',
    durationOverrides: {},
    effects: { ...DEFAULT_DISPLAY_EFFECTS },
    sound: { ...DEFAULT_DISPLAY_SOUND, enabled: false },
    externalUrls: DISPLAY_EXTERNAL_URLS,
    showTrails: true,
    showConstellations: true,
  };
}

function toDisplayScreenId(scene: (typeof COLOR_POLISH_REQUIRED_SCENES)[number]): DisplayScreenId {
  const mapping: Record<(typeof COLOR_POLISH_REQUIRED_SCENES)[number], DisplayScreenId> = {
    welcome: 'garden',
    garden: 'featured',
    featured: 'impact',
    calendar: 'expressions',
    peacemakers: 'shared-expression',
    status: 'spotlight',
    expressions: 'daily-practice',
    'peace-in-practice': 'one-kind-word',
    orbit: 'everyday-peace',
    milestone: 'peace-promise',
  };
  return mapping[scene];
}

function sampleRecord(record: (typeof SAMPLE_RECORDS)[number]) {
  return {
    id: record.id,
    recipient: record.name,
    message: record.message,
    expressionIds: [...record.ids],
    createdAt: new Date(record.createdAt).toISOString(),
    firstPublishedAt: new Date(record.publishedAt).toISOString(),
    expiresAt: new Date(record.expiresAt).toISOString(),
    version: 1,
    status: 'published' as const,
    featured: false,
  };
}

function sampleAggregate(period: 'today' | 'month' | 'week' | 'all'): Aggregate {
  const value = SAMPLE_TOTALS[period];
  const periodStart = period === 'month'
    ? '2026-09-01'
    : period === 'week'
      ? '2026-09-06'
      : period === 'today'
        ? '2026-09-09'
        : '2026-01-01';
  const periodEnd = period === 'month'
    ? '2026-09-30'
    : period === 'week'
      ? '2026-09-12'
      : period === 'today'
        ? '2026-09-09'
        : '2026-09-30';
  return aggregate(periodStart, periodEnd, value.rec, value.expr);
}

export function buildColorPolishSampleSnapshot(nowMs = SAMPLE_NOW): ColorPolishSnapshot {
  const serverTime = new Date(Number.isFinite(nowMs) ? nowMs : SAMPLE_NOW).toISOString();
  const month = sampleAggregate('month');
  const playlist = COLOR_POLISH_SCENES.map((id) => ({
    id,
    enabled: true,
    durationSeconds: COLOR_POLISH_DURATIONS[id],
  }));
  return {
    serverTime,
    revision: 1,
    recognitions: SAMPLE_RECORDS.map(sampleRecord),
    aggregate: month,
    settings: sampleSettings(),
    submissionUrl: SAMPLE_SUBMISSION_URL,
    cursor: 'sample-color-polish-v6',
    sync: 'reset',
    arrivals: [],
    presentation: {
      version: COLOR_POLISH_VERSION,
      enabled: true,
      playlist,
    },
    insights: {
      calendar: dailyAggregates(),
      currentWeek: sampleAggregate('week'),
      previousWeek: aggregate('2026-08-30', '2026-09-05', 0, Array(9).fill(0)),
      month,
      campaign: sampleAggregate('all'),
      goal: {
        weekStart: SAMPLE_GOAL.week,
        weekEnd: '2026-09-12',
        expressionId: SAMPLE_GOAL.id,
        value: SAMPLE_GOAL.value,
        target: SAMPLE_GOAL.target,
        achieved: SAMPLE_GOAL.achieved,
      },
    },
  };
}
