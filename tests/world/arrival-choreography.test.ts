import { describe, expect, it } from "vitest";
import { ArrivalDirector, type ArrivalPhase } from "../../src/components/display/world/arrival-director";
import {
  ARRIVAL_STYLE_CYCLE,
  arrivalAdmitted,
  arrivalPose,
  arrivalStyleAt,
  bloomFraction,
} from "../../src/components/display/world/prototype/arrival-choreography";
import { sampleWorldFeed } from "../../src/components/display/world/world-feed";

function state(phase: ArrivalPhase, progress: number) {
  return { phase, id: "sample", age: 0, progress, waveIndex: 1, waveSize: 1 };
}
function smoothstep(t: number) {
  const n = Math.max(0, Math.min(1, t));
  return n * n * (3 - 2 * n);
}

describe("arrival choreography", () => {
  it.each([
    ["idle", 0, { active: false, gather: 0, form: 0, dissolve: 1, calm: false, presence: 0 }],
    ["approach", .5, { active: true, gather: .5, form: 0, dissolve: 0, calm: false, presence: .5 }],
    ["approach", 1, { active: true, gather: 1, form: 0, dissolve: 0, calm: false, presence: 1 }],
    ["reveal", 0, { active: true, gather: 1, form: 0, dissolve: 0, calm: false, presence: 1 }],
    ["reveal", 1, { active: true, gather: 1, form: 1, dissolve: 0, calm: false, presence: 1 }],
    ["reading", 0, { active: true, gather: 1, form: 1, dissolve: 0, calm: true, presence: 1 }],
    ["settle", .5, { active: true, gather: 1, form: 1, dissolve: .5, calm: false, presence: .5 }],
    ["settle", 1, { active: true, gather: 1, form: 1, dissolve: 1, calm: false, presence: 0 }],
    ["return", .5, { active: false, gather: 0, form: 0, dissolve: 1, calm: false, presence: 0 }],
  ] as const)("%s at %s", (phase, progress, expected) => {
    expect(arrivalPose(state(phase, progress))).toEqual(expected);
  });

  it("treats a missing arrival as resting", () => {
    expect(arrivalPose(undefined).active).toBe(false);
    expect(arrivalPose(null).form).toBe(0);
  });

  it("never leaves the formation unfinished once the director is reading", () => {
    const records = sampleWorldFeed().records;
    const director = new ArrivalDirector();
    director.enqueue([records[0].id]);
    let current = director.update(1, records, true, 24, true);
    for (let n = 0; n < 5 && current.phase !== "reading"; n++) {
      current = director.update(1, records, true, 24, true);
    }
    expect(current.phase).toBe("reading");
    const pose = arrivalPose(current);
    expect(pose.form).toBe(1);
    expect(pose.gather).toBe(1);
    expect(pose.dissolve).toBe(0);
    expect(pose.calm).toBe(true);
  });

  it("completes the formation before reading begins", () => {
    const records = sampleWorldFeed().records;
    const director = new ArrivalDirector();
    director.enqueue([records[0].id]);
    let reading = false;
    for (let n = 0; n < 40 && !reading; n++) {
      const current = director.update(.5, records, true, 24, false);
      if (current.phase === "reading") reading = true;
      else if (current.phase === "reveal" && current.progress === 1) {
        expect(arrivalPose(current).form).toBe(1);
      }
    }
    expect(reading).toBe(true);
  });
});

