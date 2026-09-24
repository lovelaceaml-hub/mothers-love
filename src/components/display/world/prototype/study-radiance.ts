import * as T from "three";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { FullScreenQuad } from "three/addons/postprocessing/Pass.js";
import { STUDY_GLOW_PASS, STUDY_SUN_VIEW } from "./study-materials";
import { STUDY_SUN } from "./study-palette";

/**
 * Radiance for the sample-only design study: a glow layer, screen space god rays and a
 * protect mask that keeps both of them out of every visible pearl disc.
 *
 * The main pass stays exactly as it is today, direct to the canvas with MSAA and
 * NeutralToneMapping. Everything here happens after it, into its own render targets, and
 * arrives back on screen as one additive full screen quad.
 *
 * Layer map (three `Layers` bits):
 *   0  the ordinary world, the only layer the camera sees for the main pass
 *   1  the glow layer
 *   2  the god ray occluders and the rays sun sprite
 *   3  the protect mask, which only the pearl occluder discs join
 *
 * Verified against the installed three 0.180 sources:
 *  - `examples/jsm/postprocessing/UnrealBloomPass.js` L277-365: `render` reads only
 *    `readBuffer.texture`, never `writeBuffer`, and with `renderToScreen` false it ends by
 *    blending its composite into `readBuffer` and leaves that target bound. So the pass is
 *    driven standalone with the glow target passed as both buffers, and the composite is
 *    read from `renderTargetsHorizontal[0]` before the renderer is pointed back at the canvas.
 *  - same file L246-264: `setSize` halves the given size internally, and there are 5 mips,
 *    11 HalfFloat targets and 13 full screen quad draws per call.
 *  - `examples/jsm/shaders/LuminosityHighPassShader.js` calls `luminance()`, which
 *    `src/renderers/webgl/WebGLProgram.js` L155 defines in the fragment prefix, so the pass
 *    compiles in 0.180.
 *  - `src/renderers/WebGLRenderer.js` L1612: `render()` calls `info.reset()` only while
 *    `info.autoReset` is true, so the engine turns that off and this class resets once per
 *    presented frame. L1314 and L1332: lights are layer tested, so the glow camera on layer
 *    1 collects no lights and runs no shadow pass. L1987: `scene.overrideMaterial` replaces
 *    a material only when `material.allowOverride` is true, which is how the rays sun sprite
 *    stays bright inside the black mask pass.
 *  - `src/renderers/webgl/WebGLPrograms.js` L165-171 and L202: anything rendered into a
 *    render target compiles with `NoToneMapping` and a linear output color space, so the
 *    glow target holds linear radiance and the composite quad does the sRGB conversion
 *    itself with `#include <colorspace_fragment>`.
 *  - `src/renderers/webgl/WebGLBackground.js` L29-51: a null `scene.background` clears with
 *    the renderer clear color, which is how the aux targets are cleared to transparent black.
 */

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

const RAY_VERTEX = `varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;

const RAY_FRAGMENT = `uniform sampler2D maskTexture;
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

/** How the TV page's glow pass fogs the glow layer: the design world publishes this on the scene. */
export type StudyGlowFog = { near: number; far: number };

export class StudyRadiance {
  /**
   * Undefined when the context cannot render to a half float target. The study then keeps its single pass.
   * `tv` is the TV page (`?view=tv`), which takes `STUDY_TV_RADIANCE`; without it nothing changes.
   */
  static create(renderer: T.WebGLRenderer, options: { tv?: boolean } = {}) {
    const float = renderer.extensions.has("EXT_color_buffer_float");
    const half = renderer.extensions.has("EXT_color_buffer_half_float");
    if (!float && !half) return undefined;
    return new StudyRadiance(renderer, options.tv === true);
  }

