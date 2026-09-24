import * as T from "three";
import { describe, expect, it } from "vitest";
import {
  FINESSE_OFFSET_LIMIT,
  STUDY_FINESSE,
  StudyCameraFinesse,
  studyTravelEase,
  type FinesseInput,
} from "../../src/components/display/world/prototype/camera-finesse";
import {
  STUDY_MOOD,
  StudyMood,
  studyFlourish,
  studyHaze,
} from "../../src/components/display/world/prototype/study-mood";
import { resolveStudyTier } from "../../src/components/display/world/prototype/study-radiance";
import { smoothstep } from "../../src/components/display/world/world-data";

/**
 * Section 8 is the smooth half of the pass, and all of it is arithmetic: the camera finesse,
 * the mood envelope and the tier ladder are pure, so the whole of each is provable here
 * without a browser, a renderer or a WebGL context. What the harness captures then has to
 * show is only that it looks right, not that it is correct.
 */

const DEGREE = Math.PI / 180;

/** The pose the engine produces today, before the finesse runs: the exact identity to beat. */
function directorPose(position: T.Vector3, target: T.Vector3) {
  const camera = new T.PerspectiveCamera(43, 16 / 9, 0.1, 450);
  camera.position.copy(position);
  camera.lookAt(target);
  return camera;
}

function input(over: Partial<FinesseInput> = {}): FinesseInput {
  return {
    dt: 1 / 60,
    moving: true,
    traveling: false,
    arrivalPhase: "idle",
    reading: false,
    position: new T.Vector3(18, 9, 26),
    target: new T.Vector3(0, 5, 0),
    elapsed: 0,
    ...over,
  };
}

/**
 * Runs a finesse over a span of frames at a fixed step, reporting how far it ever moved the
 * eye from the director pose and how far it ever leaned.
 */
function drive(
  finesse: StudyCameraFinesse,
  camera: T.PerspectiveCamera,
  frames: number,
  step: number,
  startElapsed: number,
  shape: (frame: number, at: FinesseInput) => void,
) {
  let offset = 0;
  let roll = 0;
  let elapsed = startElapsed;
  for (let frame = 0; frame < frames; frame++) {
    elapsed += step;
    const at = input({ dt: step, elapsed });
    shape(frame, at);
    finesse.apply(camera, at);
    offset = Math.max(offset, camera.position.distanceTo(at.position));
    roll = Math.max(roll, Math.abs(finesse.rollRadians()));
  }
  return { offset, roll, elapsed };
}

