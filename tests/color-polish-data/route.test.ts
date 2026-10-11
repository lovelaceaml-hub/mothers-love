import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireConfigured, admitPublicDisplayRequest, queryColorPolishSnapshot, projectColorPolishSnapshot } = vi.hoisted(() => ({
  requireConfigured: vi.fn(),
  admitPublicDisplayRequest: vi.fn(),
  queryColorPolishSnapshot: vi.fn(),
  projectColorPolishSnapshot: vi.fn(),
}));

vi.mock("@/lib/server/http", () => ({ requireConfigured }));
vi.mock("@/lib/server/public-display-admission", () => ({ admitPublicDisplayRequest }));
vi.mock("@/lib/server/color-polish", () => ({ queryColorPolishSnapshot, projectColorPolishSnapshot }));

import { GET } from "@/app/api/display/color-polish/route";

const projected = {
  serverTime: "2026-09-10T18:00:00.000Z",
  revision: 12,
  recognitions: [],
  aggregate: {
    periodStart: "2026-09-01",
    periodEnd: "2026-09-10",
    recognitions: 0,
    expressionCounts: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    expressionTotal: 0,
    revision: 0,
  },
  settings: {
    version: 7,
    mode: "normal",
    motion: "standard",
    pauseArrivals: false,
    pauseRotation: false,
    collectionOpen: true,
    lowActivityMinutes: 20,
    readingSeconds: 20,
    maxBubbles: 4,
    showTrails: true,
    showConstellations: true,
  },
  submissionUrl: "https://mothers-love.vercel.app/recognize",
  cursor: "12.1789063200",
  sync: "reset",
  arrivals: [],
  presentation: { version: "color-polish-v6", enabled: false, playlist: [] },
  insights: {
    calendar: [],
    currentWeek: {},
    previousWeek: {},
    month: {},
    campaign: {},
    goal: {},
  },
};

function request(path = "/api/display/color-polish", signal?: AbortSignal) {
  return new NextRequest(`https://mothers-love.vercel.app${path}`, { signal });
}

beforeEach(() => {
  requireConfigured.mockReturnValue(null);
  admitPublicDisplayRequest.mockReturnValue({ release: vi.fn() });
  queryColorPolishSnapshot.mockReset();
  projectColorPolishSnapshot.mockReset();
  projectColorPolishSnapshot.mockReturnValue(projected);
});

describe("GET /api/display/color-polish", () => {
  it("uses the write-capable bridge, projects the result, and releases admission", async () => {
    const release = vi.fn();
    admitPublicDisplayRequest.mockReturnValue({ release });
    queryColorPolishSnapshot.mockResolvedValue({ data: { ok: true }, error: null });

    const response = await GET(request("/api/display/color-polish?after=11.1789061600"));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(await response.json()).toEqual(projected);
    expect(queryColorPolishSnapshot).toHaveBeenCalledWith("11.1789061600", expect.any(AbortSignal), null);
    expect(projectColorPolishSnapshot).toHaveBeenCalledWith({ ok: true });
    expect(release).toHaveBeenCalledTimes(1);
  });

  it("returns a compact no-store heartbeat only for a valid conditional request", async () => {
    const etag = "a".repeat(32);
    queryColorPolishSnapshot.mockResolvedValue({
      data: { unchanged: true, serverTime: "2026-09-10T18:00:05.000Z" },
      etag,
      error: null,
    });
    const response = await GET(new NextRequest("https://mothers-love.vercel.app/api/display/color-polish", {
      headers: { "If-None-Match": `"${etag}"` },
    }));
    expect(response.status).toBe(200);
    expect(response.headers.get("etag")).toBe(`"${etag}"`);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ unchanged: true, serverTime: "2026-09-10T18:00:05.000Z" });
    expect(queryColorPolishSnapshot).toHaveBeenCalledWith(null, expect.any(AbortSignal), etag);
    expect(projectColorPolishSnapshot).not.toHaveBeenCalled();
  });

  it("fails closed on unavailable configuration, transport errors, and malformed projections", async () => {
    requireConfigured.mockReturnValueOnce(NextResponse.json({ ok: false, code: "UNAVAILABLE" }, { status: 503 }));
    expect((await GET(request())).status).toBe(503);
    expect(admitPublicDisplayRequest).not.toHaveBeenCalled();

    queryColorPolishSnapshot.mockResolvedValueOnce({ data: null, error: new Error("private detail") });
    expect((await GET(request())).status).toBe(503);
    queryColorPolishSnapshot.mockResolvedValueOnce({ data: { ok: true }, error: null });
    projectColorPolishSnapshot.mockReturnValueOnce(null);
    expect((await GET(request())).status).toBe(503);
  });

  it("returns a bounded retry response when admission is full and skips aborted requests", async () => {
    admitPublicDisplayRequest.mockReturnValueOnce(null);
    const limited = await GET(request());
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toBe("5");
    expect(queryColorPolishSnapshot).not.toHaveBeenCalled();

    const controller = new AbortController();
    controller.abort();
    await GET(request("/api/display/color-polish", controller.signal));
    expect(admitPublicDisplayRequest).toHaveBeenCalledTimes(1);
  });

  it("returns an opt-in unchanged verification without records and preserves no-store", async () => {
    const cacheCursor = `v2:${"a".repeat(32)}:1789063200:12.1789063200`;
    const data = { ok: true, serverTime: projected.serverTime, cacheCursor, unchanged: true };
    queryColorPolishSnapshot.mockResolvedValue({ data, error: null });
    const response = await GET(request(`/api/display/color-polish?sync=2&after=${cacheCursor}&known=${"b".repeat(32)}`));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(data);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(queryColorPolishSnapshot).toHaveBeenCalledWith(cacheCursor, expect.any(AbortSignal), ["b".repeat(32)]);
    expect(projectColorPolishSnapshot).not.toHaveBeenCalled();
  });

  it("rejects oversized, duplicate and malformed cache manifests before opening a database read", async () => {
    for (const known of ["bad", `${"a".repeat(32)}.${"a".repeat(32)}`, "a".repeat(3300)]) {
      expect((await GET(request(`/api/display/color-polish?sync=2&known=${known}`))).status).toBe(400);
    }
    expect(queryColorPolishSnapshot).not.toHaveBeenCalled();
  });
});
