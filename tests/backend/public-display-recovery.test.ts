import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { postgres, getServerConfig } = vi.hoisted(() => ({
  postgres: vi.fn(),
  getServerConfig: vi.fn(),
}));

vi.mock("postgres", () => ({ default: postgres }));
vi.mock("@/lib/server/env", () => ({ getServerConfig }));

const config = {
  url: "https://mothers-love.example",
  databaseUrl: "postgresql://mothers_love_runtime@example.test:6543/postgres",
  databaseSsl: { ca: "synthetic-ca", rejectUnauthorized: true as const },
  publishableKey: "synthetic-publishable-key",
  appUrl: "https://mothers-love.example",
};

function successfulClient(result: unknown) {
  const transaction = vi.fn((strings: TemplateStringsArray) => {
    if (strings.join("?").includes("set local statement_timeout")) return Promise.resolve([]);
    return Promise.resolve([{ result }]);
  });
  const begin = vi.fn(async (_options: string, callback: (sql: typeof transaction) => Promise<unknown>) => callback(transaction));
  return { begin, end: vi.fn().mockResolvedValue(undefined), transaction };
}

async function loadModules() {
  vi.resetModules();
  const [clientModule, displayModule] = await Promise.all([
    import("@/lib/server/public-display-client"),
    import("@/lib/server/public-display"),
  ]);
  return { ...clientModule, queryPublicDisplaySnapshot: displayModule.queryPublicDisplaySnapshot };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  getServerConfig.mockReturnValue(config);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("public display client recovery", () => {
  it("caches one strict TLS max-one TV generation and reuses the server config accessor", async () => {
    const client = successfulClient({ ok: true });
    postgres.mockReturnValue(client);
    const { getPublicDisplayClient } = await loadModules();

    expect(getPublicDisplayClient()).toBe(client);
    expect(getPublicDisplayClient()).toBe(client);
    expect(getServerConfig).toHaveBeenCalledTimes(1);
    expect(postgres).toHaveBeenCalledWith(config.databaseUrl, {
      max: 1,
      prepare: false,
      fetch_types: false,
      idle_timeout: 20,
      connect_timeout: 10,
      ssl: config.databaseSsl,
    });
  });

  it("settles a never-ending begin at the wall deadline, retires the pool, and recovers on a new generation", async () => {
    const first = {
      begin: vi.fn(() => new Promise<never>(() => undefined)),
      end: vi.fn().mockResolvedValue(undefined),
    };
    const second = successfulClient({ ok: true, generation: 2 });
    postgres.mockReturnValueOnce(first).mockReturnValueOnce(second);
    const { queryPublicDisplaySnapshot } = await loadModules();

    const timedOut = queryPublicDisplaySnapshot(null);
    await vi.advanceTimersByTimeAsync(8_000);
    await expect(timedOut).resolves.toMatchObject({ data: null, error: { message: "DATABASE_TIMEOUT" } });
    expect(first.end).toHaveBeenCalledTimes(1);
    expect(first.end).toHaveBeenCalledWith({ timeout: 0 });

    await expect(queryPublicDisplaySnapshot(null)).resolves.toEqual({ data: { ok: true, generation: 2 }, error: null });
    expect(postgres).toHaveBeenCalledTimes(2);
  });

  it("tears down one concurrent generation once and cannot retire its replacement", async () => {
    const first = {
      begin: vi.fn(() => new Promise<never>(() => undefined)),
      end: vi.fn().mockResolvedValue(undefined),
    };
    const second = successfulClient({ ok: true, generation: 2 });
    postgres.mockReturnValueOnce(first).mockReturnValueOnce(second);
    const { getPublicDisplayClient, retirePublicDisplayClient, queryPublicDisplaySnapshot } = await loadModules();

    const firstRead = queryPublicDisplaySnapshot(null);
    const secondRead = queryPublicDisplaySnapshot("12.1");
    await vi.advanceTimersByTimeAsync(8_000);
    await expect(Promise.all([firstRead, secondRead])).resolves.toEqual([
      { data: null, error: expect.objectContaining({ message: "DATABASE_TIMEOUT" }) },
      { data: null, error: expect.objectContaining({ message: "DATABASE_TIMEOUT" }) },
    ]);
    expect(first.end).toHaveBeenCalledTimes(1);

    const replacement = getPublicDisplayClient();
    expect(replacement).toBe(second);
    retirePublicDisplayClient(first as never);
    expect(second.end).not.toHaveBeenCalled();
  });

  it("clears the wall timer on both successful and failed operations", async () => {
    const successful = successfulClient({ ok: true });
    const failed = { begin: vi.fn().mockRejectedValue(new Error("synthetic failure")), end: vi.fn() };
    postgres.mockReturnValueOnce(successful).mockReturnValueOnce(failed);
    const { queryPublicDisplaySnapshot, retirePublicDisplayClient } = await loadModules();

    await expect(queryPublicDisplaySnapshot(null)).resolves.toEqual({ data: { ok: true }, error: null });
    expect(vi.getTimerCount()).toBe(0);
    retirePublicDisplayClient(successful as never);
    await expect(queryPublicDisplaySnapshot(null)).resolves.toMatchObject({ data: null, error: { message: "synthetic failure" } });
    expect(vi.getTimerCount()).toBe(0);
    expect(failed.end).not.toHaveBeenCalled();
  });
});
