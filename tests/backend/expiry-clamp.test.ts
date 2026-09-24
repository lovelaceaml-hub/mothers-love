import { afterEach, describe, expect, it, vi } from "vitest";
import { clampPublicExpiry, publicExpiryCeilingMs, PUBLIC_EXPIRY_WINDOW_MS } from "@/lib/server/expiry-clamp";
import { clearSafeTimeout, setSafeTimeout, SAFE_TIMER_MAX_DELAY_MS } from "@/lib/safe-timer";

const DAY = 86_400_000;

afterEach(() => vi.useRealTimers());

describe("public expiry ceiling", () => {
  it("is always after six days and at most seven days ahead", () => {
    for (let hour = -48; hour <= 48; hour += 1) {
      const now = Date.parse("2026-09-23T08:00:00Z") + hour * 3_600_000 + 42;
      const ceiling = publicExpiryCeilingMs(now);
      expect(ceiling).toBeGreaterThan(now + 6 * DAY);
      expect(ceiling).toBeLessThanOrEqual(now + PUBLIC_EXPIRY_WINDOW_MS);
    }
  });

  it("holds steady within a window and changes exactly at 08:00 UTC", () => {
    const boundary = Date.parse("2026-09-23T08:00:00Z");
    expect(publicExpiryCeilingMs(boundary - 1)).toBe(boundary + 6 * DAY);
    expect(publicExpiryCeilingMs(boundary)).toBe(boundary + 7 * DAY);
    expect(publicExpiryCeilingMs(boundary + DAY - 1)).toBe(boundary + 7 * DAY);
    expect(publicExpiryCeilingMs(boundary + DAY)).toBe(boundary + 8 * DAY);
  });

  it("preserves an earlier timestamp byte for byte and clamps 100 years", () => {
    const now = Date.parse("2026-09-23T12:00:00Z");
    expect(clampPublicExpiry("2026-09-25T12:00:00+00:00", now)).toBe("2026-09-25T12:00:00+00:00");
    const clamped = clampPublicExpiry("2126-09-23T12:00:00.000Z", now);
    expect(clamped).toBe("2026-09-30T08:00:00.000Z");
    expect(Date.parse(clamped)).toBeLessThanOrEqual(now + PUBLIC_EXPIRY_WINDOW_MS);
  });
});

describe("chained safe timers", () => {
  it("fires once after the deadline across seven-day hops", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-23T08:00:00Z"));
    const callback = vi.fn();
    setSafeTimeout(callback, 15 * DAY);
    await vi.advanceTimersByTimeAsync(15 * DAY - 1);
    expect(callback).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(2);
    expect(callback).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(DAY);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("cancels and never schedules a native delay above seven days", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-23T08:00:00Z"));
    const native = vi.spyOn(globalThis, "setTimeout");
    const callback = vi.fn();
    const handle = setSafeTimeout(callback, SAFE_TIMER_MAX_DELAY_MS * 100);
    expect(native.mock.calls.every((call) => Number(call[1]) <= SAFE_TIMER_MAX_DELAY_MS)).toBe(true);
    clearSafeTimeout(handle);
    await vi.advanceTimersByTimeAsync(15 * DAY);
    expect(callback).not.toHaveBeenCalled();
    native.mockRestore();
  });
});
