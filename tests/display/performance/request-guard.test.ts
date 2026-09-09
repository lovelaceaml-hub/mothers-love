import { describe, expect, it } from "vitest";

import { createRequestInFlightGuard } from "@/lib/display-performance/request-guard";

describe("display request guard", () => {
  it("allows one request and reports an overlapping request as busy", async () => {
    const guard = createRequestInFlightGuard();
    let resolveRequest: ((value: string) => void) | undefined;
    const pending = new Promise<string>((resolve) => {
      resolveRequest = resolve;
    });

    const first = guard.run(() => pending);
    expect(guard.inFlight).toBe(true);
    await expect(guard.run(() => "second")).resolves.toEqual({ status: "busy", generation: 1 });

    resolveRequest?.("snapshot");
    await expect(first).resolves.toMatchObject({ status: "fulfilled", value: "snapshot", generation: 1 });
    expect(guard.inFlight).toBe(false);
    expect(guard.isCurrent({ generation: 1 })).toBe(true);
  });

  it("captures task failures and releases the guard", async () => {
    const guard = createRequestInFlightGuard();
    const failure = new Error("synthetic failure");

    await expect(guard.run(() => Promise.reject(failure))).resolves.toEqual({
      status: "rejected",
      generation: 1,
      error: failure,
    });
    expect(guard.inFlight).toBe(false);
  });

  it("invalidates a stale response without allowing overlap", async () => {
    const guard = createRequestInFlightGuard();
    const lease = guard.begin();
    expect(lease).not.toBeNull();
    guard.invalidate();

    expect(guard.isCurrent(lease!)).toBe(false);
    expect(guard.begin()).toBeNull();
    guard.finish(lease!);
    expect(guard.inFlight).toBe(false);
  });
});
