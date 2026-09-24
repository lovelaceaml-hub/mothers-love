import { afterEach, describe, expect, it, vi } from "vitest";
import type { Recognition } from "@/lib/contracts";
import { flowLengthKept, tvFlowRecord } from "@/components/display/world/art/tv-flow";
import { planWorldBubbles, worldHoldKept, worldHoldSeconds } from "@/components/display/world/art/tv-page";
import { emptyFeed, sampleWorldFeed, type WorldFeed } from "@/components/display/world/world-feed";
import { forgetMessageMeasures, setEngineFeed } from "@/components/display/world/world-engine-reading";
import { disposeEngine } from "@/components/display/world/world-engine-dispose";
import type { WorldEngine } from "@/components/display/world/world-engine";

/**
 * Plan 28 Section 8, from the completion review: the TV page measures each message once and
 * keeps the result keyed by the message's text, so those caches must let go of every message
 * on an unsafe feed, a source switch and disposal (Plan 24 P7), like every other reference.
 */

/** Fictional records only: numbered names and plain sample words. */
function records(count: number): Recognition[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `r${i}`,
    recipient: `Neighbor ${i}`,
    message: `Fictional live words number ${i}.`,
    expressionIds: [1],
    createdAt: new Date(Date.UTC(2026, 8, 1, 0, 0, i)).toISOString(),
    firstPublishedAt: new Date(Date.UTC(2026, 8, 1, 0, 0, i)).toISOString(),
  }) as unknown as Recognition);
}

const live: WorldFeed = { ...emptyFeed("live"), records: records(20) };

/** Measures two messages the way the TV page does and returns them. */
function measure() {
  const held = live.records[0].message;
  worldHoldSeconds(held);
  const flowing = tvFlowRecord(planWorldBubbles(live.records), "garden", 0)!.message;
  expect(worldHoldKept(held)).toBe(true);
  expect(flowLengthKept(flowing)).toBe(true);
  return { held, flowing };
}

/** A stand in for the engine: the fields given are real, every other member is a no-op. */
function engineStub(fields: Record<string, unknown>) {
  const noop: unknown = new Proxy(function () {}, {
    get: (_target, key) => (key === Symbol.toPrimitive ? () => 0 : noop),
    apply: () => noop,
  });
  return new Proxy(fields, {
    get: (target, key) => (key in target ? target[key as string] : noop),
  }) as unknown as WorldEngine;
}

const stub = () => engineStub({ feed: live, study: false, tv: true, tvFresh: [], sourceStill: false });

describe("the TV page's message measures", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("are forgotten together", () => {
    const { held, flowing } = measure();
    forgetMessageMeasures();
    expect(worldHoldKept(held)).toBe(false);
    expect(flowLengthKept(flowing)).toBe(false);
  });

  for (const phase of ["quiet", "neutral", "disabled", "unavailable", "connecting"] as const)
    it(`are forgotten when the feed turns ${phase}`, () => {
      const { held, flowing } = measure();
      setEngineFeed.call(stub(), emptyFeed(phase));
      expect(worldHoldKept(held)).toBe(false);
      expect(flowLengthKept(flowing)).toBe(false);
    });

  it("let go of live messages when the source switches to the sample", () => {
    const { held, flowing } = measure();
    setEngineFeed.call(stub(), sampleWorldFeed());
    expect(worldHoldKept(held)).toBe(false);
    expect(flowLengthKept(flowing)).toBe(false);
  });

  it("are forgotten when the engine is disposed", () => {
    const { held, flowing } = measure();
    vi.stubGlobal("document", { removeEventListener() {} });
    disposeEngine.call(stub());
    expect(worldHoldKept(held)).toBe(false);
    expect(flowLengthKept(flowing)).toBe(false);
  });
});
