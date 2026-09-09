import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type ConfiguredResult = ReturnType<typeof import("@/lib/server/http")["requireConfigured"]>;

const { databaseClient, requireConfigured, admitPublicDisplayRequest } = vi.hoisted(() => ({
  databaseClient: vi.fn(),
  requireConfigured: vi.fn<() => ConfiguredResult>(() => null),
  admitPublicDisplayRequest: vi.fn(),
}));

vi.mock("@/lib/server/supabase", () => ({ databaseClient }));
vi.mock("@/lib/server/http", () => ({ requireConfigured }));
vi.mock("@/lib/server/public-display-admission", () => ({ admitPublicDisplayRequest }));

import { GET } from "@/app/api/display/snapshot/route";
import { projectPublicDisplaySnapshot } from "@/lib/server/public-display";

const recognition = {
  id: "00000000-0000-4000-8000-000000000001",
  recipient: "Sample Recipient A.",
  message: "A synthetic public display message.",
  expressionIds: [2, 6],
  createdAt: "2026-09-08T10:00:00.000Z",
  firstPublishedAt: "2026-09-08T10:00:00.000Z",
  expiresAt: "2026-09-15T10:00:00.000Z",
  version: 1,
  status: "published",
  featured: true,
};

const settings = {
  version: 3,
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
};

const aggregate = {
  periodStart: "2026-09-01",
  periodEnd: "2026-09-30",
  recognitions: 1,
  expressionCounts: [0, 1, 0, 0, 0, 1, 0, 0, 0],
  expressionTotal: 2,
  revision: 2,
};

const snapshot = {
  ok: true,
  serverTime: "2026-09-08T10:01:00.000Z",
  revision: 4,
  recognitions: [recognition],
  aggregate,
  settings,
  submissionUrl: "https://mothers-love.example/recognize",
  cursor: "12.1788861660",
  sync: "delta",
  arrivals: [{ eventId: "12", recognitionId: recognition.id, publishedAt: recognition.firstPublishedAt }],
};

function request(path = "/api/display/snapshot") {
  return new NextRequest(`https://mothers-love.example${path}`);
}

beforeEach(() => {
  databaseClient.mockReset();
  requireConfigured.mockReturnValue(null);
  admitPublicDisplayRequest.mockReturnValue({ release: vi.fn() });
});

