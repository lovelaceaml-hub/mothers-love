import { smoothstep } from "../world-data";
import { STUDY_FOG } from "./study-palette";

/**
 * The transitions of the design study: what the light does between one place and the next.
 *
 * Three smoothed values come out of one update, and the engine spends them in the study
 * branch only:
 *
 *  - `exposure`, the mood envelope. It settles a little under one while the camera travels,
 *    lower still while an entrance approaches, and lifts in a short flourish at the moment
 *    an arriving recognition becomes readable. The engine multiplies it into
 *    `renderer.toneMappingExposure`, into a shared uniform the sky and the clouds read, and
 *    into the radiance pass's glow strength. It never reaches the pearl's text, whose face,
 *    finishing and halo are all `toneMapped: false` and carry no exposure uniform.
 *  - `travel`, zero parked and one in flight, which draws the haze in and swells the sun.
 *  - `hush`, which rises over an entrance's approach and releases over about three seconds
 *    once reading begins. It pales the resident pearls and calms every sparkle in the world,
 *    so the frame quietens around the one message that matters and then fills back in.
 *
 * All three freeze at their parked values whenever `moving` is false, which covers a paused
 * tour, reduced motion and the owner's Still setting. A still capture therefore renders with
 * exactly today's exposure, haze and twinkle, and two captures of it are identical.
 *
 * Pure arithmetic, no Three.js and no DOM, so the envelope is provable in Node.
 */

export const STUDY_MOOD = {
  /** Envelope targets. */
  parked: 1,
  traveling: 0.94,
  approach: 0.93,
  /** The reveal to reading flourish: how much, how long it rises, how long it settles. */
  flourish: 0.08,
  flourishRise: 1,
  flourishFall: 3,
  /** One time constant for the envelope and the haze, so they move together. */
  tau: 0.9,
  /** The hush leans in over the approach and lets go a little more slowly. */
  hushTau: 0.9,
  hushReleaseTau: 1,
  /** Where the haze closes to in flight. The parked values stay `STUDY_FOG`. */
  travelFogNear: 18,
  travelFogFar: 215,
  /** How much the sun's halo swells in flight. */
  travelHalo: 0.12,
  /** Resident pearl face opacity, at rest and fully hushed. */
  residentOpacity: 0.9,
  residentHush: 0.12,
} as const;

/**
 * The flourish at the moment an arriving recognition becomes readable: up over a second,
 * then down over three. Negative ages are before the edge and contribute nothing.
 */
export function studyFlourish(age: number) {
  if (!(age >= 0)) return 0;
  return (
    STUDY_MOOD.flourish *
    (age < STUDY_MOOD.flourishRise
      ? smoothstep(age)
      : 1 - smoothstep((age - STUDY_MOOD.flourishRise) / STUDY_MOOD.flourishFall))
  );
}

export type StudyHaze = { near: number; far: number };

/** Where the study's haze closes to in flight, as a haze pair. Module level, so a default allocates nothing. */
const TRAVEL_HAZE: StudyHaze = { near: STUDY_MOOD.travelFogNear, far: STUDY_MOOD.travelFogFar };

/**
 * The haze distances for a given amount of travel, 0 parked to 1 in flight.
 * The caller may hand in the object to write into, so the engine's per frame use allocates
 * nothing; omitting it returns a fresh one, which is what the tests read.
 *
 * `parked` and `flight` default to the study's own `STUDY_FOG` and travel haze, so every caller
 * that names neither gets exactly today's values. The TV page hands `STUDY_TV_FOG` in as both,
 * which keeps its clear air the same parked and in flight.
 */
export function studyHaze(
  travel: number,
  out: StudyHaze = { near: 0, far: 0 },
  parked: StudyHaze = STUDY_FOG,
  flight: StudyHaze = TRAVEL_HAZE,
) {
  const t = Math.max(0, Math.min(1, travel));
  out.near = parked.near + (flight.near - parked.near) * t;
  out.far = parked.far + (flight.far - parked.far) * t;
  return out;
}

export type MoodInput = {
  dt: number;
  moving: boolean;
  traveling: boolean;
  arrivalPhase: string;
};

export class StudyMood {
  exposure = 1;
  travel = 0;
  hush = 0;
  /** Negative while no flourish is running. */
  private flourishAge = -1;
  private previousPhase = "idle";

  update(input: MoodInput) {
    if (!input.moving) {
      this.exposure = STUDY_MOOD.parked;
      this.travel = 0;
      this.hush = 0;
      this.flourishAge = -1;
      this.previousPhase = input.arrivalPhase;
      return this;
    }
    const dt = Math.max(0, input.dt);
    // The edge the flourish belongs to: the frame the entrance's words become readable.
    if (this.previousPhase === "reveal" && input.arrivalPhase === "reading")
      this.flourishAge = 0;
    else if (this.flourishAge >= 0) {
      this.flourishAge += dt;
      if (this.flourishAge > STUDY_MOOD.flourishRise + STUDY_MOOD.flourishFall)
        this.flourishAge = -1;
    }
    this.previousPhase = input.arrivalPhase;
    const base =
      input.arrivalPhase === "approach"
        ? STUDY_MOOD.approach
        : input.traveling
          ? STUDY_MOOD.traveling
          : STUDY_MOOD.parked;
    const target = base + studyFlourish(this.flourishAge);
    const blend = dt > 0 ? 1 - Math.exp(-dt / STUDY_MOOD.tau) : 0;
    this.exposure += (target - this.exposure) * blend;
    this.travel += ((input.traveling ? 1 : 0) - this.travel) * blend;
    const hushTarget =
      input.arrivalPhase === "approach" || input.arrivalPhase === "reveal"
        ? 1
        : 0;
    const hushBlend =
      dt > 0
        ? 1 -
          Math.exp(
            -dt /
              (hushTarget ? STUDY_MOOD.hushTau : STUDY_MOOD.hushReleaseTau),
          )
        : 0;
    this.hush += (hushTarget - this.hush) * hushBlend;
    return this;
  }
}
