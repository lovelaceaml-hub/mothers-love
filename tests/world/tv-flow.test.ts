import * as T from "three";
import { describe, expect, it } from "vitest";
import type { Recognition } from "@/lib/contracts";
import { TOUR_ORDER } from "@/components/display/world/world-data";
import { heldBig, planWorldBubbles } from "@/components/display/world/prototype/tv-page";
import { TV_MAIN_RADIUS, TV_MEDALLION_SCALE, TV_PLACES, TV_READ, tvFlowRadius, tvPlaceWorld } from "@/components/display/world/prototype/tv-places";
import {
  TV_BUD_SCALE,
  TV_FLOW,
  TV_FLOW_SETTLED,
  TV_FLOW_MAX_GRAPHEMES,
  TV_STREAM_STEPS,
  TvFlowTurn,
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
  it("lets a new recognition wait for the journey under way", () => {
    const swap = new TvSwap();
    swap.want("a", 0, false);
    swap.want("b", 10, false);
    expect(swap.busy(10 + TV_FLOW_SETTLED - 0.1)).toBe(true);
    expect(swap.busy(10 + TV_FLOW_SETTLED)).toBe(false);
  });
  it("lets the showing recognition go at once, and a still view end a journey where it was going", () => {
    const swap = new TvSwap();
    swap.want("a", 0, false);
    swap.want("b", 10, false);
    swap.vanish();
    expect(swap).toMatchObject({ current: undefined, at: -Infinity });
    swap.want("c", 20, false);
    swap.settleNow();
    expect(swap).toMatchObject({ current: "c", previous: undefined, at: -Infinity });
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
  it("takes the place's small records one after another, never the main one", () => {
    const small = plan.places.get("garden")!.small;
    expect(tvFlowRecord(plan, "garden", 0)).toBe(small[0]);
    expect(tvFlowRecord(plan, "garden", 1)).toBe(small[1]);
    expect(tvFlowRecord(plan, "garden", 0, small[0].id)).toBe(small[1]);
  });
  for (const count of [3, 6, 8, 10, 100])
    it(`lets every small record flow within one round of turns (${count} records)`, () => {
      const counted = planWorldBubbles(records(count));
      const small = counted.places.get("garden")!.small;
      const main = heldBig(counted, "garden", 0)!;
      const shown = new Set(Array.from({ length: small.length }, (_, turn) => tvFlowRecord(counted, "garden", turn, main.id)?.id));
      const expected = new Set(small.map((record) => record.id).filter((id) => id !== main.id));
      expect(shown).toEqual(expected);
    });
  it("leaves a message too long for a flowing turn to the main bubble and the ticker", () => {
    const long = records(6).map((record, i) => (i === 3 ? { ...record, message: "kind words ".repeat(20) } : record));
    const counted = planWorldBubbles(long);
    // It is among the places' small records, and flows at none of them.
    expect(TOUR_ORDER.some((place) => counted.places.get(place)!.small.some((record) => record.message.length > TV_FLOW_MAX_GRAPHEMES))).toBe(true);
    for (const place of TOUR_ORDER)
      for (let turn = 0; turn < 12; turn++) expect(tvFlowRecord(counted, place, turn)?.message.length ?? 0).toBeLessThanOrEqual(TV_FLOW_MAX_GRAPHEMES);
  });
  it("shows none when the only recognition is the main one", () => {
    const one = planWorldBubbles(records(1));
    const main = one.places.get("garden")!.big[0];
    expect(tvFlowRecord(one, "garden", 0, main.id)).toBeUndefined();
    expect(tvFlowRecord(undefined, "garden", 0)).toBeUndefined();
  });
});

describe("a place's flowing turns", () => {
  it("turns once at every arrival", () => {
    const turns = new TvFlowTurn();
    expect(turns.update(1, true, 0)).toBe(1);
    expect(turns.update(1, true, 30)).toBe(1);
    expect(turns.update(2, true, 0)).toBe(2);
    expect(turns.update(2, false, 0)).toBe(2);
  });
  it("turns along the River's stream only forward, and only while the new one can still be read", () => {
    const stream = TV_PLACES["live-feed"].stream!;
    const turns = new TvFlowTurn();
    expect(turns.update(1, true, 0, stream)).toBe(1);
    expect(turns.update(1, true, stream.every, stream)).toBe(2);
    // The next step would come to rest after the camera pulls back, so it waits for the next visit.
    expect(turns.update(1, true, stream.every * 2, stream)).toBe(2);
    // The camera leaves: the reading age starts again, and the stream does not go back.
    expect(turns.update(1, true, 0, stream)).toBe(2);
    expect(turns.update(2, true, 0, stream)).toBe(3);
    expect(tvStreamStep(undefined, 50)).toBe(0);
    expect(tvStreamStep(13, 1000)).toBe(TV_STREAM_STEPS - 1);
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
