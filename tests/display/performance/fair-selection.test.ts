import { describe, expect, it } from "vitest";

import { recordFairSelection, selectFair } from "@/lib/display-performance/fair-selection";

const records = [
  { id: "one", publishedAt: "2026-09-01T00:00:00.000Z" },
  { id: "two", publishedAt: "2026-09-02T00:00:00.000Z" },
  { id: "three", publishedAt: "2026-09-03T00:00:00.000Z" },
  { id: "four", publishedAt: "2026-09-04T00:00:00.000Z" },
];

describe("fair display selection", () => {
  it("does not repeat an item until less-seen items have had a turn", () => {
    const first = selectFair(records, { limit: 2, round: 0, getPublishedAt: (record) => record.publishedAt });
    const history = recordFairSelection(undefined, first.map((record) => record.id), 1);
    const second = selectFair(records, { limit: 2, history, round: 1, getPublishedAt: (record) => record.publishedAt });

    expect(new Set([...first, ...second].map((record) => record.id))).toEqual(new Set(records.map((record) => record.id)));
  });

  it("deduplicates input IDs and returns a deterministic result for a round", () => {
    const duplicateRecords = [...records, records[0]];
    const first = selectFair(duplicateRecords, 3, undefined, (record) => record.publishedAt);
    const second = selectFair(duplicateRecords, 3, undefined, (record) => record.publishedAt);

    expect(first.map((record) => record.id)).toEqual(second.map((record) => record.id));
    expect(new Set(first.map((record) => record.id)).size).toBe(3);
  });

  it("accepts map history and preserves the caller's history", () => {
    const history = new Map([["one", 10], ["two", 20]]);
    const before = [...history.entries()];
    const selected = selectFair(records, { limit: 1, history, round: 3 });
    const next = recordFairSelection(history, selected.map((record) => record.id), 30);

    expect([...history.entries()]).toEqual(before);
    expect(next[selected[0].id]).toBe(30);
  });
});
