import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type ConfiguredResult = ReturnType<typeof import("@/lib/server/http")["requireConfigured"]>;

const { databaseClient, requireConfigured } = vi.hoisted(() => ({
  databaseClient: vi.fn(),
  requireConfigured: vi.fn<() => ConfiguredResult>(() => null),
}));

vi.mock("@/lib/server/supabase", () => ({ databaseClient }));
vi.mock("@/lib/server/http", () => ({ requireConfigured }));

import { GET } from "@/app/api/display/likes-total/route";
import { projectReactionTotal } from "@/lib/server/reactions";

function request() {
  return new NextRequest("https://mothers-love.example/api/display/likes-total");
}

beforeEach(() => {
  databaseClient.mockReset();
  requireConfigured.mockReturnValue(null);
});

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
    databaseClient.mockReturnValue(rpc);

    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(await response.json()).toEqual({ ok: true, total: 250 });
    expect(String(rpc.mock.calls[0]?.[0]?.join("?"))).toContain("public.ml_reactions_total()");
  });

  it("reports unavailable while the database function is missing or refuses", async () => {
    databaseClient.mockReturnValue(vi.fn().mockRejectedValue(new Error("function public.ml_reactions_total does not exist")));
    expect((await GET(request())).status).toBe(503);
    databaseClient.mockReturnValue(vi.fn().mockResolvedValue([{ result: { ok: false, status: 503, code: "UNAVAILABLE" } }]));
    expect((await GET(request())).status).toBe(503);
  });

  it("reports unavailable without database configuration", async () => {
    databaseClient.mockReturnValue(null);
    expect((await GET(request())).status).toBe(503);
  });
});
