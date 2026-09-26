import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type ConfiguredResult = ReturnType<typeof import("@/lib/server/http")["requireConfigured"]>;

const { databaseClient, requireConfigured } = vi.hoisted(() => ({
  databaseClient: vi.fn(),
  requireConfigured: vi.fn<() => ConfiguredResult>(() => null),
}));

vi.mock("@/lib/server/supabase", () => ({ databaseClient }));
vi.mock("@/lib/server/http", () => ({ requireConfigured }));

import { GET } from "@/app/api/feed/older/route";
import { parsePublicFeedCursor } from "@/lib/server/public-feed";

const cursor = { before: "2026-09-08T10:00:00.123456+00:00", id: "00000000-0000-4000-8000-000000000050" };
const item = {
  id: "00000000-0000-4000-8000-000000000001",
  recipient: "Sample Recipient A.",
  message: "A synthetic public message.",
  expressionIds: [2, 6],
  firstPublishedAt: "2026-09-08T09:00:00.000Z",
  expiresAt: "2026-09-15T07:00:00.000Z",
};
const snapshot = { serverTime: "2026-09-08T10:01:00.000Z", items: [item] };

function request(query: Record<string, string>) {
  return new NextRequest(`https://mothers-love.example/api/feed/older?${new URLSearchParams(query)}`);
}

beforeEach(() => {
  databaseClient.mockReset();
  requireConfigured.mockReturnValue(null);
});

describe("older feed cursor", () => {
  it("accepts a timestamp and UUID and keeps the timestamp text unchanged", () => {
    expect(parsePublicFeedCursor(cursor.before, cursor.id.toUpperCase())).toEqual(cursor);
  });

  it("rejects missing, malformed or oversized cursors", () => {
    expect(parsePublicFeedCursor(null, cursor.id)).toBeNull();
    expect(parsePublicFeedCursor(cursor.before, null)).toBeNull();
    expect(parsePublicFeedCursor("not-a-date", cursor.id)).toBeNull();
    expect(parsePublicFeedCursor(cursor.before, "not-a-uuid")).toBeNull();
    expect(parsePublicFeedCursor(`${cursor.before}${" ".repeat(64)}`, cursor.id)).toBeNull();
  });
});

describe("GET /api/feed/older", () => {
  it("passes the cursor to the dedicated RPC and returns only the public projection", async () => {
    const rpc = vi.fn().mockResolvedValue([{ result: { ok: true, ...snapshot, items: [{ ...item, submittedName: "Synthetic Sender A." }] } }]);
    databaseClient.mockReturnValue(rpc);

    const response = await GET(request(cursor));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(await response.json()).toEqual(snapshot);
    expect(String(rpc.mock.calls[0]?.[0]?.join("?"))).toContain("public.ml_public_feed_older(");
    expect(rpc.mock.calls[0]?.slice(1)).toEqual([cursor.before, cursor.id]);
  });

  it("rejects a bad cursor without reaching the database", async () => {
    const response = await GET(request({ before: "yesterday", id: cursor.id }));
    expect(response.status).toBe(400);
    expect(databaseClient).not.toHaveBeenCalled();
  });

  it("fails closed when an item is not older than the cursor", async () => {
    databaseClient.mockReturnValue(vi.fn().mockResolvedValue([{ result: { ...snapshot, items: [{ ...item, firstPublishedAt: "2026-09-08T10:00:30.000Z" }] } }]));
    const response = await GET(request(cursor));
    expect(response.status).toBe(503);
  });

  it("reports unavailable while the database function is missing or refuses", async () => {
    databaseClient.mockReturnValue(vi.fn().mockRejectedValue(new Error("function public.ml_public_feed_older does not exist")));
    const missing = await GET(request(cursor));
    expect(missing.status).toBe(503);
    expect(await missing.json()).toEqual({ ok: false, error: "UNAVAILABLE", code: "UNAVAILABLE" });

    databaseClient.mockReturnValue(vi.fn().mockResolvedValue([{ result: { ok: false, status: 503, code: "UNAVAILABLE" } }]));
    expect((await GET(request(cursor))).status).toBe(503);
  });

  it("fails closed when server configuration is unavailable", async () => {
    requireConfigured.mockReturnValue(NextResponse.json({ ok: false, code: "UNAVAILABLE" }, { status: 503 }));
    expect((await GET(request(cursor))).status).toBe(503);
    expect(databaseClient).not.toHaveBeenCalled();
  });
});
