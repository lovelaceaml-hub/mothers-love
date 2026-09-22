/**
 * The golden hour palette for the sample-only visual study.
 * Plain constants, no DOM and no Three.js objects, so the sky, the fog, the
 * lighting, the halo and the tests all read one source of truth.
 */

/** Apricot horizon, rose mid sky, lavender zenith. */
export const STUDY_SKY = { zenith: "#c9c6ec", mid: "#efcfdc", horizon: "#fbe0cc" };

/** Warm haze. The color matches the sky horizon so the sea meets the sky without a seam. */
export const STUDY_FOG = { color: "#f8dfd0", near: 22, far: 250 };

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
