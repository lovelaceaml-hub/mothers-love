/**
 * The golden hour palette for the sample-only visual study.
 * Plain constants, no DOM and no Three.js objects, so the sky, the fog, the
 * lighting, the halo and the tests all read one source of truth.
 */

/**
 * Apricot horizon, lavender rose mid sky, sky blue lavender zenith. Plan 26 visual review
 * (2026-09-23) found the frames a near monochrome peach haze where the board has lavender and
 * sky blue above, so the zenith and mid sky were cooled a step (D2: #c9c6ec, #efcfdc, #fbe0cc).
 */
export const STUDY_SKY = { zenith: "#a9bdf2", mid: "#d8ccf0", horizon: "#f8ded6" };

/**
 * Warm haze. The color matches the sky horizon so the sea meets the sky without a seam
 * (D2: #f8dfd0, a shade warmer, with the D2 horizon).
 */
export const STUDY_FOG = { color: "#f8ded6", near: 22, far: 250 };

function unit(x: number, y: number, z: number): [number, number, number] {
  const length = Math.sqrt(x * x + y * y + z * z);
  return [x / length, y / length, z / length];
}

/**
 * A low sun a little behind the world, so the focal pearl carries a glow behind it.
 * `direction` (about 12 degrees up) drives the visible glow, halo and environment.
 * `lightPosition` (about 26 degrees up) drives the shadow light on purpose, so shadows
 * stay readable instead of stretching across every terrace at the glow angle.
 */
export const STUDY_SUN = {
  direction: unit(-.38, .22, -.92),
  lightPosition: [-40, 52, -100] as [number, number, number],
  color: "#ffd8a6",
  glow: "#ffe7c8",
};

/** Study tone response. The classic and cinematic paths keep their own values. */
export const STUDY_TONE = { exposure: 1, environmentIntensity: .9, shadowIntensity: .6 };
