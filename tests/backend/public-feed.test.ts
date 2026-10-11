import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type ConfiguredResult = ReturnType<typeof import("@/lib/server/http")["requireConfigured"]>;

const { databaseClient, requireConfigured } = vi.hoisted(() => ({
  databaseClient: vi.fn(),
  requireConfigured: vi.fn<() => ConfiguredResult>(() => null),
}));

vi.mock("@/lib/server/supabase", () => ({ databaseClient }));
vi.mock("@/lib/server/http", () => ({ requireConfigured }));

import { GET } from "@/app/api/feed/route";
import { projectPublicFeed } from "@/lib/server/public-feed";
import { verifyFeedHeartbeat } from "@/components/feed/feed-types";

const item = {
  id: "00000000-0000-4000-8000-000000000001",
  recipient: "Sample Recipient A.",
  message: "A synthetic public message.",
  expressionIds: [2, 6],
  firstPublishedAt: "2026-09-08T10:00:00.000Z",
  expiresAt: "2026-09-15T07:00:00.000Z",
};

const snapshot = {
  serverTime: "2026-09-08T10:01:00.000Z",
  items: [item],
};

function request(headers?: HeadersInit) {
  return new NextRequest("https://mothers-love.example/api/feed", { headers });
}

beforeEach(() => {
  databaseClient.mockReset();
  requireConfigured.mockReturnValue(null);
});

describe("public feed projection", () => {
  it("keeps only the public allowlist and removes private or unknown fields", () => {
    const projected = projectPublicFeed({
      ...snapshot,
      privateAudit: "remove",
      items: [{ ...item, submittedName: "Synthetic Sender A.", status: "published", reason: "safety", unknown: true }],
    });

    expect(projected).toEqual(snapshot);
    expect(projected?.items[0]).not.toHaveProperty("submittedName");
    expect(projected?.items[0]).not.toHaveProperty("status");
    expect(projected?.items[0]).not.toHaveProperty("reason");
  });

  it("accepts single, full, and Unicode recipient names without truncating them", () => {
    for (const recipient of ["Cher", "Mary Jane", "张伟", "A\u0301", "👩‍👩‍👧‍👦", "👩🏽‍💻"]) {
      const projected = projectPublicFeed({ ...snapshot, items: [{ ...item, recipient }] });
      expect(projected?.items[0]?.recipient).toBe(recipient);
    }
  });

  it("rejects malformed snapshots and unsorted items", () => {
    expect(projectPublicFeed({ serverTime: snapshot.serverTime, items: [{ ...item, expressionIds: [6, 2] }] })).toBeNull();
    expect(projectPublicFeed({ serverTime: snapshot.serverTime, items: [{ ...item, message: "" }] })).toBeNull();
    expect(projectPublicFeed({ serverTime: snapshot.serverTime, items: [{ ...item, firstPublishedAt: "2026-09-08T10:02:00.000Z" }] })).toBeNull();
    expect(projectPublicFeed({ serverTime: snapshot.serverTime, items: [{ ...item, expiresAt: snapshot.serverTime }] })).toBeNull();
    expect(projectPublicFeed({ serverTime: snapshot.serverTime, items: [{ ...item, recipient: "   " }] })).toBeNull();
    for (const recipient of ["\u200B", "\u200D", "\uFE0F", "\u0000"]) {
      expect(projectPublicFeed({ serverTime: snapshot.serverTime, items: [{ ...item, recipient }] })).toBeNull();
    }
    expect(projectPublicFeed({ serverTime: snapshot.serverTime, items: [{ ...item, recipient: "🙂".repeat(81) }] })).toBeNull();
    const uniqueItems = Array.from({ length: 100 }, (_, index) => ({
      ...item,
      id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      firstPublishedAt: new Date(Date.parse(item.firstPublishedAt) - index).toISOString(),
    }));
    expect(projectPublicFeed({ serverTime: snapshot.serverTime, items: uniqueItems })).not.toBeNull();
    expect(projectPublicFeed({ serverTime: snapshot.serverTime, items: [...uniqueItems, item] })).toBeNull();
    expect(projectPublicFeed({
      serverTime: snapshot.serverTime,
      items: [item, { ...item, firstPublishedAt: item.firstPublishedAt }],
    })).toBeNull();
  });
});