describe("public display projection", () => {
  it("returns only the display allowlist and removes private fields", () => {
    const projected = projectPublicDisplaySnapshot({
      ...snapshot,
      privateAudit: "remove",
      recognitions: [{ ...recognition, submittedName: "Synthetic Sender A.", reason: "safety", privateToken: "remove" }],
      aggregate: { ...aggregate, privateAudit: "remove" },
      settings: { ...settings, internalSecret: "remove" },
    });

    expect(projected).toEqual({
      serverTime: snapshot.serverTime,
      revision: snapshot.revision,
      recognitions: [{
        id: recognition.id,
        recipient: recognition.recipient,
        message: recognition.message,
        expressionIds: recognition.expressionIds,
        createdAt: recognition.createdAt,
        firstPublishedAt: recognition.firstPublishedAt,
        expiresAt: recognition.expiresAt,
        version: recognition.version,
        status: "published",
        featured: true,
      }],
      aggregate,
      settings,
      submissionUrl: snapshot.submissionUrl,
      cursor: snapshot.cursor,
      sync: snapshot.sync,
      arrivals: snapshot.arrivals,
    });
    expect(projected?.recognitions[0]).not.toHaveProperty("submittedName");
    expect(projected?.recognitions[0]).not.toHaveProperty("reason");
  });

  it("fails closed for malformed, unsafe, unsorted, or mismatched data", () => {
    expect(projectPublicDisplaySnapshot({ ...snapshot, cursor: "999999999999999999999999.1" })).toBeNull();
    expect(projectPublicDisplaySnapshot({ ...snapshot, recognitions: [{ ...recognition, message: "" }] })).toBeNull();
    expect(projectPublicDisplaySnapshot({ ...snapshot, recognitions: [{ ...recognition, status: "held" }] })).toBeNull();
    expect(projectPublicDisplaySnapshot({ ...snapshot, recognitions: [{ ...recognition, recipient: "Full Recipient Name" }] })).toBeNull();
    expect(projectPublicDisplaySnapshot({ ...snapshot, arrivals: [{ ...snapshot.arrivals[0], recognitionId: "00000000-0000-4000-8000-000000000099" }] })).toBeNull();
    expect(projectPublicDisplaySnapshot({ ...snapshot, settings: { ...settings, mode: "quiet" }, recognitions: [recognition] })).toBeNull();
    expect(projectPublicDisplaySnapshot({ ...snapshot, recognitions: Array.from({ length: 1001 }, (_, index) => ({ ...recognition, id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}` })) })).toBeNull();
  });

  it("accepts PostgreSQL timestamp ordering when sub-millisecond values tie in JavaScript", () => {
    const newestAt = "2026-09-08T10:00:00.000900Z";
    const olderAt = "2026-09-08T10:00:00.000100Z";
    const projected = projectPublicDisplaySnapshot({
      ...snapshot,
      sync: "reset",
      arrivals: [],
      recognitions: [
        {
          ...recognition,
          id: "00000000-0000-4000-8000-000000000001",
          featured: false,
          createdAt: newestAt,
          firstPublishedAt: newestAt,
        },
        {
          ...recognition,
          id: "00000000-0000-4000-8000-000000000099",
          featured: false,
          createdAt: olderAt,
          firstPublishedAt: olderAt,
        },
      ],
    });

    expect(Date.parse(newestAt)).toBe(Date.parse(olderAt));
    expect(projected?.recognitions.map((item) => item.id)).toEqual([
      "00000000-0000-4000-8000-000000000001",
      "00000000-0000-4000-8000-000000000099",
    ]);
  });

  it("accepts a new month with no aggregate rows yet", () => {
    const projected = projectPublicDisplaySnapshot({
      ...snapshot,
      recognitions: [],
      arrivals: [],
      aggregate: {
        ...aggregate,
        recognitions: 0,
        expressionCounts: [0, 0, 0, 0, 0, 0, 0, 0, 0],
        expressionTotal: 0,
        revision: 0,
      },
      sync: "reset",
    });

    expect(projected?.aggregate).toEqual({
      ...aggregate,
      recognitions: 0,
      expressionCounts: [0, 0, 0, 0, 0, 0, 0, 0, 0],
      expressionTotal: 0,
      revision: 0,
    });
  });
});

describe("GET /api/display/snapshot", () => {
  it("uses the public bridge, returns the safe snapshot, and never sets a cookie", async () => {
    const rpc = vi.fn().mockResolvedValue([{ result: { ...snapshot, privateAudit: "remove" } }]);
    databaseClient.mockReturnValue(rpc);

    const response = await GET(request("/api/display/snapshot?after=11.1788861600"));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(response.headers.get("set-cookie")).toBeNull();
    const { ok: _ok, ...expectedSnapshot } = snapshot;
    expect(await response.json()).toEqual(expectedSnapshot);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(String(rpc.mock.calls[0]?.[0]?.[0])).toContain("public.ml_public_display_snapshot");
  });

  it("maps transport and malformed bridge failures to a safe unavailable response", async () => {
    databaseClient.mockReturnValue(vi.fn().mockRejectedValue(new Error("private database detail")));
    const transportResponse = await GET(request());
    expect(transportResponse.status).toBe(503);
    expect(await transportResponse.json()).toEqual({ ok: false, error: "UNAVAILABLE", code: "UNAVAILABLE" });

    databaseClient.mockReturnValue(vi.fn().mockResolvedValue([{ result: { ...snapshot, recognitions: [{ ...recognition, status: "held" }] } }]));
    const malformedResponse = await GET(request());
    expect(malformedResponse.status).toBe(503);
    expect(await malformedResponse.json()).toEqual({ ok: false, error: "UNAVAILABLE", code: "UNAVAILABLE" });
  });

  it("fails closed before querying when server configuration is unavailable", async () => {
    requireConfigured.mockReturnValue(NextResponse.json({ ok: false, code: "UNAVAILABLE" }, { status: 503 }));
    const response = await GET(request());
    expect(response.status).toBe(503);
    expect(databaseClient).not.toHaveBeenCalled();
  });

  it("refuses an unadmitted request before the database and marks it uncached", async () => {
    admitPublicDisplayRequest.mockReturnValue(null);
    const response = await GET(request());
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("5");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(databaseClient).not.toHaveBeenCalled();
  });

  it("releases the admission slot when the database query fails", async () => {
    const release = vi.fn();
    admitPublicDisplayRequest.mockReturnValue({ release });
    databaseClient.mockReturnValue(vi.fn().mockRejectedValue(new Error("synthetic transport failure")));
    const response = await GET(request());
    expect(response.status).toBe(503);
    expect(release).toHaveBeenCalledTimes(1);
  });
});
