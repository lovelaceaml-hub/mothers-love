import { describe, expect, it } from "vitest";
import { ArrivalDirector, type ArrivalPhase } from "../../src/components/display/world/arrival-director";
import { arrivalPose } from "../../src/components/display/world/prototype/arrival-choreography";
import { sampleWorldFeed } from "../../src/components/display/world/world-feed";

function state(phase: ArrivalPhase, progress: number) {
  return { phase, id: "sample", age: 0, progress, waveIndex: 1, waveSize: 1 };
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