describe("public feed heartbeat validation", () => {
  it("accepts only a compact heartbeat and refreshes its monotonic clock", () => {
    const time = "2026-09-08T10:02:00.000Z";
    expect(verifyFeedHeartbeat({ unchanged: true, serverTime: time }, 123)).toEqual({
      unchanged: true,
      serverTime: time,
      verifiedServerTimeMs: Date.parse(time),
      verifiedMonotonicMs: 123,
    });
    expect(verifyFeedHeartbeat({ unchanged: true, serverTime: time, items: [] }, 123)).toBeNull();
    expect(verifyFeedHeartbeat({ unchanged: false, serverTime: time }, 123)).toBeNull();
    expect(verifyFeedHeartbeat({ unchanged: true, serverTime: "invalid" }, 123)).toBeNull();
  });
});

describe("GET /api/feed", () => {
  it("calls the dedicated RPC, returns the projected feed, and disables caching", async () => {
    const etag = "b".repeat(32);
    const rpc = vi.fn().mockResolvedValue([{ etag, result: { ...snapshot, privateAudit: "remove", items: [{ ...item, submittedName: "Synthetic Sender A." }] } }]);
    databaseClient.mockReturnValue(rpc);

    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(response.headers.get("etag")).toBe(`"${etag}"`);
    expect(await response.json()).toEqual(snapshot);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(String(rpc.mock.calls[0]?.[0]?.[0])).toContain("public.ml_public_feed()");
    expect(String(rpc.mock.calls[0]?.[0]?.[0])).toContain("md5((value - 'serverTime')::text)");
  });

  it("returns only a validated heartbeat when the known content tag is unchanged", async () => {
    const etag = "c".repeat(32);
    const rpc = vi.fn().mockResolvedValue([{
      etag,
      result: { unchanged: true, serverTime: "2026-09-08T10:02:00.000Z" },
    }]);
    databaseClient.mockReturnValue(rpc);

    const response = await GET(request({ "If-None-Match": `"${etag}"` }));

    expect(response.status).toBe(200);
    expect(response.headers.get("etag")).toBe(`"${etag}"`);
    expect(await response.json()).toEqual({ unchanged: true, serverTime: "2026-09-08T10:02:00.000Z" });
    expect((rpc.mock.calls[0]?.[0] as unknown as string[]).join("?")).toContain("jsonb_build_object('unchanged', true");
    expect(rpc.mock.calls[0]?.[1]).toBe(etag);
  });

  it("rejects heartbeats without a matching valid content tag", async () => {
    const rpc = vi.fn().mockResolvedValue([{
      etag: "d".repeat(32),
      result: { unchanged: true, serverTime: "2026-09-08T10:02:00.000Z" },
    }]);
    databaseClient.mockReturnValue(rpc);
    const response = await GET(request({ "If-None-Match": `"${"e".repeat(32)}"` }));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, error: "UNAVAILABLE", code: "UNAVAILABLE" });
  });

  it("returns a safe unavailable response for transport and malformed RPC failures", async () => {
    databaseClient.mockReturnValue(vi.fn().mockRejectedValue(new Error("private database detail")));
    const transportResponse = await GET(request());
    expect(transportResponse.status).toBe(503);
    expect(await transportResponse.json()).toEqual({ ok: false, error: "UNAVAILABLE", code: "UNAVAILABLE" });

    databaseClient.mockReturnValue(vi.fn().mockResolvedValue([{ result: { ok: true, serverTime: snapshot.serverTime, items: [{ ...item, firstPublishedAt: "not-a-date" }] } }]));
    const malformedResponse = await GET(request());
    expect(malformedResponse.status).toBe(503);
    expect(await malformedResponse.json()).toEqual({ ok: false, error: "UNAVAILABLE", code: "UNAVAILABLE" });
  });

  it("fails closed when server configuration is unavailable", async () => {
    requireConfigured.mockReturnValue(NextResponse.json({ ok: false, code: "UNAVAILABLE" }, { status: 503 }));
    const response = await GET(request());
    expect(response.status).toBe(503);
    expect(databaseClient).not.toHaveBeenCalled();
  });
});
