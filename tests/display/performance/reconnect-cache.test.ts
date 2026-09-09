import { describe, expect, it } from "vitest";

import { createSessionReconnectCache } from "@/lib/display-performance/reconnect-cache";

describe("volatile reconnect cache", () => {
  it("keeps a bounded value in memory and expires it at the earlier limit", () => {
    const cache = createSessionReconnectCache<string>({ maxAgeMs: 60_000 });
    cache.set("synthetic snapshot", 1_000, 90_000);

    expect(cache.hasValue).toBe(true);
    expect(cache.get(60_999)).toBe("synthetic snapshot");
    expect(cache.get(61_000)).toBeNull();
    expect(cache.hasValue).toBe(false);
  });

  it("never extends a source expiry beyond the cache age", () => {
    const cache = createSessionReconnectCache<string>({ maxAgeMs: 5_000 });
    cache.write("synthetic snapshot", 1_000, 60_000);

    expect(cache.expiresAtMs).toBe(6_000);
    expect(cache.isFresh(5_999)).toBe(true);
    expect(cache.isFresh(6_000)).toBe(false);
  });

  it("supports a caller-owned clone and explicit reload-style clearing", () => {
    const source = { records: ["one"] };
    const cache = createSessionReconnectCache({ clone: (value: typeof source) => ({ records: [...value.records] }) });
    cache.set(source, 0);
    source.records.push("two");

    expect(cache.read(1)?.records).toEqual(["one"]);
    cache.clear();
    expect(cache.read(1)).toBeNull();
  });
});
