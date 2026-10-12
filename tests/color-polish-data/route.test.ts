import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireConfigured, admitPublicDisplayRequest, queryColorPolishSnapshot, projectColorPolishSnapshot, queryReactionTotal, projectReactionTotal, recordDatabaseResultBytes } = vi.hoisted(() => ({
  requireConfigured: vi.fn(),
  admitPublicDisplayRequest: vi.fn(),
  queryColorPolishSnapshot: vi.fn(),
  projectColorPolishSnapshot: vi.fn(),
  queryReactionTotal: vi.fn(),
  projectReactionTotal: vi.fn(),
  recordDatabaseResultBytes: vi.fn(),
}));

vi.mock("@/lib/server/http", () => ({ requireConfigured }));
vi.mock("@/lib/server/public-display-admission", () => ({ admitPublicDisplayRequest }));
vi.mock("@/lib/server/color-polish", () => ({ queryColorPolishSnapshot, projectColorPolishSnapshot }));
vi.mock("@/lib/server/reactions", () => ({ queryReactionTotal, projectReactionTotal }));
vi.mock("@/lib/server/database-result-metrics", () => ({ recordDatabaseResultBytes }));

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
  queryReactionTotal.mockReset();
  projectReactionTotal.mockReset();
  recordDatabaseResultBytes.mockReset();
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
    expect(recordDatabaseResultBytes).toHaveBeenCalledWith("display.color-polish", expect.any(Object), {
      validatorPresent: true,
      validatorValid: true,
      validatorMatched: true,
      projectionOK: true,
    });
  });

  it("normalizes a weak request validator before matching the database digest", async () => {
    const etag = "c".repeat(32);
    queryColorPolishSnapshot.mockResolvedValue({
      data: { unchanged: true, serverTime: "2026-09-10T18:00:05.000Z" },
      etag,
      error: null,
    });
    const response = await GET(new NextRequest("https://mothers-love.vercel.app/api/display/color-polish", {
      headers: { "If-None-Match": `W/"${etag}"` },
    }));
    expect(response.status).toBe(200);
    expect(response.headers.get("etag")).toBe(`"${etag}"`);
    expect(queryColorPolishSnapshot).toHaveBeenCalledWith(null, expect.any(AbortSignal), etag);
  });

  it("ignores a malformed request validator while recording only its boolean state", async () => {
    const etag = "f".repeat(32);
    queryColorPolishSnapshot.mockResolvedValue({ data: { ok: true }, etag, error: null });
    projectColorPolishSnapshot.mockReturnValue(projected);

    const response = await GET(new NextRequest("https://mothers-love.vercel.app/api/display/color-polish", {
      headers: { "If-None-Match": `W/"${etag} extra"` },
    }));

    expect(response.status).toBe(200);
    expect(queryColorPolishSnapshot).toHaveBeenCalledWith(null, expect.any(AbortSignal), null);
    expect(recordDatabaseResultBytes).toHaveBeenCalledWith("display.color-polish", { ok: true }, {
      validatorPresent: true,
      validatorValid: false,
      validatorMatched: false,
      projectionOK: true,
    });
  });

  it("fails closed when a heartbeat digest does not match the request validator", async () => {
    const requestTag = "d".repeat(32);
    queryColorPolishSnapshot.mockResolvedValue({
      data: { unchanged: true, serverTime: "2026-09-10T18:00:05.000Z" },
      etag: "e".repeat(32),
      error: null,
    });
    const response = await GET(new NextRequest("https://mothers-love.vercel.app/api/display/color-polish", {
      headers: { "If-None-Match": `W/"${requestTag}"` },
    }));
    expect(response.status).toBe(503);
    expect(recordDatabaseResultBytes).toHaveBeenCalledWith("display.color-polish", expect.any(Object), {
      validatorPresent: true,
      validatorValid: true,
      validatorMatched: false,
      projectionOK: false,
    });
  });

  it("includes the campaign total on an active snapshot only when requested", async () => {
    const active = { ...projected, presentation: { ...projected.presentation, enabled: true } };
    projectColorPolishSnapshot.mockReturnValue(active);
    queryColorPolishSnapshot.mockResolvedValue({ data: { ok: true }, error: null });
    queryReactionTotal.mockResolvedValue({ data: { ok: true, total: 42 }, error: null });
    projectReactionTotal.mockReturnValue({ ok: true, total: 42 });

    const response = await GET(request("/api/display/color-polish?includeLikesTotal=1"));

    expect(response.status).toBe(200);
    expect(response.headers.get("x-likes-total")).toBe("42");
    expect(queryReactionTotal).toHaveBeenCalledTimes(1);
    expect(projectReactionTotal).toHaveBeenCalledWith({ ok: true, total: 42 });
  });

  it("includes a total on requested heartbeats and leaves a healthy snapshot alone if the total read fails", async () => {
    const etag = "b".repeat(32);
    queryColorPolishSnapshot.mockResolvedValue({
      data: { unchanged: true, serverTime: "2026-09-10T18:00:05.000Z" }, etag, error: null,
    });
    queryReactionTotal.mockResolvedValue({ data: { ok: true, total: 43 }, error: null });
    projectReactionTotal.mockReturnValue({ ok: true, total: 43 });
    const heartbeat = await GET(new NextRequest(`https://mothers-love.vercel.app/api/display/color-polish?includeLikesTotal=1`, {
      headers: { "If-None-Match": `"${etag}"` },
    }));
    expect(heartbeat.headers.get("x-likes-total")).toBe("43");
    expect(projectColorPolishSnapshot).not.toHaveBeenCalled();

    queryColorPolishSnapshot.mockResolvedValue({ data: { ok: true }, error: null });
    projectColorPolishSnapshot.mockReturnValue({ ...projected, presentation: { ...projected.presentation, enabled: true } });
    queryReactionTotal.mockResolvedValue({ data: null, error: new Error("unavailable") });
    const snapshotResponse = await GET(request("/api/display/color-polish?includeLikesTotal=1"));
    expect(snapshotResponse.status).toBe(200);
    expect(snapshotResponse.headers.get("x-likes-total")).toBeNull();
  });

  it("does not read or return the total when it was not requested or the display is disabled", async () => {
    queryColorPolishSnapshot.mockResolvedValue({ data: { ok: true }, error: null });
    queryReactionTotal.mockResolvedValue({ data: { ok: true, total: 42 }, error: null });
    projectReactionTotal.mockReturnValue({ ok: true, total: 42 });

    const unrequested = await GET(request());
    expect(unrequested.headers.get("x-likes-total")).toBeNull();
    expect(queryReactionTotal).not.toHaveBeenCalled();

    const disabled = await GET(request("/api/display/color-polish?includeLikesTotal=1"));
    expect(disabled.headers.get("x-likes-total")).toBeNull();
    expect(queryReactionTotal).toHaveBeenCalledTimes(1);
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
});
