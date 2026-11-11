import { guardedPublicDisplayRead } from './public-display-read';

export type PublicDisplayDailyAggregate = {
  date: string;
  recognitions: number;
  expressionCounts: number[];
  expressionTotal: number;
};

const OPERATION_DEADLINE_MS = 8_000;
const MAX_DAYS = 50;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(parsed);
}

export function projectPublicDisplayDailyAggregates(value: unknown): PublicDisplayDailyAggregate[] | null {
  if (!Array.isArray(value) || value.length > MAX_DAYS) return null;
  const output: PublicDisplayDailyAggregate[] = [];
  let previous = '';
  for (const raw of value) {
    if (!isRecord(raw) || !validDate(raw.date) || !isCount(raw.recognitions) || !isCount(raw.expressionTotal)) return null;
    if (!Array.isArray(raw.expressionCounts) || raw.expressionCounts.length !== 9 || !raw.expressionCounts.every(isCount)) return null;
    if (previous && raw.date <= previous) return null;
    previous = raw.date;
    output.push({
      date: raw.date,
      recognitions: raw.recognitions,
      expressionCounts: [...raw.expressionCounts],
      expressionTotal: raw.expressionTotal,
    });
  }
  return output;
}

export async function queryPublicDisplayDailyAggregates(signal?: AbortSignal): Promise<{ data: PublicDisplayDailyAggregate[] | null; error: Error | null }> {
  const read = await guardedPublicDisplayRead<unknown>({ signal, deadlineMs: OPERATION_DEADLINE_MS }, async (transaction) => {
    const rows = await transaction`select public.ml_public_display_daily_aggregates() as result`;
    return rows[0]?.result ?? null;
  });
  if (read.error) return { data: null, error: read.error };
  try {
    const data = projectPublicDisplayDailyAggregates(read.value);
    return data ? { data, error: null } : { data: null, error: new Error('INVALID_DAILY_AGGREGATES') };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error : new Error('DATABASE_ERROR') };
  }
}