  /** Tuned down from the design's .62 and .5 after the checkpoint captures. See the uniforms below. */
  glowStrength = 0.22;
  rayStrength = 0.12;
  /** The tier's own glow strength, before Section 8's mood envelope scales it. */
  private baseGlowStrength = 0.22;
  /** `.9 + .1 * mood`, so a parked frame is exactly the tier's authored strength. */
  private moodScale = 1;
  private tier: StudyTier = "auto";
  private readonly glowRT: T.WebGLRenderTarget;
  private readonly protectRT: T.WebGLRenderTarget;
  private readonly maskRT: T.WebGLRenderTarget;
  private readonly raysRT: T.WebGLRenderTarget;
  private readonly bloom: UnrealBloomPass;
  private readonly rayMaterials = new Map<number, T.ShaderMaterial>();
  private readonly rayUniforms = {
    maskTexture: { value: null as T.Texture | null },
    sunUv: { value: new T.Vector2(.5, .5) },
    density: { value: .92 },
    decay: { value: .968 },
    // Tuned down from RADIANCE-DESIGN.md's .32 after the checkpoint captures: this is a
    // deliberate correction to the wash, not drift from the design.
    exposure: { value: .20 },
    weight: { value: .045 },
  };
  private readonly compositeUniforms = {
    bloomTexture: { value: null as T.Texture | null },
    raysTexture: { value: null as T.Texture | null },
    protectTexture: { value: null as T.Texture | null },
    // Warm, not white. Linear multipliers, so they are given as numbers rather than hex:
    // three's Color(r, g, b) already treats three numbers as working (linear) space values.
    glowTint: { value: new T.Color(1.0, .88, .84) },
    rayTint: { value: new T.Color(1.0, .87, .74) },
    // Tuned down from RADIANCE-DESIGN.md (.62 glow, .5 rays) after the checkpoint captures
    // showed the pale pastel palette washing to white. A deliberate correction, not drift.
    glowStrength: { value: .22 },
    rayStrength: { value: .12 },
    sunWeight: { value: 0 },
  };
  private readonly compositeMaterial: T.ShaderMaterial;
  private readonly compositeQuad: FullScreenQuad;
  private readonly rayQuad: FullScreenQuad;
  private readonly whiteBasic = new T.MeshBasicMaterial({ color: 0xffffff, fog: false, toneMapped: false });
  private readonly blackBasic = new T.MeshBasicMaterial({ color: 0x000000, fog: false, toneMapped: false });
  private readonly clearColor = new T.Color();
  private readonly sunWorld = new T.Vector3(...STUDY_SUN.direction).multiplyScalar(330);
  private readonly sunNdc = new T.Vector3();
  private readonly toSun = new T.Vector3();
  private readonly forward = new T.Vector3();
  private readonly sunDirection = new T.Vector3(...STUDY_SUN.direction);
  private readonly scratch = new T.Vector3();
  private disposed = false;

