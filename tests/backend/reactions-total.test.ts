import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type ConfiguredResult = ReturnType<typeof import("@/lib/server/http")["requireConfigured"]>;

const { databaseClient, getPublicDisplayClient, retirePublicDisplayClient, requireConfigured } = vi.hoisted(() => ({
  databaseClient: vi.fn(),
  getPublicDisplayClient: vi.fn(),
  retirePublicDisplayClient: vi.fn(),
  requireConfigured: vi.fn<() => ConfiguredResult>(() => null),
}));

vi.mock("@/lib/server/supabase", () => ({ databaseClient }));
vi.mock("@/lib/server/public-display-client", () => ({ getPublicDisplayClient, retirePublicDisplayClient }));
vi.mock("@/lib/server/http", () => ({ requireConfigured }));

import { GET } from "@/app/api/display/likes-total/route";
import { projectReactionTotal, queryReactionTotal } from "@/lib/server/reactions";

function request() {
  return new NextRequest("https://mothers-love.example/api/display/likes-total");
}

beforeEach(() => {
  databaseClient.mockReset();
  getPublicDisplayClient.mockReset();
  retirePublicDisplayClient.mockReset();
  requireConfigured.mockReturnValue(null);
});

afterEach(() => vi.useRealTimers());

function client(rpc: (strings: TemplateStringsArray) => unknown) {
  const transaction = vi.fn((strings: TemplateStringsArray) => strings.join("?").includes("statement_timeout") ? Promise.resolve([]) : rpc(strings));
  return { begin: vi.fn(async (_options: string, callback: (sql: typeof transaction) => Promise<unknown>) => callback(transaction)), transaction };
}

describe("likes total projection", () => {
  it("keeps only the one nonnegative integer", () => {
    expect(projectReactionTotal({ ok: true, total: 250, extra: "x" })).toEqual({ ok: true, total: 250 });
    expect(projectReactionTotal({ ok: true, total: 0 })).toEqual({ ok: true, total: 0 });
  });

  it("rejects refusals and malformed totals", () => {
    expect(projectReactionTotal(null)).toBeNull();
    expect(projectReactionTotal({ ok: false, status: 503, code: "UNAVAILABLE" })).toBeNull();
    expect(projectReactionTotal({ ok: true, total: -1 })).toBeNull();
    expect(projectReactionTotal({ ok: true, total: 1.5 })).toBeNull();
    expect(projectReactionTotal({ ok: true, total: "250" })).toBeNull();
  });
});

describe("GET /api/display/likes-total", () => {
  it("calls the dedicated RPC and returns only the total", async () => {
    const rpc = vi.fn().mockResolvedValue([{ result: { ok: true, total: 250 } }]);
    const readClient = client(rpc);
    getPublicDisplayClient.mockReturnValue(readClient);

    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(await response.json()).toEqual({ ok: true, total: 250 });
    expect(String(rpc.mock.calls[0]?.[0]?.join("?"))).toContain("public.ml_reactions_total()");
    expect(readClient.begin).toHaveBeenCalledWith("read only", expect.any(Function));
    expect(String(readClient.transaction.mock.calls[0]?.[0]?.join("?"))).toContain("5000ms");
    expect(databaseClient).not.toHaveBeenCalled();
  });

  it("reports unavailable while the database function is missing or refuses", async () => {
    getPublicDisplayClient.mockReturnValue(client(vi.fn().mockRejectedValue(new Error("function public.ml_reactions_total does not exist"))));
    expect((await GET(request())).status).toBe(503);
    getPublicDisplayClient.mockReturnValue(client(vi.fn().mockResolvedValue([{ result: { ok: false, status: 503, code: "UNAVAILABLE" } }])));
    expect((await GET(request())).status).toBe(503);
  });

  it("reports unavailable without database configuration", async () => {
    getPublicDisplayClient.mockReturnValue(null);
    expect((await GET(request())).status).toBe(503);
  });

  it("bounds a stalled likes read and retires only its public read generation", async () => {
    vi.useFakeTimers();
    const stalled = { begin: vi.fn(() => new Promise<never>(() => undefined)) };
    getPublicDisplayClient.mockReturnValue(stalled);
    const pending = queryReactionTotal();
    await vi.advanceTimersByTimeAsync(8_000);
    await expect(pending).resolves.toMatchObject({ data: null, error: { message: "DATABASE_TIMEOUT" } });
    expect(retirePublicDisplayClient).toHaveBeenCalledExactlyOnceWith(stalled);
    expect(databaseClient).not.toHaveBeenCalled();
    getPublicDisplayClient.mockReturnValue(client(vi.fn().mockResolvedValue([{ result: { ok: true, total: 251 } }])));
    await expect(queryReactionTotal()).resolves.toEqual({ data: { ok: true, total: 251 }, error: null });
  });

  it("does not allocate a connection for an already cancelled request", async () => {
    await expect(queryReactionTotal(AbortSignal.abort())).resolves.toMatchObject({ data: null, error: { message: "REQUEST_ABORTED" } });
    expect(getPublicDisplayClient).not.toHaveBeenCalled();
    expect(databaseClient).not.toHaveBeenCalled();
  });
});
