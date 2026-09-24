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

/**
 * The TV page's clear air (Anthony, 2026-09-24: "Can you remove the haze foggy look"; his
 * choice: crisp, rich colours up close, only the farthest islands fading a little). The same
 * colour as `STUDY_FOG`, so the sea still meets the sky without a seam. Three's linear fog is a
 * smoothstep from `near` to `far`, so nothing inside 60 units (every bubble the camera reads,
 * the island it stands at) is hazed at all, a piece 150 units off takes about 12%, and a far
 * landmark island 200 to 300 units off keeps between three quarters and two fifths of its
 * colour. It does not close in during a flight either: the engine hands it to `studyHaze` as
 * both the parked and the flight distances. Only with `?view=tv`; the study keeps `STUDY_FOG`.
 */
export const STUDY_TV_FOG = { color: STUDY_FOG.color, near: 60, far: 480 };

/**
 * The sky dome and the sea as the design world builds them: a sphere round the origin, and a
 * flat disc at sea level a little north of it. Named so the TV page's seam rule is proved
 * against the same numbers the world is built from.
 */
export const STUDY_SKY_RADIUS = 400;
export const STUDY_SEA = { radius: 320, center: [0, -5, -30] as [number, number, number] };

/**
 * TV page: in the thinner fog the sea disc's rim would show against the sky, so the disc grows
 * to 800 (2.5 times) and the camera's far plane moves out from 450 to 600. The rule the tests
 * hold: from every pose the tour uses, on a landscape and a portrait screen, every point of the
 * sea's rim inside the view is at least the fog's far end (480) deep, so the sea is fully
 * fogged before it ends: where it is drawn at all it is already the horizon colour, the same
 * colour as the sky dome behind it. The fog is also complete before the far plane (600), so
 * the sea is never clipped half fogged; and the whole sky dome (400 round the origin, the
 * camera never more than about 125 from it) stays inside the far plane.
 */
export const STUDY_TV_CAMERA_FAR = 600;
export const STUDY_TV_SEA_SCALE = 2.5;

/**
 * TV page light balance: the flat milky light becomes a clearer day. Less of the soft sky and
 * environment fill, a little more sun and a firmer shadow, so forms read by their light and
 * shade instead of a uniform glow. Every colour and the exposure stay as they are.
 */
export const STUDY_TV_TONE = { environmentIntensity: .7, hemisphere: .35, sun: 2.5, shadowIntensity: .75, fill: .85 };
