import * as T from "three";
import { ARRIVAL_VIEW } from "../world-data";
import { TV_FOV } from "./tv-bubbles";
import { TV_READ, TV_SCREEN } from "./tv-places";

/*
 * The arriving bubble on the TV page (Section 5). It is read where every arrival is read, risen
 * out of the arrival stage in front of its portal, at the main bubbles' size on screen. Once
 * read, it floats up and away into the world, dwindling as it goes, the way the TV page's
 * bubbles leave (`tv-flow.ts`). Before, it slid down to the Garden at full size, behind its
 * trees and under the ticker (the tour soak, 2026-09-24). Pure, so it is provable in Node.
 */

/** Where the arriving bubble is read: risen out of the arrival stage (`world-recognitions.ts`). */
export const TV_ARRIVAL_AT = new T.Vector3(4.138, 12, 19.104);

const eye = new T.Vector3(...ARRIVAL_VIEW.eye);
/** Away from the arrival camera, level. */
const back = TV_ARRIVAL_AT.clone().sub(eye).setY(0).normalize();

/**
 * Its radius: `TV_READ.diameter` across on a 1080 line screen, as the main bubbles read, from
 * the fixed arrival camera (`ARRIVAL_VIEW`), where the camera waits from reveal to settle.
 */
export const TV_ARRIVAL_RADIUS = (() => {
  const forward = new T.Vector3(...ARRIVAL_VIEW.target).sub(eye).normalize();
  const depth = TV_ARRIVAL_AT.clone().sub(eye).dot(forward);
  return (TV_READ.diameter / TV_SCREEN.height) * depth * Math.tan(T.MathUtils.degToRad(TV_FOV) / 2);
})();

/** Its way out over the arrival's settle: this far up and back from the camera, world units. */
export const TV_ARRIVAL_EXIT = { up: 4, back: 8 } as const;

/**
 * The arriving bubble `settle` of the way (0 to 1) through its settle: its centre, written to
 * `out`, and the share of its full radius it keeps, down to almost nothing as the settle ends.
 */
export function tvArrivalExit(settle: number, out: T.Vector3) {
  const p = Math.min(1, Math.max(0, settle));
  // Eased in only, so it drifts off gently and keeps going, like a leaving flowing bubble.
  const u = p * p * (2 - p) * 0.5 + p * 0.5;
  out.copy(TV_ARRIVAL_AT).addScaledVector(back, TV_ARRIVAL_EXIT.back * u);
  out.y += TV_ARRIVAL_EXIT.up * u;
  return 1 - 0.98 * p * p * (3 - 2 * p);
}
