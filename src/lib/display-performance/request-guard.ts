export interface RequestLease {
  generation: number;
}

export type RequestRunResult<T> =
  | { status: "busy"; generation: number }
  | { status: "fulfilled"; generation: number; value: T }
  | { status: "rejected"; generation: number; error: unknown };

export interface RequestInFlightGuard {
  readonly inFlight: boolean;
  readonly generation: number;
  begin(): RequestLease | null;
  isCurrent(lease: RequestLease): boolean;
  finish(lease: RequestLease): void;
  invalidate(): void;
  run<T>(task: (lease: RequestLease) => Promise<T> | T): Promise<RequestRunResult<T>>;
}

export function createRequestInFlightGuard(): RequestInFlightGuard {
  let active = false;
  let generation = 0;
  let activeGeneration: number | null = null;

  const begin = (): RequestLease | null => {
    if (active) return null;
    active = true;
    generation += 1;
    activeGeneration = generation;
    return { generation };
  };

  // A completed result remains current until a newer request or invalidation
  // advances the generation. This lets callers accept a result after run()
  // releases the in-flight slot.
  const isCurrent = (lease: RequestLease): boolean => lease.generation === generation;

  const finish = (lease: RequestLease): void => {
    if (active && lease.generation === activeGeneration) {
      active = false;
      activeGeneration = null;
    }
  };

  const invalidate = (): void => {
    generation += 1;
  };

  const run = async <T>(task: (lease: RequestLease) => Promise<T> | T): Promise<RequestRunResult<T>> => {
    const lease = begin();
    if (!lease) return { status: "busy", generation };
    try {
      return { status: "fulfilled", generation: lease.generation, value: await task(lease) };
    } catch (error) {
      return { status: "rejected", generation: lease.generation, error };
    } finally {
      finish(lease);
    }
  };

  return {
    get inFlight() {
      return active;
    },
    get generation() {
      return generation;
    },
    begin,
    isCurrent,
    finish,
    invalidate,
    run,
  };
}

export const createInFlightGuard = createRequestInFlightGuard;
