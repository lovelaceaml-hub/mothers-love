import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { projectPublicDisplaySnapshot, MAX_DISPLAY_POOL } from "@/lib/server/public-display";
import { projectPublicFeed } from "@/lib/server/public-feed";

const { databaseAction, readJson } = vi.hoisted(() => ({ databaseAction: vi.fn(), readJson: vi.fn() }));
vi.mock("@/lib/server/operations", () => ({ databaseAction, sha256: () => "synthetic-hash" }));
vi.mock("@/lib/server/http", () => ({ requireConfigured: () => null, readJson }));
vi.mock("@/lib/server/response", async () => {
  const actual = await vi.importActual<typeof import("@/lib/server/response")>("@/lib/server/response");
  return { ...actual, requireTrustedOrigin: () => null };
});

import { POST } from "@/app/api/recognitions/route";

const serverTime = "2026-09-23T12:00:00.000Z";
const farFuture = "2126-09-23T12:00:00.000Z";
const twoDays = "2026-09-25T12:00:00+00:00";
const clamped = "2026-09-30T08:00:00.000Z";
const feedItem = {
  id: "00000000-0000-4000-8000-000000000001",
  recipient: "Test Recipient 1",
  message: "Synthetic message 1",
  expressionIds: [2, 6],
  firstPublishedAt: "2026-09-23T11:00:00.000Z",
  expiresAt: farFuture,
};
const settings = {
  version: 3, mode: "normal", motion: "standard", pauseArrivals: false,
  pauseRotation: false, collectionOpen: true, lowActivityMinutes: 20,
  readingSeconds: 20, maxBubbles: 4, showTrails: true, showConstellations: true,
};
const aggregate = {
  periodStart: "2026-09-01", periodEnd: "2026-09-30", recognitions: 1,
  expressionCounts: [0, 1, 0, 0, 0, 1, 0, 0, 0], expressionTotal: 2, revision: 2,
};
function recognition(index: number, featured = false) {
  const id = `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;
  const publishedAt = new Date(Date.parse(serverTime) - (index + 1) * 1_000).toISOString();
  return {
    id, recipient: `Test Recipient ${index + 1}`, message: `Synthetic message ${index + 1}`,
    expressionIds: [2, 6], createdAt: publishedAt, firstPublishedAt: publishedAt,
    expiresAt: farFuture, version: 1, status: "published", featured,
  };
}
function snapshot(recognitions: ReturnType<typeof recognition>[], arrivals: unknown[] = []) {
  return {
    ok: true, serverTime, revision: 4, recognitions, aggregate, settings,
    submissionUrl: "https://mothers-love.example/recognize", cursor: "12.1788861660",
    sync: "reset", arrivals,
  };
}
function arrival(index: number, eventId = "1") {
  return { eventId, recognitionId: recognition(index).id, publishedAt: recognition(index).firstPublishedAt };
}

afterEach(() => vi.useRealTimers());

describe("never-expire public projections", () => {
  it("clamps 100 year feed expiry but preserves a two-day string", () => {
    const future = projectPublicFeed({ serverTime, items: [feedItem] });
    expect(future?.items[0]?.expiresAt).toBe(clamped);
    const near = projectPublicFeed({ serverTime, items: [{ ...feedItem, expiresAt: twoDays }] });
    expect(near?.items[0]?.expiresAt).toBe(twoDays);
  });

  it("clamps the TV projection", () => {
    expect(projectPublicDisplaySnapshot(snapshot([recognition(0)]))?.recognitions[0]?.expiresAt).toBe(clamped);
  });

  it("keeps the 100 newest of 150 in their original order, including a recent featured record", () => {
    const input = [recognition(10, true), ...Array.from({ length: 150 }, (_, index) => index)
      .filter((index) => index !== 10).map((index) => recognition(index))];
    const result = projectPublicDisplaySnapshot(snapshot(input));
    expect(result?.recognitions).toHaveLength(MAX_DISPLAY_POOL);
    expect(result?.recognitions[0]?.id).toBe(recognition(10).id);
    expect(result?.recognitions.map((item) => item.id)).toEqual(input.filter((item) =>
      Number(item.id.slice(-12)) <= 100).map((item) => item.id));
  });

  it("drops an old featured recognition and its arrival without rejecting the snapshot", () => {
    const input = [recognition(149, true), ...Array.from({ length: 149 }, (_, index) => recognition(index))];
    const result = projectPublicDisplaySnapshot(snapshot(input, [arrival(149)]));
    expect(result?.recognitions).toHaveLength(100);
    expect(result?.recognitions.some((item) => item.id === recognition(149).id)).toBe(false);
    expect(result?.arrivals).toEqual([]);
    expect(projectPublicDisplaySnapshot(snapshot(input, [arrival(999)]))).toBeNull();
  });

  it("clamps the successful submit route response", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(serverTime));
    readJson.mockResolvedValue({ value: {
      submittedName: "Test Sender 1", recipient: "Test Recipient 1",
      message: "Synthetic message 1", expressionIds: [2], requestKey: "synthetic-request-key-1",
    } });
    databaseAction.mockResolvedValue({ data: { ok: true, id: feedItem.id, expiresAt: farFuture }, error: null });
    const response = await POST(new NextRequest("https://mothers-love.example/api/recognitions", {
      method: "POST", headers: { origin: "https://mothers-love.example" },
    }));
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ id: feedItem.id, expiresAt: clamped });
  });
});
