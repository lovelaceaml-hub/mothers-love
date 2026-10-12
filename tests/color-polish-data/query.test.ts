import { beforeEach, describe, expect, it, vi } from "vitest";

const { postgres, getServerConfig } = vi.hoisted(() => ({
  postgres: vi.fn(),
  getServerConfig: vi.fn(),
}));

vi.mock("postgres", () => ({ default: postgres }));
vi.mock("@/lib/server/env", () => ({ getServerConfig }));

const config = {
  databaseUrl: "postgresql://mothers_love_runtime@example.test:6543/postgres",
  databaseSsl: { ca: "synthetic-ca", rejectUnauthorized: true as const },
};

function successfulClient(result: unknown) {
  const transaction = vi.fn((strings: TemplateStringsArray) => {
    if (strings.join("?").includes("set local statement_timeout")) return Promise.resolve([]);
    if (strings.join("?").includes("set transaction isolation level")) return Promise.resolve([]);
    return Promise.resolve([{ result }]);
  });
  const begin = vi.fn(async (_options: string, callback: (sql: typeof transaction) => Promise<unknown>) => callback(transaction));
  return { begin, end: vi.fn().mockResolvedValue(undefined), transaction };
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  getServerConfig.mockReturnValue(config);
});

describe("Color Polish snapshot query", () => {
  it("uses a bounded read-write repeatable-read transaction for the versioned bridge", async () => {
    const client = successfulClient({ ok: true, source: "color-polish" });
    postgres.mockReturnValue(client);
    const { queryColorPolishSnapshot } = await import("@/lib/server/color-polish");

    await expect(queryColorPolishSnapshot("11.1789061600")).resolves.toEqual({
      data: { ok: true, source: "color-polish" },
      etag: null,
      error: null,
    });
    expect(client.begin).toHaveBeenCalledWith("read write", expect.any(Function));
    const statements = client.transaction.mock.calls.map(([strings]) => strings.join("?"));
    expect(statements.slice(0, 2)).toEqual([
      "set local statement_timeout = '5000ms'",
      "set transaction isolation level repeatable read",
    ]);
    expect(statements[2]).toContain("public.ml_color_polish_snapshot(?)");
    expect(statements[2].match(/public\.ml_color_polish_snapshot\(/g)).toHaveLength(1);
    expect(statements[2]).toContain("value - 'serverTime' - 'cursor'");
    expect(statements[2]).toContain("jsonb_build_object('unchanged', true");
    expect(statements[2]).toContain("then jsonb_build_object");
    expect(statements[2]).toContain("interval '8 hours'");
  });

  it("fails before opening a client when the request is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const { queryColorPolishSnapshot } = await import("@/lib/server/color-polish");

    await expect(queryColorPolishSnapshot(null, controller.signal)).resolves.toMatchObject({ data: null, error: { message: "REQUEST_ABORTED" } });
    expect(postgres).not.toHaveBeenCalled();
  });

  it("queries the opt-in cache bridge with bounded record tokens in the same transaction", async () => {
    const client = successfulClient({ ok: true, unchanged: true });
    postgres.mockReturnValue(client);
    const { queryColorPolishSnapshot } = await import("@/lib/server/color-polish");
    await queryColorPolishSnapshot("synthetic-cache-cursor", undefined, ["a".repeat(32)]);
    expect(client.transaction.mock.calls.map(([strings]) => strings.join("?")).at(-1))
      .toBe("select public.ml_color_polish_delta(?, ?::text::jsonb) as result");
    expect(client.transaction.mock.calls.at(-1)?.slice(1)).toEqual(["synthetic-cache-cursor", JSON.stringify(["a".repeat(32)])]);
  });
});