describe("study camera finesse", () => {
  it("is exactly the director pose whenever the world is not moving", () => {
    const finesse = new StudyCameraFinesse();
    const camera = new T.PerspectiveCamera(43, 16 / 9, 0.1, 450);
    for (const at of [
      input({ moving: false, elapsed: 0 }),
      input({ moving: false, elapsed: 37.4 }),
      input({ moving: false, elapsed: 91.2, traveling: true }),
      input({ moving: false, elapsed: 5, arrivalPhase: "reading" }),
      input({ moving: false, elapsed: 5, reading: true }),
    ]) {
      finesse.apply(camera, at);
      const reference = directorPose(at.position, at.target);
      expect(camera.position.toArray()).toEqual(reference.position.toArray());
      expect(camera.quaternion.toArray()).toEqual(
        reference.quaternion.toArray(),
      );
      expect(finesse.rollRadians()).toBe(0);
    }
  });

  it("returns to the exact director pose on the first still frame after motion", () => {
    const finesse = new StudyCameraFinesse();
    const camera = new T.PerspectiveCamera(43, 16 / 9, 0.1, 450);
    drive(finesse, camera, 240, 1 / 60, 0, (frame, at) => {
      at.traveling = frame > 30 && frame < 150;
      at.target.set(Math.sin(frame / 40) * 30, 5, Math.cos(frame / 40) * 30);
    });
    const still = input({ moving: false, elapsed: 4 });
    finesse.apply(camera, still);
    const reference = directorPose(still.position, still.target);
    expect(camera.position.toArray()).toEqual(reference.position.toArray());
    expect(camera.quaternion.toArray()).toEqual(reference.quaternion.toArray());
  });

  it("never moves the eye more than .6 units or leans more than a degree and a half", () => {
    const finesse = new StudyCameraFinesse();
    const camera = new T.PerspectiveCamera(43, 16 / 9, 0.1, 450);
    // A long tour with repeated departures and arrivals, and a target swinging hard enough
    // that the roll saturates, which is where a missing clamp would show.
    const run = drive(finesse, camera, 3600, 1 / 60, 0, (frame, at) => {
      at.traveling = frame % 600 < 240;
      at.reading = frame % 600 > 400;
      at.target.set(
        Math.sin(frame / 25) * 40,
        4 + Math.sin(frame / 90) * 3,
        Math.cos(frame / 25) * 40,
      );
      at.position.set(
        22 + Math.sin(frame / 300) * 8,
        9,
        26 + Math.cos(frame / 300) * 8,
      );
    });
    expect(run.offset).toBeLessThan(0.6);
    expect(run.offset).toBeLessThanOrEqual(FINESSE_OFFSET_LIMIT + 1e-9);
    expect(run.roll).toBeLessThanOrEqual(STUDY_FINESSE.rollLimit + 1e-12);
    expect(run.roll / DEGREE).toBeLessThanOrEqual(1.5 + 1e-9);
    // The bounds are not vacuous: this run really does use most of them.
    expect(run.offset).toBeGreaterThan(0.4);
    expect(run.roll / DEGREE).toBeGreaterThan(1);
  });

  it("holds the tighter lean and the halved breath while an entrance is running", () => {
    const finesse = new StudyCameraFinesse();
    const camera = new T.PerspectiveCamera(43, 16 / 9, 0.1, 450);
    const run = drive(finesse, camera, 1800, 1 / 60, 0, (frame, at) => {
      at.arrivalPhase = "reveal";
      at.traveling = frame % 300 < 120;
      at.target.set(Math.sin(frame / 25) * 40, 5, Math.cos(frame / 25) * 40);
    });
    expect(run.roll).toBeLessThanOrEqual(STUDY_FINESSE.arrivalRollLimit + 1e-12);
    expect(run.roll / DEGREE).toBeLessThanOrEqual(0.8 + 1e-9);
    // Half the breath plus the whole anticipation, which is the entrance bound.
    expect(run.offset).toBeLessThanOrEqual(
      Math.hypot(
        STUDY_FINESSE.dollyForward / 2 - STUDY_FINESSE.anticipation,
        STUDY_FINESSE.dollyUp / 2,
      ) + 1e-9,
    );
  });

  it("settles within four seconds of a travel ending", () => {
    const camera = new T.PerspectiveCamera(43, 16 / 9, 0.1, 450);
    const settled = new T.PerspectiveCamera(43, 16 / 9, 0.1, 450);
    // One finesse comes off a long turning travel; the other has been parked the whole time.
    // With the same clock, the same pose and the same aim, the transient is the only thing
    // between them, so how fast they agree is exactly how fast the settle dies.
    const traveled = new StudyCameraFinesse();
    const parked = new StudyCameraFinesse();
    let elapsed = 0;
    const target = new T.Vector3(0, 5, 0);
    const position = new T.Vector3(18, 9, 26);
    for (let frame = 0; frame < 300; frame++) {
      elapsed += 1 / 60;
      // A director's own look path converges on the destination's aim, so the last second of
      // the travel already looks where the parked camera looks. Only the settle is left.
      const swing = new T.Vector3(
        Math.sin(frame / 30) * 30,
        5,
        Math.cos(frame / 30) * 30,
      );
      traveled.apply(
        camera,
        input({
          dt: 1 / 60,
          elapsed,
          traveling: true,
          target: target.clone().lerp(swing, Math.max(0, 1 - frame / 240)),
        }),
      );
      parked.apply(settled, input({ dt: 1 / 60, elapsed, position, target }));
    }
    let apart = 0;
    for (let frame = 0; frame < 240; frame++) {
      elapsed += 1 / 60;
      const at = input({ dt: 1 / 60, elapsed, position, target });
      traveled.apply(camera, at);
      parked.apply(settled, input({ dt: 1 / 60, elapsed, position, target }));
      apart = camera.position.distanceTo(settled.position);
    }
    expect(apart).toBeLessThan(1e-3);
    // A tenth of a degree is two orders of magnitude below the clamp and far below anything
    // a viewer could see; what is left at four seconds is the tail of the aim lag, not the
    // settle, which by then has decayed to about a ten thousandth of a unit.
    expect(Math.abs(traveled.rollRadians() - parked.rollRadians())).toBeLessThan(
      DEGREE / 10,
    );
    expect(camera.quaternion.angleTo(settled.quaternion)).toBeLessThan(1e-3);
  });

  it("is deterministic: the same frames give the same poses every time", () => {
    const shape = (frame: number, at: FinesseInput) => {
      at.traveling = frame % 400 < 160;
      at.arrivalPhase = frame > 700 ? "approach" : "idle";
      at.reading = frame % 400 > 300;
      at.target.set(Math.sin(frame / 31) * 35, 5, Math.cos(frame / 31) * 35);
    };
    const poses = [0, 1].map(() => {
      const finesse = new StudyCameraFinesse();
      const camera = new T.PerspectiveCamera(43, 16 / 9, 0.1, 450);
      const samples: number[] = [];
      let elapsed = 0;
      for (let frame = 0; frame < 900; frame++) {
        elapsed += 1 / 60;
        const at = input({ dt: 1 / 60, elapsed });
        shape(frame, at);
        finesse.apply(camera, at);
        if (frame % 45 === 0)
          samples.push(
            ...camera.position.toArray(),
            ...camera.quaternion.toArray(),
          );
      }
      return samples;
    });
    expect(poses[0]).toEqual(poses[1]);
    expect(poses[0].every(Number.isFinite)).toBe(true);
  });

  it("aims steadily enough while reading that the pearl does not drift about", () => {
    // The reading lag is more than twice the travelling one, so over the same swing of the
    // director's aim the finesse follows less than half as far.
    const target = new T.Vector3(0, 5, 0);
    const moved = new T.Vector3(6, 5, 0);
    const trailed = [false, true].map((reading) => {
      const finesse = new StudyCameraFinesse();
      const camera = new T.PerspectiveCamera(43, 16 / 9, 0.1, 450);
      finesse.apply(camera, input({ dt: 1 / 60, target, reading }));
      for (let frame = 0; frame < 30; frame++)
        finesse.apply(camera, input({ dt: 1 / 60, target: moved, reading }));
      return camera.quaternion.angleTo(
        directorPose(input().position, target).quaternion,
      );
    });
    expect(trailed[1]).toBeLessThan(trailed[0] * 0.55);
  });

  it("paces a travel more gently than the app default while agreeing at both ends", () => {
    expect(studyTravelEase(0)).toBe(0);
    expect(studyTravelEase(1)).toBe(1);
    expect(studyTravelEase(0.5)).toBeCloseTo(0.5, 12);
    expect(studyTravelEase(-3)).toBe(0);
    expect(studyTravelEase(4)).toBe(1);
    // Slower away from a place and slower into the next one, faster through the middle.
    expect(studyTravelEase(0.25)).toBeLessThan(smoothstep(0.25));
    expect(studyTravelEase(0.75)).toBeGreaterThan(smoothstep(0.75));
  });
});

