import { describe, expect, it } from "vitest";
import {
  NEIGHBOR_ABSORBED_AT,
  NEIGHBOR_BEATS,
  NEIGHBOR_CLIPS,
  NEIGHBOR_CYCLE_SECONDS,
  NEIGHBOR_EXPRESSION_GESTURES,
  NEIGHBOR_HANDOFF_AT,
  NEIGHBOR_HEART_START,
  NEIGHBOR_STAGE_SECONDS,
  legacyNeighborDialogue,
  neighborDialogue,
  neighborGesture,
  neighborMotion,
  neighborSchedule,
  neighborStage,
  neighborWords,
} from "@/components/display/world/neighbor-dialogue";
import { WORLD_EXPRESSIONS, ZONES } from "@/components/display/world/world-data";

/** The world time at which zone `index` is `age` seconds into its meet. */
function meetTime(index: number, age: number) {
  // neighborStage: phase = time * .12 + pi / 2 + index * .21, and the meet starts at acos(.08).
  const start = (Math.acos(0.08) - Math.PI / 2 - index * 0.21) / 0.12;
  const cycle = NEIGHBOR_CYCLE_SECONDS;
  return ((start + age) % cycle + cycle) % cycle;
}

describe("the neighbor schedule (Plan 26 K4, WORLD-INTEGRATION 5.2)", () => {
  it("runs on neighborMotion's own 52.36 s cycle, split 12.42, 27.51, 12.42", () => {
    expect(NEIGHBOR_CYCLE_SECONDS).toBeCloseTo(52.36, 2);
    expect(NEIGHBOR_STAGE_SECONDS.approach).toBeCloseTo(12.42, 2);
    expect(NEIGHBOR_STAGE_SECONDS.meet).toBeCloseTo(27.515, 2);
    expect(NEIGHBOR_STAGE_SECONDS.part).toBeCloseTo(12.42, 2);
    expect(NEIGHBOR_STAGE_SECONDS.approach + NEIGHBOR_STAGE_SECONDS.meet + NEIGHBOR_STAGE_SECONDS.part).toBeCloseTo(NEIGHBOR_CYCLE_SECONDS, 9);
  });

  it("maps every second of the cycle, for every zone, to exactly one beat", () => {
    for (const [index] of ZONES.entries()) {
      const seen = new Set<number>();
      // Every whole second, and a finer sweep so no row can hide between two seconds.
      for (let tenth = 0; tenth < Math.ceil(NEIGHBOR_CYCLE_SECONDS * 10); tenth++) {
        const time = tenth / 10;
        const beat = neighborSchedule(time, index);
        const matches = NEIGHBOR_BEATS.filter((row, i) => {
          const next = NEIGHBOR_BEATS[i + 1];
          const end = next && next.stage === row.stage ? next.start : NEIGHBOR_STAGE_SECONDS[row.stage];
          return row.stage === beat.stage && beat.age >= row.start && beat.age < end + 1e-9;
        });
        expect(matches).toHaveLength(1);
        expect(NEIGHBOR_BEATS[beat.beat]).toBe(matches[0]);
        expect(beat.beatAge).toBeGreaterThanOrEqual(0);
        expect(beat.beatAge).toBeLessThanOrEqual(beat.beatLength + 1e-9);
        seen.add(beat.beat);
      }
      // A full cycle passes through every row of the table.
      expect(seen.size).toBe(NEIGHBOR_BEATS.length);
    }
  });

  it("walks exactly when the legacy motion walks, and stands for the whole meet", () => {
    for (let index = 0; index < ZONES.length; index++) {
      for (let time = 0.05; time < NEIGHBOR_CYCLE_SECONDS * 2; time += 0.25) {
        const { stage } = neighborStage(time, index);
        expect(stage === "meet").toBe(!neighborMotion(time, index).walking);
      }
    }
  });

  it("contiguous rows that start at zero and cover each stage to its end", () => {
    for (const stage of ["approach", "meet", "part"] as const) {
      const rows = NEIGHBOR_BEATS.filter(row => row.stage === stage);
      expect(rows[0].start).toBe(0);
      for (let i = 1; i < rows.length; i++) expect(rows[i].start).toBeGreaterThan(rows[i - 1].start);
      expect(rows.at(-1)!.start).toBeLessThan(NEIGHBOR_STAGE_SECONDS[stage]);
    }
  });

  it("plays only the thirteen clips the rigs carry", () => {
    for (let index = 0; index < ZONES.length; index++) {
      for (let time = 0; time < NEIGHBOR_CYCLE_SECONDS; time += 0.5) {
        const beat = neighborSchedule(time, index);
        for (const clip of [...beat.acts, ...beat.previous]) expect(NEIGHBOR_CLIPS).toContain(clip);
      }
    }
  });

  it("follows the design's meet table, the heart clips starting together at 15.5 s", () => {
    const index = 4; // featured: expression 5, "Please, after you.", an even zone
    const at = (age: number) => neighborSchedule(meetTime(index, age), index);
    expect(at(0.7)).toMatchObject({ stage: "meet", acts: ["idle", "idle"], card: null, heart: "none", speaker: null });
    expect(at(3)).toMatchObject({ acts: ["talk", "listen"], card: "greeting", speaker: 0, gesture: "talk" });
    expect(at(6)).toMatchObject({ acts: ["after_you", "idle"], card: "greeting", speaker: 0, gesture: "after_you" });
    expect(at(10)).toMatchObject({ acts: ["listen", "talk"], card: "response", speaker: 1, gesture: "talk" });
    expect(at(13)).toMatchObject({ acts: ["idle", "cheer"], card: "response", speaker: 1, gesture: "cheer" });
    expect(at(16)).toMatchObject({ acts: ["give_heart", "receive_heart"], card: null, heart: "giving", speaker: 0, gesture: "give_heart" });
    expect(at(18)).toMatchObject({ acts: ["give_heart", "receive_heart"], card: null, heart: "handed" });
    expect(at(20)).toMatchObject({ acts: ["idle", "idle"], card: null, heart: "floating" });
    expect(at(26)).toMatchObject({ acts: ["wave", "wave"], card: null, heart: "floating" });
    // An odd zone thanks with a bow.
    expect(neighborSchedule(meetTime(1, 13), 1).acts).toEqual(["idle", "bow"]);
  });

  it("hands the heart over at 15.5 + handoffAt, and floats it once it is taken to heart", () => {
    for (const handoffAt of [NEIGHBOR_HANDOFF_AT, 2.4]) {
      for (let index = 0; index < ZONES.length; index++) {
        // Walk the meet in 10 ms steps and find the first handed and the first floating second.
        let handed: number | null = null, floating: number | null = null;
        for (let step = 0; step <= Math.floor(NEIGHBOR_STAGE_SECONDS.meet * 100); step++) {
          const age = step / 100;
          const beat = neighborSchedule(meetTime(index, age), index, handoffAt);
          expect(beat.stage).toBe("meet");
          if (handed === null && beat.heart === "handed") handed = beat.age;
          if (floating === null && beat.heart === "floating") floating = beat.age;
          if (age < NEIGHBOR_HEART_START - 0.01) expect(beat.heart).toBe("none");
        }
        expect(handed).toBeCloseTo(NEIGHBOR_HEART_START + handoffAt, 1);
        expect(floating).toBeCloseTo(NEIGHBOR_HEART_START + NEIGHBOR_ABSORBED_AT, 1);
      }
    }
    // The default is the studio manifest's hand over: 1.8 s into both heart clips.
    expect(NEIGHBOR_HANDOFF_AT).toBe(1.8);
    expect(NEIGHBOR_HEART_START + NEIGHBOR_HANDOFF_AT).toBeCloseTo(17.3, 9);
    // Exactly on the second of the hand over, and a hair before it.
    expect(neighborSchedule(meetTime(0, 17.3 + 1e-6), 0).heart).toBe("handed");
    expect(neighborSchedule(meetTime(0, 17.3 - 1e-3), 0).heart).toBe("giving");
  });

  it("speaks each zone's canonical expression, gesture and thanks", () => {
    expect(NEIGHBOR_EXPRESSION_GESTURES).toEqual(["wave", "bow", "comfort", "comfort", "after_you", "listen", "encourage", "offer_hand", "cheer"]);
    ZONES.forEach((zone, index) => {
      expect(neighborGesture(index)).toBe(NEIGHBOR_EXPRESSION_GESTURES[index % 9]);
      expect(neighborWords(index).greeting).toBe(WORLD_EXPRESSIONS[index % 9].phrase);
      expect(neighborSchedule(meetTime(index, 6), index).acts[0]).toBe(NEIGHBOR_EXPRESSION_GESTURES[index % 9]);
      expect(neighborSchedule(meetTime(index, 13), index).acts[1]).toBe(index % 2 ? "bow" : "cheer");
    });
  });

  it("neighborDialogue equals the card the schedule shows, for every zone and moment", () => {
    for (const [index, zone] of ZONES.entries()) {
      const words = neighborWords(index);
      for (let time = 0; time < NEIGHBOR_CYCLE_SECONDS; time += 0.1) {
        const { card } = neighborSchedule(time, index);
        const expected = card === "greeting" ? words.greeting : card === "response" ? words.response : null;
        expect(neighborDialogue(time, zone.id)).toBe(expected);
        // An arrival takes the stage: no card and no dialogue.
        expect(neighborDialogue(time, zone.id, true)).toBeNull();
      }
    }
  });

  it("reads the canonical phrase three seconds into a meet", () => {
    for (const [index, zone] of ZONES.entries()) {
      const time = meetTime(index, 3);
      expect(neighborSchedule(time, index)).toMatchObject({ stage: "meet", card: "greeting", acts: ["talk", "listen"] });
      expect(neighborDialogue(time, zone.id)).toBe(WORLD_EXPRESSIONS[index % 9].phrase);
    }
    // The Garden opens .667 s into its meet, so 2.333 s of clock is three seconds in: "How Are You?".
    expect(neighborSchedule(0, 0)).toMatchObject({ stage: "meet" });
    expect(neighborSchedule(0, 0).age).toBeCloseTo(0.667, 3);
    expect(meetTime(0, 3)).toBeCloseTo(2.333, 3);
    expect(neighborDialogue(meetTime(0, 3), "garden")).toBe("How Are You?");
  });

  it("is pure: the same clock gives the same beat", () => {
    for (const time of [0, 3.7, 17.3, 44.44, 1000.5]) {
      expect(neighborSchedule(time, 3)).toEqual(neighborSchedule(time, 3));
      expect(neighborSchedule(time + NEIGHBOR_CYCLE_SECONDS, 3).beat).toBe(neighborSchedule(time, 3).beat);
    }
  });

  it("leaves the classic and cinematic sentence on the rule their own cards follow", () => {
    for (const [index, zone] of ZONES.entries()) {
      for (let time = 0; time < 60; time += 0.37) {
        const words = neighborWords(index);
        const expected = neighborMotion(time, index).walking ? null : Math.sin(time * 0.4) >= 0 ? words.greeting : words.response;
        expect(legacyNeighborDialogue(time, zone.id)).toBe(expected);
        expect(legacyNeighborDialogue(time, zone.id, true)).toBeNull();
      }
    }
  });
});