describe("lotus bloom fraction (WORLD-INTEGRATION 4.2)", () => {
  it.each([
    ["idle", 0, 0],
    ["approach", 0, 0],
    ["approach", .5, 0],
    ["approach", 1, 0],
    ["reveal", 0, 0],
    ["reveal", .25, smoothstep(.25)],
    ["reveal", .5, smoothstep(.5)],
    ["reveal", .75, smoothstep(.75)],
    ["reveal", 1, 1],
    ["reading", 0, 1],
    ["reading", .5, 1],
    ["settle", 0, 1],
    ["settle", .5, 1],
    ["settle", 1, 1],
    ["return", .5, 0],
  ] as const)("%s at %s scrubs the clip to %s", (phase, progress, fraction) => {
    expect(bloomFraction(arrivalPose(state(phase, progress)))).toBeCloseTo(fraction, 10);
  });

  it("is 0 through the whole approach, smoothstep through the reveal, 1 through reading and settle on the real director", () => {
    const records = sampleWorldFeed().records;
    const director = new ArrivalDirector();
    director.enqueue([records[0].id]);
    let sawReveal = false, sawSettle = false;
    for (let n = 0; n < 400; n++) {
      const current = director.update(.25, records, true, 24, false);
      const fraction = bloomFraction(arrivalPose(current));
      if (current.phase === "approach") expect(fraction).toBe(0);
      else if (current.phase === "reveal") { sawReveal = true; expect(fraction).toBeCloseTo(smoothstep(current.progress), 10); }
      else if (current.phase === "reading" || current.phase === "settle") { if (current.phase === "settle") sawSettle = true; expect(fraction).toBe(1); }
      if (current.phase === "return") break;
    }
    expect(sawReveal && sawSettle).toBe(true);
  });

  it("shows the open flower on a reduced motion first frame", () => {
    const records = sampleWorldFeed().records;
    const director = new ArrivalDirector();
    director.enqueue([records[0].id]);
    const first = director.update(.016, records, true, 24, true);
    expect(first.phase).toBe("reading");
    expect(bloomFraction(arrivalPose(first))).toBe(1);
  });
});

describe("style cycling for live (WORLD-INTEGRATION 4.6)", () => {
  it("takes the three studies in turn, the pearl formation first", () => {
    expect(ARRIVAL_STYLE_CYCLE).toEqual(["constellation", "bloom", "ribbon"]);
    expect([0, 1, 2, 3, 4, 5].map(arrivalStyleAt)).toEqual(["constellation", "bloom", "ribbon", "constellation", "bloom", "ribbon"]);
    expect(arrivalStyleAt(-1)).toBe("ribbon");
    expect(arrivalStyleAt(Number.NaN)).toBe("constellation");
  });

  it("only the idle edge admits an arrival", () => {
    expect(arrivalAdmitted("idle", "approach")).toBe(true);
    expect(arrivalAdmitted("idle", "reading")).toBe(true);
    expect(arrivalAdmitted("idle", "idle")).toBe(false);
    expect(arrivalAdmitted("approach", "reveal")).toBe(false);
    expect(arrivalAdmitted("reading", "reading")).toBe(false);
    expect(arrivalAdmitted("return", "idle")).toBe(false);
  });

  it("reaction refreshes and reconnects never cross the edge, so the cycle never advances for them", () => {
    const records = sampleWorldFeed().records;
    const director = new ArrivalDirector();
    let admitted = 0, before = director.state().phase;
    const step = (delta: number, list = records) => {
      const after = director.update(delta, list, true, 24, false).phase;
      if (arrivalAdmitted(before, after)) admitted++;
      before = after;
    };
    // One live arrival is admitted and read.
    director.enqueue([records[0].id]);
    for (let n = 0; n < 60; n++) step(.25);
    expect(before).toBe("reading");
    expect(admitted).toBe(1);
    // A reaction refresh: the same records with a changed heart count, polled again and again.
    const refreshed = records.map((record, index) => index === 0 ? { ...record, hearts: 42 } : record);
    for (let n = 0; n < 20; n++) step(.25, refreshed as typeof records);
    expect(before).toBe("reading");
    expect(admitted).toBe(1);
    // A reconnect: the feed re-enqueues what it already handed over; the director ignores ids in flight.
    director.enqueue([records[0].id]);
    for (let n = 0; n < 20; n++) step(.25);
    expect(before).toBe("reading");
    expect(admitted).toBe(1);
    // Only a genuinely new arrival, after this one returns, admits again.
    director.enqueue([records[1].id]);
    for (let n = 0; n < 400 && admitted < 2; n++) step(.25);
    expect(admitted).toBe(2);
    expect(arrivalStyleAt(admitted - 1)).toBe("bloom");
  });
});