describe("study mood envelope", () => {
  it("reads the arrival flourish from its table", () => {
    const table: Array<[number, number]> = [
      [-1, 0],
      [0, 0],
      [0.5, STUDY_MOOD.flourish * 0.5],
      [1, STUDY_MOOD.flourish],
      [2.5, STUDY_MOOD.flourish * 0.5],
      [4, 0],
      [9, 0],
    ];
    for (const [age, expected] of table)
      expect(studyFlourish(age)).toBeCloseTo(expected, 10);
    // It only ever adds light, and never more than it says it does.
    for (let age = -1; age < 6; age += 0.05) {
      expect(studyFlourish(age)).toBeGreaterThanOrEqual(0);
      expect(studyFlourish(age)).toBeLessThanOrEqual(STUDY_MOOD.flourish);
    }
  });

  it("freezes at the parked values whenever the world is not moving", () => {
    const mood = new StudyMood();
    for (let frame = 0; frame < 300; frame++)
      mood.update({
        dt: 1 / 60,
        moving: true,
        traveling: true,
        arrivalPhase: "approach",
      });
    expect(mood.exposure).toBeLessThan(1);
    mood.update({
      dt: 1 / 60,
      moving: false,
      traveling: true,
      arrivalPhase: "approach",
    });
    expect(mood.exposure).toBe(STUDY_MOOD.parked);
    expect(mood.travel).toBe(0);
    expect(mood.hush).toBe(0);
    expect(studyHaze(mood.travel)).toEqual({ near: 22, far: 250 });
  });

  it("dips through a travel, dips further on an approach and comes back parked", () => {
    const mood = new StudyMood();
    const run = (seconds: number, over: { traveling?: boolean; arrivalPhase?: string }) => {
      for (let frame = 0; frame < Math.round(seconds * 60); frame++)
        mood.update({
          dt: 1 / 60,
          moving: true,
          traveling: false,
          arrivalPhase: "idle",
          ...over,
        });
      return mood.exposure;
    };
    const traveling = run(6, { traveling: true });
    expect(traveling).toBeCloseTo(STUDY_MOOD.traveling, 2);
    expect(mood.travel).toBeCloseTo(1, 2);
    const approaching = run(6, { arrivalPhase: "approach" });
    expect(approaching).toBeCloseTo(STUDY_MOOD.approach, 2);
    expect(approaching).toBeLessThan(traveling);
    expect(mood.hush).toBeCloseTo(1, 1);
    expect(run(8, {})).toBeCloseTo(STUDY_MOOD.parked, 3);
    expect(mood.travel).toBeCloseTo(0, 3);
    expect(mood.hush).toBeCloseTo(0, 2);
  });

  it("flourishes when an entrance becomes readable and lets the hush go over three seconds", () => {
    const mood = new StudyMood();
    const step = (arrivalPhase: string) =>
      mood.update({ dt: 1 / 60, moving: true, traveling: false, arrivalPhase });
    for (let frame = 0; frame < 300; frame++) step("approach");
    for (let frame = 0; frame < 300; frame++) step("reveal");
    const hushed = mood.hush;
    expect(hushed).toBeGreaterThan(0.95);
    let peak = 0;
    for (let frame = 0; frame < 60; frame++) {
      step("reading");
      peak = Math.max(peak, mood.exposure);
    }
    // The flourish is the only thing that can carry the envelope above parked.
    expect(peak).toBeGreaterThan(STUDY_MOOD.parked);
    expect(peak).toBeLessThanOrEqual(
      STUDY_MOOD.parked + STUDY_MOOD.flourish + 1e-9,
    );
    for (let frame = 0; frame < 180; frame++) step("reading");
    expect(mood.hush).toBeLessThan(0.05);
    for (let frame = 0; frame < 300; frame++) step("reading");
    expect(mood.exposure).toBeCloseTo(STUDY_MOOD.parked, 3);
    expect(mood.hush).toBeCloseTo(0, 3);
  });

  it("draws the haze in over a travel and never past its authored ends", () => {
    expect(studyHaze(0)).toEqual({ near: 22, far: 250 });
    expect(studyHaze(1)).toEqual({
      near: STUDY_MOOD.travelFogNear,
      far: STUDY_MOOD.travelFogFar,
    });
    expect(studyHaze(0.5)).toEqual({ near: 20, far: 232.5 });
    expect(studyHaze(-4)).toEqual({ near: 22, far: 250 });
    expect(studyHaze(9)).toEqual({
      near: STUDY_MOOD.travelFogNear,
      far: STUDY_MOOD.travelFogFar,
    });
    const out = { near: 0, far: 0 };
    expect(studyHaze(0.25, out)).toBe(out);
  });

  it("pales a resident exactly as far as the hush, and no further", () => {
    for (const hush of [0, 0.5, 1]) {
      const opacity = STUDY_MOOD.residentOpacity - STUDY_MOOD.residentHush * hush;
      expect(opacity).toBeGreaterThanOrEqual(0.78);
      expect(opacity).toBeLessThanOrEqual(0.9);
    }
  });
});

describe("study picture quality tier", () => {
  it("resolves every combination the engine can be in", () => {
    const table: Array<[string, boolean, string]> = [
      ["high", false, "high"],
      ["high", true, "high"],
      ["auto", false, "auto"],
      ["auto", true, "low"],
      ["low", false, "low"],
      ["low", true, "low"],
    ];
    for (const [quality, lowered, expected] of table)
      expect(resolveStudyTier(quality, lowered)).toBe(expected);
  });
  it("gives an explicit Low and a lowered Auto exactly the same work", () => {
    expect(resolveStudyTier("auto", true)).toBe(resolveStudyTier("low", false));
  });
});
