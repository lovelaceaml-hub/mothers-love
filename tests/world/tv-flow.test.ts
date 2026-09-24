import * as T from "three";
import { describe, expect, it } from "vitest";
import type { Recognition } from "@/lib/contracts";
import { TOUR_ORDER } from "@/components/display/world/world-data";
import { planWorldBubbles } from "@/components/display/world/prototype/tv-page";
import { TV_MAIN_RADIUS, TV_MEDALLION_SCALE, TV_READ, tvFlowRadius, tvPlaceWorld } from "@/components/display/world/prototype/tv-places";
import {
  TV_BUD_SCALE,
  TV_FLOW,
  TV_FLOW_SETTLED,
  TV_STREAM_STEPS,
  TvLeavePath,
  TvRisePath,
  TvSwap,
  tvArriving,
  tvFlowRecord,
  tvLeaving,
  tvStreamStep,
} from "@/components/display/world/prototype/tv-flow";

/** Fictional records only: numbered names and plain sample words. */
function records(count: number): Recognition[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `r${i}`,
    recipient: `Neighbor ${i}`,
    message: `Sample kind words number ${i}.`,
    expressionIds: [1],
    createdAt: new Date(Date.UTC(2026, 8, 1, 0, 0, i)).toISOString(),
    firstPublishedAt: new Date(Date.UTC(2026, 8, 1, 0, 0, i)).toISOString(),
  }) as unknown as Recognition);
}

describe("a flowing bubble's journey", () => {
  it("buds at its lotus, rises, and comes to rest", () => {
    expect(tvArriving(0)).toBeNull();
    expect(tvArriving(TV_FLOW.budAt - 0.01)).toBeNull();
    const bud = tvArriving(TV_FLOW.budAt + 0.01)!;
    expect(bud.u).toBe(0);
    expect(bud.scale).toBeLessThan(0.1);
    const risen = tvArriving(TV_FLOW.budAt + TV_FLOW.bud)!;
    expect(risen.scale).toBeCloseTo(TV_BUD_SCALE, 6);
    const rest = tvArriving(TV_FLOW_SETTLED)!;
    expect(rest.u).toBe(1);
    expect(rest.scale).toBe(1);
    expect(rest.opacity).toBe(1);
    // Never shrinks or turns back on its way.
    let last = { u: 0, scale: 0 };
    for (let t = TV_FLOW.budAt; t <= TV_FLOW_SETTLED + 1; t += 0.1) {
      const pose = tvArriving(t)!;
      expect(pose.u).toBeGreaterThanOrEqual(last.u);
      expect(pose.scale).toBeGreaterThanOrEqual(last.scale - 1e-9);
      last = { u: pose.u, scale: pose.scale };
    }
  });
  it("lifts off, floats up and away, fading, and is gone", () => {
    expect(tvLeaving(0)!.u).toBe(0);
    expect(tvLeaving(0)!.opacity).toBe(1);
    const late = tvLeaving(TV_FLOW.leaveAt + TV_FLOW.leave - 0.1)!;
    expect(late.u).toBeGreaterThan(0.95);
    expect(late.opacity).toBeLessThan(0.1);
    expect(tvLeaving(TV_FLOW.leaveAt + TV_FLOW.leave)).toBeNull();
  });
  it("is gone before the new one rests, so the two never share the resting place", () => {
    expect(TV_FLOW.leaveAt + TV_FLOW.leave).toBeLessThanOrEqual(TV_FLOW_SETTLED);
  });
});

describe("a bubble spot's swaps", () => {
  it("shows its first recognition at once, or rises with it when asked", () => {
    const still = new TvSwap();
    expect(still.want("a", 5, false)).toBe(false);
    expect(still.at).toBe(-Infinity);
    const rising = new TvSwap();
    expect(rising.want("a", 5, false, true)).toBe(true);
    expect(rising.at).toBe(5);
    expect(rising.previous).toBeUndefined();
  });
  it("sends the old one away as the new one comes, and forgets it once gone", () => {
    const swap = new TvSwap();
    swap.want("a", 0, false);
    expect(swap.want("b", 10, false)).toBe(true);
    expect(swap).toMatchObject({ current: "b", previous: "a", at: 10 });
    swap.settle(10 + TV_FLOW.leaveAt + TV_FLOW.leave - 0.01);
    expect(swap.previous).toBe("a");
    swap.settle(10 + TV_FLOW.leaveAt + TV_FLOW.leave);
    expect(swap.previous).toBeUndefined();
  });
  it("swaps without a journey in a still view or out of sight", () => {
    const swap = new TvSwap();
    swap.want("a", 0, false);
    expect(swap.want("b", 10, true)).toBe(false);
    expect(swap).toMatchObject({ current: "b", previous: undefined, at: -Infinity });
  });
  it("drops a leaving recognition that left the snapshot at once", () => {
    const swap = new TvSwap();
    swap.want("a", 0, false);
    swap.want("b", 10, false);
    swap.drop("a");
    expect(swap.previous).toBeUndefined();
  });
});