  private constructor(private readonly renderer: T.WebGLRenderer, private readonly tv = false) {
    if (tv) {
      this.glowStrength = this.baseGlowStrength = STUDY_TV_RADIANCE.glowStrength;
      this.rayStrength = STUDY_TV_RADIANCE.rayStrength;
    }
    const buffer = renderer.getDrawingBufferSize(new T.Vector2());
    const glow = glowTargetSize(buffer.x, buffer.y);
    const aux = { width: Math.max(1, Math.round(glow.width / 2)), height: Math.max(1, Math.round(glow.height / 2)) };
    this.glowRT = new T.WebGLRenderTarget(glow.width, glow.height, { type: T.HalfFloatType, depthBuffer: true });
    this.glowRT.texture.name = "study glow";
    this.glowRT.texture.generateMipmaps = false;
    this.raysRT = new T.WebGLRenderTarget(aux.width, aux.height, { type: T.HalfFloatType, depthBuffer: false });
    this.raysRT.texture.generateMipmaps = false;
    // Explicitly linear: the mask is a quarter of the glow target's dimensions, and a
    // point sampled disc edge would magnify into the stair stepped cut the checkpoint showed.
    this.protectRT = new T.WebGLRenderTarget(aux.width, aux.height, {
      depthBuffer: false, minFilter: T.LinearFilter, magFilter: T.LinearFilter,
    });
    this.protectRT.texture.generateMipmaps = false;
    this.maskRT = new T.WebGLRenderTarget(aux.width, aux.height, { depthBuffer: true });
    this.maskRT.texture.generateMipmaps = false;
    // Threshold 0: the glow layer already contains only what is meant to glow, so a
    // luminance cut would only throw away the soft tails this pass exists for. The TV page
    // wants exactly those tails gone (`STUDY_TV_RADIANCE`), so it takes a small cut.
    this.bloom = tv
      ? new UnrealBloomPass(new T.Vector2(glow.width, glow.height), STUDY_TV_RADIANCE.bloomStrength, STUDY_TV_RADIANCE.bloomRadius, STUDY_TV_RADIANCE.bloomThreshold)
      : new UnrealBloomPass(new T.Vector2(glow.width, glow.height), .8, .55, 0);
    this.bloom.renderToScreen = false;
    this.bloom.setSize(glow.width, glow.height);
    this.compositeMaterial = new T.ShaderMaterial({
      uniforms: this.compositeUniforms,
      vertexShader: RAY_VERTEX,
      fragmentShader: studyCompositeFragment(tv),
      // Screen blending, not additive: out = dst + src * (1 - dst), so however bright the
      // glow is it can never push a pixel past white. On a palette that already sits near
      // .9 this is the difference between radiance and a flat wash.
      blending: T.CustomBlending,
      blendEquation: T.AddEquation,
      blendSrc: T.OneMinusDstColorFactor,
      blendDst: T.OneFactor,
      blendEquationAlpha: T.AddEquation,
      blendSrcAlpha: T.OneFactor,
      blendDstAlpha: T.ZeroFactor,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
      fog: false,
    });
    // The TV page's knee is its own program, under its own key; the study's key is unchanged.
    this.compositeMaterial.customProgramCacheKey = tv ? () => "study-radiance-composite-v2-tv" : () => "study-radiance-composite-v2";
    this.compositeUniforms.bloomTexture.value = bloomTexture(this.bloom);
    this.compositeUniforms.raysTexture.value = this.raysRT.texture;
    this.compositeUniforms.protectTexture.value = this.protectRT.texture;
    this.rayUniforms.maskTexture.value = this.maskRT.texture;
    this.compositeQuad = new FullScreenQuad(this.compositeMaterial);
    this.rayQuad = new FullScreenQuad(this.rayMaterial(48));
  }

  private rayMaterial(samples: number) {
    const existing = this.rayMaterials.get(samples);
    if (existing) return existing;
    const material = new T.ShaderMaterial({
      uniforms: this.rayUniforms,
      defines: { SAMPLES: samples },
      vertexShader: RAY_VERTEX,
      fragmentShader: RAY_FRAGMENT,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
      fog: false,
    });
    material.customProgramCacheKey = () => `study-radiance-rays-v1-${samples}`;
    this.rayMaterials.set(samples, material);
    return material;
  }

  setTier(tier: StudyTier) {
    this.tier = tier;
    if (tier === "low") return;
    this.rayQuad.material = this.rayMaterial(tier === "high" ? 48 : 32);
    // Corrected from the design's .62 High and .45 Auto after the checkpoint captures. The TV
    // page takes its own strength on every tier, here because the engine re-runs this on resize.
    this.baseGlowStrength = this.tv ? STUDY_TV_RADIANCE.glowStrength : tier === "high" ? .22 : .16;
    this.glowStrength = this.baseGlowStrength * this.moodScale;
  }

  /**
   * Section 8: the mood envelope, 1 parked and a little under one in flight.
   *
   * The glow only follows a tenth of it, because the bloom is already the most forgiving
   * part of the frame and taking the whole dip out of it reads as the light being switched
   * down rather than as air. Applied to the tier's own strength, never compounded, so a
   * hundred frames at the same envelope value give the same glow as one.
   */
  setMood(value: number) {
    this.moodScale = .9 + .1 * value;
    if (this.tier !== "low") this.glowStrength = this.baseGlowStrength * this.moodScale;
  }

  resize(width: number, height: number) {
    const glow = glowTargetSize(width, height);
    const aux = { width: Math.max(1, Math.round(glow.width / 2)), height: Math.max(1, Math.round(glow.height / 2)) };
    this.glowRT.setSize(glow.width, glow.height);
    this.raysRT.setSize(aux.width, aux.height);
    this.protectRT.setSize(aux.width, aux.height);
    this.maskRT.setSize(aux.width, aux.height);
    this.bloom.setSize(glow.width, glow.height);
    // setSize allocates new textures on the bloom's own targets, so the composite has to
    // re-read the one it samples or it would keep the disposed texture from before.
    this.compositeUniforms.bloomTexture.value = bloomTexture(this.bloom);
  }

