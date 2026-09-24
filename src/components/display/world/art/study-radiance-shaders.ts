/** The radiance tier rule, target sizes and shader text, pure so they are provable without WebGL (StudyRadiance in study-radiance.ts runs them). */
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

export type StudyTier = "high" | "auto" | "low";

/**
 * The one place the study's picture quality tier is decided.
 *
 * High is the explicit choice and never drops. Auto starts at the middle tier and becomes
 * Low once the engine's existing three window under 25 fps rule flips `lowered`; that rule
 * stays the only trigger. Low is Low however it was reached, so a lowered Auto and an
 * explicit Low resolve to exactly the same work.
 *
 * Pure, so the whole ladder is provable without a WebGL context.
 */
export function resolveStudyTier(quality: string, lowered: boolean): StudyTier {
  if (quality === "low" || (quality === "auto" && lowered)) return "low";
  return quality === "high" ? "high" : "auto";
}

/**
 * Half of the drawing buffer, capped at 1920 wide and kept on the buffer's aspect.
 * Pure, so the sizing ladder is provable without a WebGL context.
 */
export function glowTargetSize(width: number, height: number) {
  const w = Math.max(1, Math.min(1920, Math.round(Math.max(1, width) / 2)));
  const h = Math.max(1, Math.round((w * Math.max(1, height)) / Math.max(1, width)));
  return { width: w, height: h };
}

/**
 * How much of the god rays this frame earns.
 *
 * `facing` is the camera forward direction dotted with the direction from the camera to the
 * sun: at or below zero the sun is behind the viewer and the rays are skipped outright.
 * Otherwise the weight falls off as the sun leaves the frame, so the shafts fade instead of
 * snapping off at the screen edge.
 */
export function sunScreenWeight(ndc: { x: number; y: number }, facing: number) {
  if (!(facing > 0)) return 0;
  const offset = Math.max(Math.abs(ndc.x), Math.abs(ndc.y));
  const t = Math.max(0, Math.min(1, (offset - 1) / 0.35));
  return 1 - t * t * (3 - 2 * t);
}

/** The single texture `UnrealBloomPass` leaves its five mip composite in. */
export function bloomTexture(pass: UnrealBloomPass) {
  return pass.renderTargetsHorizontal[0].texture;
}

export const RAY_VERTEX = `varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;

export const RAY_FRAGMENT = `uniform sampler2D maskTexture;
uniform vec2 sunUv;
uniform float density, decay, weight, exposure;
varying vec2 vUv;
void main(){
  vec2 uv = vUv;
  vec2 walk = (uv - sunUv) * (density / float(SAMPLES));
  float illumination = 1.;
  vec3 sum = vec3(0.);
  for (int i = 0; i < SAMPLES; i++) {
    uv -= walk;
    // Sampling past the edge would smear the clamped border pixel down the whole shaft.
    vec2 inside = step(vec2(0.), uv) * step(uv, vec2(1.));
    sum += texture2D(maskTexture, uv).rgb * illumination * weight * inside.x * inside.y;
    illumination *= decay;
  }
  gl_FragColor = vec4(sum * exposure, 1.);
}`;

const COMPOSITE_FRAGMENT = `uniform sampler2D bloomTexture, raysTexture, protectTexture;
uniform vec3 glowTint, rayTint;
uniform float glowStrength, rayStrength, sunWeight;
varying vec2 vUv;
void main(){
  vec3 glow = texture2D(bloomTexture, vUv).rgb * glowTint * glowStrength;
  vec3 rays = texture2D(raysTexture, vUv).rgb * rayTint * rayStrength * sunWeight;
  // The protect mask is white over every pearl disc being read. Nothing this pass produces
  // is allowed to touch those pixels, so the text stays exactly as the main pass drew it.
  // The mask is a quarter of the glow target's dimensions, so the sampled edge is a short
  // bilinear ramp; the smoothstep turns that ramp into a soft join instead of a cut line.
  float protect = smoothstep(.15, .85, clamp(texture2D(protectTexture, vUv).r, 0., 1.));
  gl_FragColor = vec4(clamp((glow + rays) * (1. - protect), 0., 1.), 1.);
  #include <colorspace_fragment>
}`;

/** The composite's last line, which the TV page's knee replaces. */
const COMPOSITE_OUT = "gl_FragColor = vec4(clamp((glow + rays) * (1. - protect), 0., 1.), 1.);";

/**
 * The TV page's radiance (clear air). The study's bloom is wide and soft on purpose, and on the
 * TV page's clearer picture that same spread read as a milky veil over everything: every lantern,
 * rail and crest smeared into the air round it. So on the TV the bloom is tighter (radius .55 to
 * .2), a little weaker (.8 to .6) and ignores the faintest glow (threshold 0 to .05); the glow
 * reaches the screen at .10 on every tier (the study's .22 High and .16 Auto); the god rays at
 * .05 (from .12); and the composite adds a soft knee, `knee`, below which the faint tail of the
 * bloom fades out instead of tinting the whole frame. The glow layer is also drawn with the
 * study's old fog distances (`STUDY_FOG`, 22 to 250), handed in by the design world, so the far
 * glow does not bloom more now that the main fog is thinner.
 */
export const STUDY_TV_RADIANCE = {
  bloomStrength: .6,
  bloomRadius: .2,
  bloomThreshold: .05,
  glowStrength: .10,
  rayStrength: .05,
  knee: [.006, .03] as const,
};

/**
 * The composite fragment. Without the TV page it is `COMPOSITE_FRAGMENT` itself, character for
 * character, so the study's program is untouched. On the TV page its last line gains the knee:
 * a pixel whose brightest channel is under .006 gets nothing, and the glow fades in up to .03.
 */
export function studyCompositeFragment(tv = false) {
  if (!tv) return COMPOSITE_FRAGMENT;
  const [low, high] = STUDY_TV_RADIANCE.knee;
  return COMPOSITE_FRAGMENT.replace(COMPOSITE_OUT, `vec3 lit = glow + rays;
  float peak = max(lit.r, max(lit.g, lit.b));
  lit *= smoothstep(${low}, ${high}, peak);
  gl_FragColor = vec4(clamp(lit * (1. - protect), 0., 1.), 1.);`);
}