describe("which recognition flows", () => {
  const plan = planWorldBubbles(records(20));
  it("takes the place's next small record at every arrival, never the main one", () => {
    const small = plan.places.get("garden")!.small;
    expect(tvFlowRecord(plan, "garden", 0)).toBe(small[0]);
    expect(tvFlowRecord(plan, "garden", 1)).toBe(small[TV_STREAM_STEPS % small.length]);
    expect(tvFlowRecord(plan, "garden", 0, small[0].id)).toBe(small[1]);
  });
  it("turns along the River's stream within a visit, and at most a few times", () => {
    expect(tvStreamStep(undefined, 50)).toBe(0);
    expect(tvStreamStep(13, 0)).toBe(0);
    expect(tvStreamStep(13, 13)).toBe(1);
    expect(tvStreamStep(13, 1000)).toBe(TV_STREAM_STEPS - 1);
    const small = plan.places.get("live-feed")!.small;
    expect(tvFlowRecord(plan, "live-feed", 0, undefined, 1)).toBe(small[1 % small.length]);
  });
  it("shows none when the only recognition is the main one", () => {
    const one = planWorldBubbles(records(1));
    const main = one.places.get("garden")!.big[0];
    expect(tvFlowRecord(one, "garden", 0, main.id)).toBeUndefined();
    expect(tvFlowRecord(undefined, "garden", 0)).toBeUndefined();
  });
});

describe("every place's flow keeps clear of its main bubble", () => {
  // The main bubble's farthest reach: its expression medallions, round its rim.
  const mainReach = TV_MAIN_RADIUS * (1.36 + 0.205) * TV_MEDALLION_SCALE;
  for (const place of TOUR_ORDER) {
    it(`${place}: the flowing bubbles rise and leave without touching it, or each other`, () => {
      const world = tvPlaceWorld(place);
      const full = tvFlowRadius(place, TV_READ.flow.max) * 1.17;
      const rise = new TvRisePath(world.flow.lotus.clone().add(new T.Vector3(0, 0.55, 0)), world.flow.rest);
      const leave = new TvLeavePath(world.flow.rest, world.flow.away);
      const a = new T.Vector3(), b = new T.Vector3();
      for (let t = 0; t <= TV_FLOW_SETTLED + 1; t += 0.1) {
        const coming = tvArriving(t), going = tvLeaving(t);
        if (coming) {
          rise.at(coming.u, a);
          expect(a.distanceTo(world.main.centre) - full * coming.scale - mainReach, `${place} rising at ${t.toFixed(1)} s`).toBeGreaterThan(0);
        }
        if (going) {
          leave.at(going.u, b);
          expect(b.distanceTo(world.main.centre) - full * going.scale - mainReach, `${place} leaving at ${t.toFixed(1)} s`).toBeGreaterThan(0);
        }
        if (coming && going && going.opacity > 0.05)
          expect(a.distanceTo(b) - full * (coming.scale + going.scale), `${place} passing at ${t.toFixed(1)} s`).toBeGreaterThan(0);
      }
    });
    it(`${place}: the main bubble rises up its stem and leaves without touching the flowing bubble at rest`, () => {
      const world = tvPlaceWorld(place);
      const flowRim = tvFlowRadius(place, TV_READ.flow.max) * 1.17;
      const rise = new TvRisePath(world.main.lotus.clone().add(new T.Vector3(0, 0.55, 0)), world.main.centre);
      const leave = new TvLeavePath(world.main.centre, world.main.away);
      const p = new T.Vector3();
      for (let t = 0; t <= TV_FLOW_SETTLED + 1; t += 0.1) {
        const coming = tvArriving(t), going = tvLeaving(t);
        if (coming) expect(rise.at(coming.u, p).distanceTo(world.flow.rest) - flowRim - TV_MAIN_RADIUS * 1.17 * coming.scale, `${place} main rising at ${t.toFixed(1)} s`).toBeGreaterThan(0);
        if (going && going.opacity > 0.05) expect(leave.at(going.u, p).distanceTo(world.flow.rest) - flowRim - TV_MAIN_RADIUS * 1.17 * going.scale, `${place} main leaving at ${t.toFixed(1)} s`).toBeGreaterThan(0);
      }
    });
  }
});