  /**
   * One presented frame: the main image, then the aux passes, then one additive composite.
   * Every renderer setting this touches is restored before it returns.
   */
  render(scene: T.Scene, camera: T.PerspectiveCamera) {
    const renderer = this.renderer;
    renderer.info.reset();
    // The sun in view space, for the study materials that light their rim from it.
    STUDY_SUN_VIEW.value.copy(this.sunDirection).transformDirection(camera.matrixWorldInverse);
    renderer.setRenderTarget(null);
    renderer.render(scene, camera);
    if (this.tier === "low" || this.disposed) return;

    this.toSun.copy(this.sunWorld).sub(camera.position);
    camera.getWorldDirection(this.forward);
    const facing = this.forward.dot(this.scratch.copy(this.toSun).normalize());
    this.sunNdc.copy(this.sunWorld).project(camera);
    const weight = sunScreenWeight(this.sunNdc, facing);

    const background = scene.background;
    const fog = scene.fog instanceof T.Fog ? scene.fog : null;
    const fogColor = fog ? fog.color.getHex() : 0;
    renderer.getClearColor(this.clearColor);
    const clearAlpha = renderer.getClearAlpha();
    const autoClear = renderer.autoClear;

    scene.background = null;
    if (fog) fog.color.setHex(0x000000);
    STUDY_GLOW_PASS.value = 1;
    renderer.setClearColor(0x000000, 0);

    // The TV page draws the glow layer through the study's own fog distances, which the design
    // world publishes on the scene, and puts the thinner main fog back straight after, so the
    // protect and ray masks and the next main pass all see the scene's own fog.
    const glowFog = this.tv && fog ? (scene.userData.studyGlowFog as StudyGlowFog | undefined) : undefined;
    const fogNear = fog ? fog.near : 0, fogFar = fog ? fog.far : 0;
    if (fog && glowFog) { fog.near = glowFog.near; fog.far = glowFog.far; }
    camera.layers.set(1);
    renderer.setRenderTarget(this.glowRT);
    renderer.render(scene, camera);
    if (fog && glowFog) { fog.near = fogNear; fog.far = fogFar; }

    camera.layers.set(3);
    scene.overrideMaterial = this.whiteBasic;
    renderer.setRenderTarget(this.protectRT);
    renderer.render(scene, camera);

    if (weight > 0) {
      camera.layers.set(2);
      scene.overrideMaterial = this.blackBasic;
      renderer.setRenderTarget(this.maskRT);
      renderer.render(scene, camera);
    }

    scene.overrideMaterial = null;
    camera.layers.set(0);
    scene.background = background;
    if (fog) fog.color.setHex(fogColor);
    STUDY_GLOW_PASS.value = 0;

    this.bloom.render(renderer, this.glowRT, this.glowRT, 0, false);

    renderer.autoClear = false;
    if (weight > 0) {
      this.rayUniforms.sunUv.value.set(this.sunNdc.x * .5 + .5, this.sunNdc.y * .5 + .5);
      renderer.setRenderTarget(this.raysRT);
      this.rayQuad.render(renderer);
    }
    this.compositeUniforms.sunWeight.value = weight;
    this.compositeUniforms.glowStrength.value = this.glowStrength;
    this.compositeUniforms.rayStrength.value = this.rayStrength;
    renderer.setRenderTarget(null);
    this.compositeQuad.render(renderer);

    renderer.autoClear = autoClear;
    renderer.setClearColor(this.clearColor, clearAlpha);
  }

  dispose() {
    this.disposed = true;
    this.bloom.dispose();
    this.glowRT.dispose();
    this.protectRT.dispose();
    this.maskRT.dispose();
    this.raysRT.dispose();
    this.compositeMaterial.dispose();
    this.rayMaterials.forEach(material => material.dispose());
    this.rayMaterials.clear();
    this.whiteBasic.dispose();
    this.blackBasic.dispose();
    // Every FullScreenQuad shares one module level geometry in three 0.180, so the two
    // quads here and the bloom's own quad all release the same buffers. Disposing it is
    // safe and idempotent: a later use simply re-uploads the three vertices.
    this.compositeQuad.dispose();
    this.rayQuad.dispose();
  }
}
