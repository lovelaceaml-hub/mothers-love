import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Buffer } from "node:buffer";

describe("database result byte samples", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-12T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("logs only a bounded UTF-8 byte sample for full results and heartbeats", async () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const { recordDatabaseResultBytes } = await import("@/lib/server/database-result-metrics");
    const privateFixture = {
      items: [{ id: "synthetic-id-never-log", recipient: "Fixture Recipient", message: "Synthetic 🧡 message" }],
    };
    const heartbeat = { unchanged: true, serverTime: "2026-10-12T12:00:00.000Z" };

    recordDatabaseResultBytes("feed.older", privateFixture);
    recordDatabaseResultBytes("feed.older", { ...privateFixture, items: [] });
    recordDatabaseResultBytes("feed.older", heartbeat);
    expect(log).toHaveBeenCalledTimes(2);

    const fullLog = JSON.parse(String(log.mock.calls[0]?.[0])) as Record<string, unknown>;
    const heartbeatLog = JSON.parse(String(log.mock.calls[1]?.[0])) as Record<string, unknown>;
    expect(fullLog).toEqual({
      event: "database_result_bytes",
      family: "feed.older",
      resultKind: "full",
      utf8Bytes: Buffer.byteLength(JSON.stringify(privateFixture), "utf8"),
    });
    expect(heartbeatLog).toEqual({
      event: "database_result_bytes",
      family: "feed.older",
      resultKind: "heartbeat",
      utf8Bytes: Buffer.byteLength(JSON.stringify(heartbeat), "utf8"),
    });
    const logs = log.mock.calls.map(([value]) => String(value)).join("\n");
    expect(logs).not.toContain("synthetic-id-never-log");
    expect(logs).not.toContain("Fixture Recipient");
    expect(logs).not.toContain("Synthetic");

    vi.advanceTimersByTime(60_000);
    recordDatabaseResultBytes("feed.older", privateFixture);
    expect(log).toHaveBeenCalledTimes(3);
  });
});
