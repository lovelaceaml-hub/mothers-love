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

const item = {
  id: "00000000-0000-4000-8000-000000000001",
  recipient: "Sample Recipient A.",
  message: "A synthetic public message.",
  expressionIds: [2, 6],
  firstPublishedAt: "2026-09-08T10:00:00.000Z",
  expiresAt: "2026-09-15T10:00:00.000Z",
};

const snapshot = {
  serverTime: "2026-09-08T10:01:00.000Z",
  items: [item],
};

function request() {
  return new NextRequest("https://mothers-love.example/api/feed");
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
    expect(projectPublicFeed({ serverTime: snapshot.serverTime, items: Array.from({ length: 51 }, () => item) })).toBeNull();
    expect(projectPublicFeed({
      serverTime: snapshot.serverTime,
      items: [item, { ...item, firstPublishedAt: item.firstPublishedAt }],
    })).toBeNull();
  });
});

describe("GET /api/feed", () => {
  it("calls the dedicated RPC, returns the projected feed, and disables caching", async () => {
    const rpc = vi.fn().mockResolvedValue([{ result: { ...snapshot, privateAudit: "remove", items: [{ ...item, submittedName: "Synthetic Sender A." }] } }]);
    databaseClient.mockReturnValue(rpc);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(await response.json()).toEqual(snapshot);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(String(rpc.mock.calls[0]?.[0]?.[0])).toContain("public.ml_public_feed()");
  });

  it("returns a safe unavailable response for transport and malformed RPC failures", async () => {
    databaseClient.mockReturnValue(vi.fn().mockRejectedValue(new Error("private database detail")));
    const transportResponse = await GET();
    expect(transportResponse.status).toBe(503);
    expect(await transportResponse.json()).toEqual({ ok: false, error: "UNAVAILABLE", code: "UNAVAILABLE" });

    databaseClient.mockReturnValue(vi.fn().mockResolvedValue([{ result: { ok: true, serverTime: snapshot.serverTime, items: [{ ...item, firstPublishedAt: "not-a-date" }] } }]));
    const malformedResponse = await GET();
    expect(malformedResponse.status).toBe(503);
    expect(await malformedResponse.json()).toEqual({ ok: false, error: "UNAVAILABLE", code: "UNAVAILABLE" });
  });

  it("fails closed when server configuration is unavailable", async () => {
    requireConfigured.mockReturnValue(NextResponse.json({ ok: false, code: "UNAVAILABLE" }, { status: 503 }));
    const response = await GET();
    expect(response.status).toBe(503);
    expect(databaseClient).not.toHaveBeenCalled();
  });
});
