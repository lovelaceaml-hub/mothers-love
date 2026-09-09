import { describe, expect, it } from "vitest";

import { planDisplayRefresh } from "@/lib/display-performance/refresh-plan";

describe("visibility-aware display refresh planning", () => {
  it("loads immediately without a previous attempt", () => {
    expect(planDisplayRefresh({ nowMs: 100, visibility: "visible", lastAttemptAtMs: null })).toMatchObject({
      shouldRefresh: true,
      reason: "initial",
      delayMs: 0,
    });
  });

  it("refreshes immediately when a hidden display becomes visible", () => {
    expect(planDisplayRefresh({
      nowMs: 12_000,
      visibility: "visible",
      visibilityChanged: true,
      lastAttemptAtMs: 11_900,
    })).toMatchObject({ shouldRefresh: true, reason: "became-visible" });
  });

  it("pauses background work while hidden by default", () => {
    expect(planDisplayRefresh({
      nowMs: 60_000,
      visibility: "hidden",
      lastAttemptAtMs: 0,
    })).toMatchObject({ shouldRefresh: false, reason: "hidden", delayMs: null, nextDueAtMs: null });
  });

  it("uses a slower hidden interval when the caller opts into hidden refreshes", () => {
    expect(planDisplayRefresh({
      nowMs: 29_999,
      visibility: "hidden",
      pauseWhenHidden: false,
      lastAttemptAtMs: 0,
      hiddenIntervalMs: 30_000,
    })).toMatchObject({ shouldRefresh: false, reason: "not-due", delayMs: 1, nextDueAtMs: 30_000 });
    expect(planDisplayRefresh({
      nowMs: 30_000,
      visibility: "hidden",
      pauseWhenHidden: false,
      lastAttemptAtMs: 0,
      hiddenIntervalMs: 30_000,
    }).shouldRefresh).toBe(true);
  });

  it("does not start a second read while one is in flight", () => {
    expect(planDisplayRefresh({
      nowMs: 10_000,
      visibility: "visible",
      lastAttemptAtMs: 0,
      inFlight: true,
    })).toMatchObject({ shouldRefresh: false, reason: "in-flight" });
  });
});
