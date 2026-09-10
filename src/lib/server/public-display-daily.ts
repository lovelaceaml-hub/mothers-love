import { getPublicDisplayClient, retirePublicDisplayClient } from './public-display-client';

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
  if (signal?.aborted) return { data: null, error: new Error('REQUEST_ABORTED') };
  const client = getPublicDisplayClient();
  if (!client) return { data: null, error: new Error('UNAVAILABLE') };

  let deadlineTimer: ReturnType<typeof setTimeout> | undefined;
  const operation = Promise.resolve().then(() => client.begin('read only', async (transaction) => {
    if (signal?.aborted) throw new Error('REQUEST_ABORTED');
    await transaction`set local statement_timeout = '5000ms'`;
    if (signal?.aborted) throw new Error('REQUEST_ABORTED');
    const rows = await transaction`select public.ml_public_display_daily_aggregates() as result`;
    return rows[0]?.result ?? null;
  }));
  void operation.then(() => undefined, () => undefined);

  const deadline = new Promise<never>((_, reject) => {
    deadlineTimer = setTimeout(() => {
      retirePublicDisplayClient(client);
      reject(new Error('DATABASE_TIMEOUT'));
    }, OPERATION_DEADLINE_MS);
  });

  try {
    const raw = await Promise.race([operation, deadline]);
    const data = projectPublicDisplayDailyAggregates(raw);
    return data ? { data, error: null } : { data: null, error: new Error('INVALID_DAILY_AGGREGATES') };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error : new Error('DATABASE_ERROR') };
  } finally {
    if (deadlineTimer !== undefined) clearTimeout(deadlineTimer);
  }
}
